import { Queue } from 'bullmq';
import { bullConnection } from '../infra/redis';

export const ordersQueue = new Queue('orders', bullConnection);

export function addOrderToQueue(orderId: string) {
  return ordersQueue.add(
    'processOrder',
    { orderId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    }
  );
}
