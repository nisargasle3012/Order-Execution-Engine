import { MockDexRouter } from '../src/dex/mockDexRouter';
import { Order } from '../src/domain/order';

describe('MockDexRouter', () => {
  const basePrice = 1;
  const deterministicRandom = () => 0.5; // Always returns 0.5
  let router: MockDexRouter;

  beforeEach(() => {
    router = new MockDexRouter(basePrice, deterministicRandom);
  });

  describe('getRaydiumQuote', () => {
    it('should return a quote with price in expected range (0.98-1.02)', async () => {
      const quote = await router.getRaydiumQuote('SOL', 'USDC', 100);

      expect(quote.dex).toBe('raydium');
      expect(quote.fee).toBe(0.003);

      // With randomFn = 0.5, price = basePrice * (0.98 + 0.5 * 0.04) = 1 * (0.98 + 0.02) = 1.0
      expect(quote.price).toBe(1.0);
    });

    it('should return price within valid range', async () => {
      const quote = await router.getRaydiumQuote('SOL', 'USDC', 100);

      expect(quote.price).toBeGreaterThanOrEqual(0.98);
      expect(quote.price).toBeLessThanOrEqual(1.02);
    });
  });

  describe('getMeteoraQuote', () => {
    it('should return a quote with price in expected range (0.97-1.02)', async () => {
      const quote = await router.getMeteoraQuote('SOL', 'USDC', 100);

      expect(quote.dex).toBe('meteora');
      expect(quote.fee).toBe(0.002);

      // With randomFn = 0.5, price = basePrice * (0.97 + 0.5 * 0.05) = 1 * (0.97 + 0.025) = 0.995
      expect(quote.price).toBe(0.995);
    });

    it('should return price within valid range', async () => {
      const quote = await router.getMeteoraQuote('SOL', 'USDC', 100);

      expect(quote.price).toBeGreaterThanOrEqual(0.97);
      expect(quote.price).toBeLessThanOrEqual(1.02);
    });
  });

  describe('getBestQuote', () => {
    it('should return both quotes and pick the one with higher price', async () => {
      const result = await router.getBestQuote('SOL', 'USDC', 100);

      expect(result.all).toHaveLength(2);
      expect(result.all[0].dex).toBe('raydium');
      expect(result.all[1].dex).toBe('meteora');

      // Raydium: 1.0, Meteora: 0.995
      // Raydium has higher price
      expect(result.best.dex).toBe('raydium');
      expect(result.best.price).toBe(1.0);
    });

    it('should pick the DEX with higher price', async () => {
      const result = await router.getBestQuote('SOL', 'USDC', 100);

      const raydiumQuote = result.all.find(q => q.dex === 'raydium')!;
      const meteoraQuote = result.all.find(q => q.dex === 'meteora')!;

      if (raydiumQuote.price > meteoraQuote.price) {
        expect(result.best.dex).toBe('raydium');
      } else {
        expect(result.best.dex).toBe('meteora');
      }
    });
  });

  describe('executeSwap', () => {
    it('should return transaction hash and executed price', async () => {
      const mockOrder: Order = {
        id: 'test-order-id',
        type: 'market',
        side: 'buy',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        maxSlippageBps: 100,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await router.executeSwap('raydium', mockOrder);

      expect(result.txHash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(result.executedPrice).toBeGreaterThan(0);

      // With randomFn = 0.5, executedPrice = basePrice * (0.99 + 0.5 * 0.02) = 1 * (0.99 + 0.01) = 1.0
      expect(result.executedPrice).toBe(1.0);
    });

    it('should return executed price within valid range', async () => {
      const mockOrder: Order = {
        id: 'test-order-id',
        type: 'market',
        side: 'buy',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 100,
        maxSlippageBps: 100,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await router.executeSwap('meteora', mockOrder);

      expect(result.executedPrice).toBeGreaterThanOrEqual(0.99);
      expect(result.executedPrice).toBeLessThanOrEqual(1.01);
    });
  });
});
