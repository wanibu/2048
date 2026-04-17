import { nextToken, SequenceToken } from '../utils/api';

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

  peekCandies(): { currentCandy: number; nextCandy: number | null } | null {
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

  advance(onStone: () => void): { currentCandy: number; nextCandy: number | null } | null {
    // Pop the current candy (user just shot it)
    this.consumeNextCandy(onStone);
    // Process any stones before the next candy
    this.processLeadingStones(onStone);
    const result = this.peekCandies();
    this.maybeRefill();
    return result;
  }

  prepareInitial(onStone: () => void): { currentCandy: number; nextCandy: number | null } | null {
    this.processLeadingStones(onStone);
    const result = this.peekCandies();
    this.maybeRefill();
    return result;
  }

  private consumeNextCandy(onStone: () => void): number | null {
    while (this.queue.length > 0) {
      const token = this.queue.shift()!;
      if (token === 'stone') {
        console.log('[TokenQueue] stone encountered, spawning');
        onStone();
        continue;
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

  private processLeadingStones(onStone: () => void): void {
    while (this.queue.length > 0 && this.queue[0] === 'stone') {
      this.queue.shift();
      console.log('[TokenQueue] leading stone, spawning');
      onStone();
    }
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
