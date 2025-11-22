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
    "orders",
    async (job: Job) => {
      const { orderId } = job.data;

      console.log(`[WORKER] Picked job for order: ${orderId}`);

      try {
        // Load order from DB
        const order = await getOrderById(orderId);
        if (!order) {
          console.error(`[WORKER] ERROR: Order ${orderId} not found`);
          throw new Error(`Order ${orderId} not found`);
        }

        console.log(`[WORKER] Loaded order from DB: ${orderId}`);

        // Emit PENDING
        console.log(`[WS] emit: pending for ${orderId}`);
        await emitStatusUpdate({ orderId, status: "pending" });

        // ROUTING
        console.log(`[WS] emit: routing for ${orderId}`);
        await emitStatusUpdate({ orderId, status: "routing" });

        const { best, all } = await router.getBestQuote(
          order.tokenIn,
          order.tokenOut,
          order.amountIn
        );

        console.log(`[ROUTER] Quotes for order ${orderId}: ${JSON.stringify(all)}`);
        console.log(`[ROUTER] Best DEX: ${best.dex} | price: ${best.price}`);

        await updateOrderStatus(orderId, "routing", { chosenDex: best.dex });

        await emitStatusUpdate({
          orderId,
          status: "routing",
          data: {
            chosenDex: best.dex,
            price: best.price,
            fee: best.fee,
            allQuotes: all,
          },
        });

        // BUILDING
        console.log(`[WS] emit: building for ${orderId}`);
        await emitStatusUpdate({ orderId, status: "building" });

        await sleep(300);

        await updateOrderStatus(orderId, "building");

        console.log(`[WORKER] Order ${orderId} transaction building done`);

        await emitStatusUpdate({ orderId, status: "building" });

        // SUBMITTED
        console.log(`[WS] emit: submitted for ${orderId}`);
        await emitStatusUpdate({ orderId, status: "submitted" });
        await updateOrderStatus(orderId, "submitted");

        console.log(`[SWAP] Executing swap on ${best.dex} for ${orderId}`);
        const { txHash, executedPrice } = await router.executeSwap(best.dex, order);

        console.log(
          `[SWAP] Swap executed | order: ${orderId} | dex: ${best.dex} | txHash: ${txHash} | price: ${executedPrice}`
        );

        // CONFIRMED
        await updateOrderStatus(orderId, "confirmed", {
          txHash,
          executedPrice,
        });

        console.log(`[WS] emit: confirmed for ${orderId}`);

        await emitStatusUpdate({
          orderId,
          status: "confirmed",
          data: {
            txHash,
            executedPrice,
            chosenDex: best.dex,
          },
        });

        console.log(`[WORKER] Order ${orderId} completed successfully`);
        return { success: true, txHash, executedPrice };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        console.error(
          `[WORKER] Order FAILED: ${orderId} | reason: ${errorMessage}`
        );

        await updateOrderStatus(orderId, "failed", {
          failureReason: errorMessage,
        });

        console.log(`[WS] emit: failed for ${orderId}`);
        await emitStatusUpdate({
          orderId,
          status: "failed",
          data: { error: errorMessage },
        });

        throw error; // let BullMQ retry
      }
    },
    {
      ...bullConnection,
      concurrency: 10,
    }
  );

  console.log("[WORKER] OrderWorker started with concurrency 10");

  return worker;
}
