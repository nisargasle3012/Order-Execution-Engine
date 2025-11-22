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
    console.log(
      `[ROUTER] Fetching Raydium quote | tokenIn: ${tokenIn}, tokenOut: ${tokenOut}, amount: ${amount}`
    );

    await sleep(200);

    const price = this.basePrice * (0.98 + this.randomFn() * 0.04);
    const fee = 0.003;

    console.log(
      `[ROUTER] Raydium Quote | price: ${price.toFixed(
        6
      )} | fee: ${fee} | amount: ${amount}`
    );

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
    console.log(
      `[ROUTER] Fetching Meteora quote | tokenIn: ${tokenIn}, tokenOut: ${tokenOut}, amount: ${amount}`
    );

    await sleep(200);

    const price = this.basePrice * (0.97 + this.randomFn() * 0.05);
    const fee = 0.002;

    console.log(
      `[ROUTER] Meteora Quote | price: ${price.toFixed(
        6
      )} | fee: ${fee} | amount: ${amount}`
    );

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
    console.log(
      `[ROUTER] Getting best quote for order | tokenIn: ${tokenIn}, tokenOut: ${tokenOut}, amount: ${amount}`
    );

    const [raydium, meteora] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amount),
      this.getMeteoraQuote(tokenIn, tokenOut, amount),
    ]);

    const all = [raydium, meteora];
    const best = raydium.price > meteora.price ? raydium : meteora;

    console.log(
      `[ROUTER] Best DEX selected | dex: ${best.dex} | price: ${best.price.toFixed(
        6
      )}`
    );

    return { best, all };
  }

  async executeSwap(
    dex: 'raydium' | 'meteora',
    order: Order
  ): Promise<{ txHash: string; executedPrice: number }> {
    console.log(
      `[SWAP] Executing swap on ${dex} | orderId: ${order.id} | amountIn: ${order.amountIn} ${order.tokenIn}`
    );

    // Simulate swap delay
    await sleep(2000 + this.randomFn() * 1000);

    // Generate mock tx hash
    const txHash = '0x' + Array.from({ length: 64 }, () =>
      Math.floor(this.randomFn() * 16).toString(16)
    ).join('');

    // Slight variance in final executed price
    const executedPrice = this.basePrice * (0.99 + this.randomFn() * 0.02);

    console.log(
      `[SWAP] Swap executed | orderId: ${order.id} | dex: ${dex} | txHash: ${txHash} | executedPrice: ${executedPrice.toFixed(
        6
      )}`
    );

    return {
      txHash,
      executedPrice,
    };
  }
}

export const dexRouter = new MockDexRouter();
