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

  init(gameId: string, initialTokens: SequenceToken[]): void {
    this.gameId = gameId;
    this.queue = [...initialTokens];
    this.fetching = false;
    this.exhausted = false;
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
   */
  advance(): AdvanceResult | null {
    // 弹出第一个糖果（已打出）
    this.consumeNextCandy();

    // 收集糖果后面连续的 stone
    const stones = this.countAndRemoveLeadingStones();

    const result = this.peekCandies();
    this.maybeRefill();
    if (!result) return null;
    return { ...result, pendingStones: stones };
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

  /**
   * 消费队列中的下一个糖果（跳过 stone，stone 计入返回值外的计数）
   */
  private consumeNextCandy(): number | null {
    while (this.queue.length > 0) {
      const token = this.queue.shift()!;
      if (token === 'stone') {
        // 在 consumeNextCandy 里遇到 stone 说明它夹在两个糖果中间
        // 放回去让 countAndRemoveLeadingStones 处理
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

  /**
   * 计数并移除队列前面连续的 stone token，返回数量
   */
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
        console.log(`[TokenQueue] refilled ${result.tokens.length} tokens, queue size=${this.queue.length}`);
      }
    } catch (e) {
      console.error('[TokenQueue] refill failed:', e);
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
