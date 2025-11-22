import { randomUUID } from 'crypto';

export type OrderType = 'market';

export type OrderSide = 'buy' | 'sell';

export type OrderStatus =
  | 'pending'
  | 'routing'
  | 'building'
  | 'submitted'
  | 'confirmed'
  | 'failed';

export interface Order {
  id: string;
  type: OrderType;
  side: OrderSide;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  maxSlippageBps: number;
  status: OrderStatus;
  chosenDex?: 'raydium' | 'meteora';
  executedPrice?: number;
  txHash?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createNewMarketOrder(params: {
  side: OrderSide;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  maxSlippageBps: number;
}): Order {
  const now = new Date();

  const order: Order = {
    id: randomUUID(),
    type: 'market',
    status: 'pending',
    side: params.side,
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn,
    maxSlippageBps: params.maxSlippageBps,
    createdAt: now,
    updatedAt: now,
  };

  console.log(
    `[ORDER] Created new market order: ${order.id} | side: ${order.side} | ${order.amountIn} ${order.tokenIn} → ${order.tokenOut}`
  );

  return order;
}
