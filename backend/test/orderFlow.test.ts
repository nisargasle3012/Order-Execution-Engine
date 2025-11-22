import http from 'http';
import request from 'supertest';
import WebSocket from 'ws';
import { buildApp } from '../src/server';
import { initPostgres, pgPool } from '../src/infra/postgres';
import { initMongo, mongoose } from '../src/infra/mongo';
import { redis } from '../src/infra/redis';
import { ordersQueue } from '../src/queue/orderQueue';
import { startOrderWorker } from '../src/workers/orderWorker';
import { Worker } from 'bullmq';

describe('Order Flow Integration Tests', () => {
  let server: http.Server;
  let worker: Worker;
  let port: number;
  let baseUrl: string;

  beforeAll(async () => {
    // Initialize infrastructure
    await initPostgres();
    await initMongo();

    // Start worker
    worker = startOrderWorker();

    // Build app and start server
    const app = buildApp();
    server = http.createServer(app);

    // Listen on random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          port = address.port;
          baseUrl = `http://localhost:${port}`;
        }
        resolve();
      });
    });
  }, 30000);

  afterAll(async () => {
    // Clean up
    await worker.close();
    await ordersQueue.close();
    await pgPool.end();
    await mongoose.connection.close();
    redis.disconnect();

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }, 30000);

  describe('Single Order Flow', () => {
    it('should process order through all statuses in correct sequence', async (done) => {
      // Submit order
      const response = await request(baseUrl)
        .post('/api/orders/execute')
        .send({
          side: 'buy',
          tokenIn: 'SOL',
          tokenOut: 'USDC',
          amountIn: 100,
          maxSlippageBps: 50,
        })
        .expect(202);

      const { orderId } = response.body;
      expect(orderId).toBeDefined();

      // Connect WebSocket
      const ws = new WebSocket(`ws://localhost:${port}/api/orders/execute?orderId=${orderId}`);
      const statuses: string[] = [];
      let timeout: NodeJS.Timeout;

      ws.on('open', () => {
        console.log('WebSocket connected');

        // Set timeout to close after 15 seconds
        timeout = setTimeout(() => {
          ws.close();
        }, 15000);
      });

      ws.on('message', (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message);

        if (message.status) {
          statuses.push(message.status);

          // Check if we reached confirmed or failed
          if (message.status === 'confirmed' || message.status === 'failed') {
            clearTimeout(timeout);
            ws.close();
          }
        }
      });

      ws.on('close', () => {
        console.log('WebSocket closed, statuses:', statuses);

        try {
          // Assert status sequence
          expect(statuses.length).toBeGreaterThan(0);

          // Check that statuses appear in order (they may repeat)
          const uniqueStatuses = [...new Set(statuses)];
          console.log('Unique statuses:', uniqueStatuses);

          // Should contain these statuses
          expect(statuses).toContain('pending');
          expect(statuses).toContain('routing');
          expect(statuses).toContain('building');
          expect(statuses).toContain('submitted');
          expect(statuses).toContain('confirmed');

          // Verify order of statuses
          const pendingIndex = statuses.indexOf('pending');
          const routingIndex = statuses.indexOf('routing');
          const buildingIndex = statuses.indexOf('building');
          const submittedIndex = statuses.indexOf('submitted');
          const confirmedIndex = statuses.indexOf('confirmed');

          expect(pendingIndex).toBeGreaterThanOrEqual(0);
          expect(routingIndex).toBeGreaterThan(pendingIndex);
          expect(buildingIndex).toBeGreaterThan(routingIndex);
          expect(submittedIndex).toBeGreaterThan(buildingIndex);
          expect(confirmedIndex).toBeGreaterThan(submittedIndex);

          done();
        } catch (error) {
          done(error);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        done(error);
      });
    }, 20000);
  });

  describe('Parallel Orders', () => {
    it('should process multiple orders concurrently', async () => {
      const startTime = Date.now();
      const orderCount = 5;

      // Submit multiple orders in parallel
      const orderPromises = Array.from({ length: orderCount }, (_, i) =>
        request(baseUrl)
          .post('/api/orders/execute')
          .send({
            side: i % 2 === 0 ? 'buy' : 'sell',
            tokenIn: 'SOL',
            tokenOut: 'USDC',
            amountIn: 100 + i * 10,
            maxSlippageBps: 50,
          })
          .expect(202)
      );

      const responses = await Promise.all(orderPromises);
      const orderIds = responses.map(res => res.body.orderId);

      expect(orderIds).toHaveLength(orderCount);
      expect(new Set(orderIds).size).toBe(orderCount); // All unique

      // Track completion of each order via WebSocket
      const completionPromises = orderIds.map(
        (orderId) =>
          new Promise<{ orderId: string; finalStatus: string; duration: number }>((resolve, reject) => {
            const ws = new WebSocket(`ws://localhost:${port}/api/orders/execute?orderId=${orderId}`);
            const orderStartTime = Date.now();
            let finalStatus = '';

            const timeout = setTimeout(() => {
              ws.close();
              reject(new Error(`Order ${orderId} timed out`));
            }, 20000);

            ws.on('message', (data: WebSocket.Data) => {
              const message = JSON.parse(data.toString());

              if (message.status === 'confirmed' || message.status === 'failed') {
                finalStatus = message.status;
                clearTimeout(timeout);
                ws.close();
              }
            });

            ws.on('close', () => {
              const duration = Date.now() - orderStartTime;
              resolve({ orderId, finalStatus, duration });
            });

            ws.on('error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          })
      );

      const results = await Promise.all(completionPromises);
      const totalDuration = Date.now() - startTime;

      console.log('Parallel order results:', results);
      console.log(`Total duration: ${totalDuration}ms`);

      // Assert all orders completed
      expect(results).toHaveLength(orderCount);
      results.forEach((result) => {
        expect(['confirmed', 'failed']).toContain(result.finalStatus);
      });

      // Assert concurrency: total time should be less than sequential execution
      // Sequential would be ~15s (3s per order * 5), concurrent should be ~3-5s
      expect(totalDuration).toBeLessThan(15000); // Should be much faster than sequential

      // Most orders should complete around the same time (within 5s of each other)
      const durations = results.map(r => r.duration);
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      console.log(`Duration range: ${minDuration}ms - ${maxDuration}ms`);

      // Verify orders processed concurrently (not sequentially)
      expect(maxDuration - minDuration).toBeLessThan(5000);
    }, 30000);
  });

  describe('Order Status Tracking', () => {
    it('should provide current status on WebSocket connection', async (done) => {
      // Submit order
      const response = await request(baseUrl)
        .post('/api/orders/execute')
        .send({
          side: 'buy',
          tokenIn: 'SOL',
          tokenOut: 'USDC',
          amountIn: 50,
          maxSlippageBps: 100,
        })
        .expect(202);

      const { orderId } = response.body;

      // Wait a moment for order to start processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Connect WebSocket and expect to receive current status immediately
      const ws = new WebSocket(`ws://localhost:${port}/api/orders/execute?orderId=${orderId}`);
      let receivedInitialStatus = false;

      const timeout = setTimeout(() => {
        ws.close();
        if (!receivedInitialStatus) {
          done(new Error('Did not receive initial status'));
        }
      }, 15000);

      ws.on('message', (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());

        if (!receivedInitialStatus) {
          receivedInitialStatus = true;
          expect(message.orderId).toBe(orderId);
          expect(message.status).toBeDefined();
          console.log('Initial status received:', message.status);
        }

        if (message.status === 'confirmed' || message.status === 'failed') {
          clearTimeout(timeout);
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        done(error);
      });
    }, 20000);
  });

  describe('Health Check', () => {
    it('should respond to health check endpoint', async () => {
      const response = await request(baseUrl)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});
