import { getFingerprint } from '../utils/fingerprint';
import { startGame, extendSequence, sendAction, updateScore, endGame } from '../utils/api';

interface GameAction {
  type: 'shoot' | 'rotate' | 'direct_merge';
  col?: number;
  value?: number;
  direction?: 'cw' | 'ccw';
  resultValue?: number;
}

// 和后端通信的操作记录器
// 开局拿50个糖果序列，按顺序消费，用完再请求
export class ActionRecorder {
  private gameId: string = '';
  private currentSign: string = '';
  private ready: boolean = false;
  private userId: string = '';

  // 糖果序列
  private sequence: number[] = [];
  private sequenceIndex: number = 0; // 当前消费到第几个

  async init(userId?: string): Promise<{ currentCandy: number; nextCandy: number }> {
    this.userId = userId || '';
    const fingerprint = await getFingerprint();
    console.log('[ActionRecorder] fingerprint:', fingerprint.slice(0, 16) + '...');

    const result = await startGame(fingerprint, this.userId);
    this.gameId = result.gameId;
    this.currentSign = result.sign;
    this.sequence = result.sequence;
    this.sequenceIndex = 0;
    this.ready = true;

    console.log(`[ActionRecorder] gameId=${this.gameId}, config=${result.sequenceConfig}, sequence length=${this.sequence.length}`);

    // 第一个糖果和第二个作为预览
    const currentCandy = this.consumeNext();
    const nextCandy = this.peekNext();
    return { currentCandy, nextCandy };
  }

  // 消费下一个糖果值（弹弓发射后调用）
  consumeNext(): number {
    if (this.sequenceIndex >= this.sequence.length) {
      // 应该不会到这里，因为会提前请求更多
      console.warn('[ActionRecorder] sequence exhausted, using fallback');
      return 2;
    }
    const value = this.sequence[this.sequenceIndex];
    this.sequenceIndex++;

    // 如果快用完了（剩10个以内），提前请求更多
    if (this.sequence.length - this.sequenceIndex <= 10) {
      this.fetchMoreSequence();
    }

    return value;
  }

  // 查看下一个糖果值（不消费，用于预览）
  peekNext(): number {
    if (this.sequenceIndex >= this.sequence.length) {
      return 2;
    }
    return this.sequence[this.sequenceIndex];
  }

  // 请求更多糖果序列
  private async fetchMoreSequence(): Promise<void> {
    try {
      console.log('[ActionRecorder] fetching more sequence...');
      const result = await extendSequence(this.gameId);
      this.sequence = [...this.sequence, ...result.sequence];
      console.log(`[ActionRecorder] extended, total sequence: ${this.sequence.length}`);
    } catch (e) {
      console.error('[ActionRecorder] fetchMoreSequence failed:', e);
    }
  }

  async recordShoot(col: number, value: number): Promise<void> {
    if (!this.ready) return;
    const action: GameAction = { type: 'shoot', col, value };
    try {
      const result = await sendAction(this.gameId, action);
      this.currentSign = result.sign;
      console.log(`[ActionRecorder] shoot col=${col} value=${value}`);
    } catch (e) {
      console.error('[ActionRecorder] shoot failed:', e);
    }
  }

  async recordRotate(direction: 'cw' | 'ccw'): Promise<void> {
    if (!this.ready) return;
    const action: GameAction = { type: 'rotate', direction };
    try {
      const result = await sendAction(this.gameId, action);
      this.currentSign = result.sign;
    } catch (e) {
      console.error('[ActionRecorder] rotate failed:', e);
    }
  }

  async recordDirectMerge(col: number, value: number, resultValue: number): Promise<void> {
    if (!this.ready) return;
    const action: GameAction = { type: 'direct_merge', col, value, resultValue };
    try {
      const result = await sendAction(this.gameId, action);
      this.currentSign = result.sign;
    } catch (e) {
      console.error('[ActionRecorder] direct_merge failed:', e);
    }
  }

  async reportScore(score: number): Promise<void> {
    if (!this.ready) return;
    try {
      await updateScore(this.gameId, score);
    } catch (e) {
      console.error('[ActionRecorder] updateScore failed:', e);
    }
  }

  async finish(endReason?: string): Promise<{ rank: number } | null> {
    if (!this.ready) return null;
    try {
      const result = await endGame(this.gameId, this.currentSign, endReason);
      console.log(`[ActionRecorder] game ended, reason=${endReason}, rank=${result.rank}`);
      return { rank: result.rank };
    } catch (e) {
      console.error('[ActionRecorder] endGame failed:', e);
      return null;
    }
  }

  getGameId(): string { return this.gameId; }
  getSign(): string { return this.currentSign; }
}
