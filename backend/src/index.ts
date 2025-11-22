import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import { Worker } from 'bullmq';
import { config } from './config/env';
import { buildApp } from './server';
import { initPostgres, getOrderById, pgPool } from './infra/postgres';
import { initMongo, mongoose } from './infra/mongo';
import { redis } from './infra/redis';
import { ordersQueue } from './queue/orderQueue';
import { startOrderWorker } from './workers/orderWorker';
import { orderEvents, OrderStatusUpdate } from './ws/orderEvents';

async function startServer() {
  let server: http.Server | null = null;
  let wss: WebSocketServer | null = null;
  let worker: Worker | null = null;

  try {
    // Initialize infrastructure
    console.log('Initializing PostgreSQL...');
    await initPostgres();

    console.log('Initializing MongoDB...');
    await initMongo();

    // Start order worker
    console.log('Starting order worker...');
    worker = startOrderWorker();
    console.log('Order worker started');

    // Build Express app
    const app = buildApp();

    // Create HTTP server
    server = http.createServer(app);

    // Create WebSocket server
    wss = new WebSocketServer({ server, path: '/api/orders/execute' });

    wss.on('connection', async (ws: WebSocket, req: http.IncomingMessage) => {
      const { query } = parse(req.url || '', true);
      const orderId = Array.isArray(query.orderId) ? query.orderId[0] : query.orderId;

      if (!orderId) {
        ws.close(1008, 'orderId required');
        return;
      }

      console.log(`WebSocket connected for order: ${orderId}`);

      // Send current order status if available
      try {
        const order = await getOrderById(orderId);
        if (order) {
          ws.send(
            JSON.stringify({
              orderId: order.id,
              status: order.status,
              data: {
                tokenIn: order.tokenIn,
                tokenOut: order.tokenOut,
                amountIn: order.amountIn,
                chosenDex: order.chosenDex,
                executedPrice: order.executedPrice,
                txHash: order.txHash,
                failureReason: order.failureReason,
              },
            })
          );
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      }

      // Listen for status updates
      const statusListener = (update: OrderStatusUpdate) => {
        if (update.orderId === orderId && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(update));
        }
      };

      orderEvents.on('status', statusListener);

      // Clean up on disconnect
      ws.on('close', () => {
        console.log(`WebSocket disconnected for order: ${orderId}`);
        orderEvents.off('status', statusListener);
      });

      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        orderEvents.off('status', statusListener);
      });
    });

    // Start listening
    server.listen(config.port, () => {
      console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received, starting graceful shutdown...`);

      try {
        // Close HTTP server
        if (server) {
          await new Promise<void>((resolve) => {
            server!.close(() => {
              console.log('HTTP server closed');
              resolve();
            });
          });
        }

        // Close WebSocket server
        if (wss) {
          wss.close(() => {
            console.log('WebSocket server closed');
          });
        }

        // Close BullMQ worker
        if (worker) {
          await worker.close();
          console.log('BullMQ worker closed');
        }

        // Close BullMQ queue
        await ordersQueue.close();
        console.log('BullMQ queue closed');

        // Close PostgreSQL pool
        await pgPool.end();
        console.log('PostgreSQL pool closed');

        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');

        // Close Redis connection
        redis.disconnect();
        console.log('Redis connection closed');

        console.log('Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
