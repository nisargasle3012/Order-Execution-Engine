import { EventEmitter } from 'events';
import { OrderStatus } from '../domain/order';
import { logOrderEvent } from '../infra/mongo';

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  data?: Record<string, unknown>;
}

class OrderEvents extends EventEmitter {}

export const orderEvents = new OrderEvents();

export async function emitStatusUpdate(update: OrderStatusUpdate): Promise<void> {
  orderEvents.emit('status', update);
  await logOrderEvent(update.orderId, update.status, update.data);
}
