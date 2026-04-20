import { nextToken, SequenceToken } from '../utils/api';

export interface AdvanceResult {
  currentCandy: number;
  nextCandy: number | null;
  pendingStones: number;
}

export class TokenQueue {
  private queue: SequenceToken[] = [];
  private gameId: string = '';
  private fetching: boolean = false;
  private exhausted: boolean = false;
  private refillFailed: boolean = false;

  init(gameId: string, initialTokens: SequenceToken[]): void {
    this.gameId = gameId;
    this.queue = [...initialTokens];
    this.fetching = false;
    this.exhausted = false;
    this.refillFailed = false;
  }

  /**
   * 开局：消费队列前面的 stone（计数但不触发），返回前两个糖果 + 待处理石头数
   */
  prepareInitial(): AdvanceResult | null {
    const stones = this.countAndRemoveLeadingStones();
    const result = this.peekCandies();
    this.maybeRefill();
    if (!result) return null;
    return { ...result, pendingStones: stones };
  }

  /**
   * 打出当前糖果后调用：消费一个糖果，收集后续 stone，返回新的 curr/next + 待处理石头数
   * 返回 null 表示序列真正用完（exhausted），不是网络问题
   */
  advance(): AdvanceResult | null {
    console.log(`[TokenQueue] advance() 前: queue=[${this.queue.join(',')}]`);
    this.consumeNextCandy();
    const stones = this.countAndRemoveLeadingStones();
    const result = this.peekCandies();
    this.maybeRefill();
    if (!result) {
      console.log(`[TokenQueue] advance() 结果: null, queue=[${this.queue.join(',')}]`);
      return null;
    }
    console.log(`[TokenQueue] advance() 结果: curr=${result.currentCandy}, next=${result.nextCandy}, stones=${stones}, queue=[${this.queue.join(',')}]`);
    return { ...result, pendingStones: stones };
  }

  /**
   * 队列是否因为网络失败而为空（不是序列真正用完）
   */
  isWaitingForNetwork(): boolean {
    return this.refillFailed && !this.exhausted && this.queue.length === 0;
  }

  /**
   * 手动触发重试补充
   */
  async retryRefill(): Promise<boolean> {
    if (this.exhausted) return false;
    this.refillFailed = false;
    await this.refill();
    return this.queue.length > 0;
  }

  private peekCandies(): { currentCandy: number; nextCandy: number | null } | null {
    const candies: number[] = [];
    for (const token of this.queue) {
      if (token !== 'stone') {
        const v = parseInt(token, 10);
        if (Number.isFinite(v)) {
          candies.push(v);
          if (candies.length === 2) break;
        }
      }
    }
    if (candies.length === 0) return null;
    return {
      currentCandy: candies[0],
      nextCandy: candies.length > 1 ? candies[1] : null,
    };
  }

  private consumeNextCandy(): number | null {
    while (this.queue.length > 0) {
      const token = this.queue.shift()!;
      if (token === 'stone') {
        this.queue.unshift(token);
        return null;
      }
      const value = parseInt(token, 10);
      if (Number.isFinite(value)) {
        console.log(`[TokenQueue] consumed candy ${value}`);
        return value;
      }
      console.warn(`[TokenQueue] invalid token ignored: ${token}`);
    }
    return null;
  }

  private countAndRemoveLeadingStones(): number {
    let count = 0;
    while (this.queue.length > 0 && this.queue[0] === 'stone') {
      this.queue.shift();
      count++;
      console.log(`[TokenQueue] pending stone #${count}`);
    }
    return count;
  }

  private maybeRefill(): void {
    if (this.fetching || this.exhausted) return;
    const candyCount = this.queue.filter(t => t !== 'stone').length;
    if (candyCount < 3) {
      this.refill();
    }
  }

  private async refill(): Promise<void> {
    if (this.fetching || this.exhausted) return;
    this.fetching = true;
    try {
      console.log('[TokenQueue] refilling...');
      const result = await nextToken(this.gameId);
      if (result.tokens.length === 0) {
        this.exhausted = true;
        console.log('[TokenQueue] sequence exhausted');
      } else {
        this.queue.push(...result.tokens);
        this.refillFailed = false;
        console.log(`[TokenQueue] refilled ${result.tokens.length} tokens, queue size=${this.queue.length}`);
      }
    } catch (e) {
      console.error('[TokenQueue] refill failed:', e);
      this.refillFailed = true;
    } finally {
      this.fetching = false;
    }
  }

  isExhausted(): boolean {
    return this.exhausted && this.queue.length === 0;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}
