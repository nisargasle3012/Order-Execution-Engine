import { Order } from '../domain/order';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface DexQuote {
  dex: 'raydium' | 'meteora';
  price: number; // tokenOut per 1 tokenIn
  fee: number;
}

export class MockDexRouter {
  constructor(
    private basePrice = 1,
    private randomFn: () => number = Math.random
  ) {}

  async getRaydiumQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<DexQuote> {
    await sleep(200);

    const price = this.basePrice * (0.98 + this.randomFn() * 0.04);
    const fee = 0.003;

    return {
      dex: 'raydium',
      price,
      fee,
    };
  }

  async getMeteoraQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<DexQuote> {
    await sleep(200);

    const price = this.basePrice * (0.97 + this.randomFn() * 0.05);
    const fee = 0.002;

    return {
      dex: 'meteora',
      price,
      fee,
    };
  }

  async getBestQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<{ best: DexQuote; all: DexQuote[] }> {
    const [raydium, meteora] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amount),
      this.getMeteoraQuote(tokenIn, tokenOut, amount),
    ]);

    const all = [raydium, meteora];
    const best = raydium.price > meteora.price ? raydium : meteora;

    return { best, all };
  }

  async executeSwap(
    dex: 'raydium' | 'meteora',
    order: Order
  ): Promise<{ txHash: string; executedPrice: number }> {
    // Simulate swap execution time
    await sleep(2000 + this.randomFn() * 1000);

    // Generate random transaction hash
    const txHash = '0x' + Array.from({ length: 64 }, () =>
      Math.floor(this.randomFn() * 16).toString(16)
    ).join('');

    // Calculate executed price with slight variance
    const executedPrice = this.basePrice * (0.99 + this.randomFn() * 0.02);

    return {
      txHash,
      executedPrice,
    };
  }
}

export const dexRouter = new MockDexRouter();
