import { Worker, Job } from 'bullmq';
import { bullConnection } from '../infra/redis';
import { MockDexRouter } from '../dex/mockDexRouter';
import { emitStatusUpdate } from '../ws/orderEvents';
import { getOrderById, updateOrderStatus } from '../infra/postgres';

const router = new MockDexRouter(1);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function startOrderWorker() {
  const worker = new Worker(
    'orders',
    async (job: Job) => {
      const { orderId } = job.data;

      try {
        // Load order from database
        const order = await getOrderById(orderId);
        if (!order) {
          throw new Error(`Order ${orderId} not found`);
        }

        // Emit initial pending status
        await emitStatusUpdate({
          orderId,
          status: 'pending',
        });

        // Routing: Get best quote from DEXes
        await emitStatusUpdate({
          orderId,
          status: 'routing',
        });

        const { best, all } = await router.getBestQuote(
          order.tokenIn,
          order.tokenOut,
          order.amountIn
        );

        await updateOrderStatus(orderId, 'routing', {
          chosenDex: best.dex,
        });

        await emitStatusUpdate({
          orderId,
          status: 'routing',
          data: {
            chosenDex: best.dex,
            price: best.price,
            fee: best.fee,
            allQuotes: all,
          },
        });

        // Building: Prepare transaction
        await emitStatusUpdate({
          orderId,
          status: 'building',
        });

        await sleep(300);

        await updateOrderStatus(orderId, 'building');

        await emitStatusUpdate({
          orderId,
          status: 'building',
        });

        // Submitted: Execute swap
        await emitStatusUpdate({
          orderId,
          status: 'submitted',
        });

        await updateOrderStatus(orderId, 'submitted');

        const { txHash, executedPrice } = await router.executeSwap(
          best.dex,
          order
        );

        // Confirmed: Transaction confirmed
        await updateOrderStatus(orderId, 'confirmed', {
          txHash,
          executedPrice,
        });

        await emitStatusUpdate({
          orderId,
          status: 'confirmed',
          data: {
            txHash,
            executedPrice,
            chosenDex: best.dex,
          },
        });

        return { success: true, txHash, executedPrice };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Update database with failure
        await updateOrderStatus(orderId, 'failed', {
          failureReason: errorMessage,
        });

        await emitStatusUpdate({
          orderId,
          status: 'failed',
          data: {
            error: errorMessage,
          },
        });

        // Re-throw to allow BullMQ to retry
        throw error;
      }
    },
    {
      ...bullConnection,
      concurrency: 10,
    }
  );

  return worker;
}
