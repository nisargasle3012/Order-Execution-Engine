import express, { Express, Request, Response } from 'express';
import { z } from 'zod';
import { createNewMarketOrder } from '../domain/order';
import { insertOrder } from '../infra/postgres';
import { addOrderToQueue } from '../queue/orderQueue';

const executeOrderSchema = z.object({
  side: z.enum(['buy', 'sell']),
  tokenIn: z.string().min(1),
  tokenOut: z.string().min(1),
  amountIn: z.number().positive(),
  maxSlippageBps: z.number().min(0).max(10000),
});

export function registerOrderRoutes(app: Express): void {
  app.post('/api/orders/execute', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validated = executeOrderSchema.parse(req.body);

      // Create new market order
      const order = createNewMarketOrder({
        side: validated.side,
        tokenIn: validated.tokenIn,
        tokenOut: validated.tokenOut,
        amountIn: validated.amountIn,
        maxSlippageBps: validated.maxSlippageBps,
      });

      // Insert into PostgreSQL
      await insertOrder(order);

      // Add to queue for processing
      await addOrderToQueue(order.id);

      // Return 202 Accepted with orderId
      res.status(202).json({ orderId: order.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      } else {
        console.error('Error creating order:', error);
        res.status(500).json({
          error: 'Internal server error',
        });
      }
    }
  });
}
