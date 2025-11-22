import mongoose, { Schema, Document, Model } from 'mongoose';
import { config } from '../config/env';
import { OrderStatus } from '../domain/order';

export async function initMongo(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUrl);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// OrderEventLog schema
interface IOrderEventLog extends Document {
  orderId: string;
  status: string;
  data?: Record<string, any>;
  createdAt: Date;
}

const orderEventLogSchema = new Schema<IOrderEventLog>(
  {
    orderId: { type: String, required: true, index: true },
    status: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: 'order_event_logs',
  }
);

export const OrderEventLogModel: Model<IOrderEventLog> = mongoose.model<IOrderEventLog>(
  'OrderEventLog',
  orderEventLogSchema
);

export async function logOrderEvent(
  orderId: string,
  status: OrderStatus,
  data?: Record<string, unknown>
): Promise<void> {
  await OrderEventLogModel.create({
    orderId,
    status,
    data,
    createdAt: new Date(),
  });
}

export { mongoose };
