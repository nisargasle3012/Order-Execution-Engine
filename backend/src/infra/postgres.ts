import { Pool } from 'pg';
import { config } from '../config/env';
import { Order, OrderStatus } from '../domain/order';

export const pgPool = new Pool({
  connectionString: config.databaseUrl,
});

export async function initPostgres(): Promise<void> {
  try {
    await pgPool.query('SELECT 1');
    console.log('PostgreSQL connected');

    // Create orders table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY,
        type TEXT NOT NULL,
        side TEXT NOT NULL,
        token_in TEXT NOT NULL,
        token_out TEXT NOT NULL,
        amount_in NUMERIC NOT NULL,
        max_slippage_bps INTEGER NOT NULL,
        status TEXT NOT NULL,
        chosen_dex TEXT,
        executed_price NUMERIC,
        tx_hash TEXT,
        failure_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);

    console.log('PostgreSQL tables initialized');
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    throw error;
  }
}

export async function insertOrder(order: Order): Promise<void> {
  await pgPool.query(
    `
    INSERT INTO orders (
      id, type, side, token_in, token_out, amount_in, max_slippage_bps,
      status, chosen_dex, executed_price, tx_hash, failure_reason,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `,
    [
      order.id,
      order.type,
      order.side,
      order.tokenIn,
      order.tokenOut,
      order.amountIn,
      order.maxSlippageBps,
      order.status,
      order.chosenDex ?? null,
      order.executedPrice ?? null,
      order.txHash ?? null,
      order.failureReason ?? null,
      order.createdAt,
      order.updatedAt,
    ]
  );
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  patch?: Partial<Order>
): Promise<void> {
  const updates: string[] = ['status = $2', 'updated_at = $3'];
  const values: any[] = [orderId, status, new Date()];
  let paramIndex = 4;

  if (patch?.chosenDex !== undefined) {
    updates.push(`chosen_dex = $${paramIndex}`);
    values.push(patch.chosenDex);
    paramIndex++;
  }

  if (patch?.executedPrice !== undefined) {
    updates.push(`executed_price = $${paramIndex}`);
    values.push(patch.executedPrice);
    paramIndex++;
  }

  if (patch?.txHash !== undefined) {
    updates.push(`tx_hash = $${paramIndex}`);
    values.push(patch.txHash);
    paramIndex++;
  }

  if (patch?.failureReason !== undefined) {
    updates.push(`failure_reason = $${paramIndex}`);
    values.push(patch.failureReason);
    paramIndex++;
  }

  await pgPool.query(
    `UPDATE orders SET ${updates.join(', ')} WHERE id = $1`,
    values
  );
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const result = await pgPool.query(
    'SELECT * FROM orders WHERE id = $1',
    [orderId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    type: row.type,
    side: row.side,
    tokenIn: row.token_in,
    tokenOut: row.token_out,
    amountIn: parseFloat(row.amount_in),
    maxSlippageBps: row.max_slippage_bps,
    status: row.status,
    chosenDex: row.chosen_dex,
    executedPrice: row.executed_price ? parseFloat(row.executed_price) : undefined,
    txHash: row.tx_hash,
    failureReason: row.failure_reason,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
