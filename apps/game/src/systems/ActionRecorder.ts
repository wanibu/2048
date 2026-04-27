import { gameInit, sendAction, updateScore, endGame } from '../utils/api';
import { TokenQueue, AdvanceResult } from './TokenQueue';

export class ActionRecorder {
  private static initSeq: number = 0;

  private gameId: string = '';
  private currentSign: string = '';
  private ready: boolean = false;
  private sequencePlanId: string = '';
  private generatedSequenceId: string = '';
  private actionsCount: number = 0;

  public tokenQueue: TokenQueue = new TokenQueue();

  async init(): Promise<void> {
    const mySeq = ++ActionRecorder.initSeq;

    const result = await gameInit();
    // 并发守卫：只有最新一次 init 才可写回状态，否则落后响应会覆盖最新 gameId
    if (mySeq !== ActionRecorder.initSeq) {
      console.warn(`[ActionRecorder.init] 落后响应被丢弃 seq=${mySeq}, current=${ActionRecorder.initSeq}, staleGameId=${result.gameId}`);
      return;
    }
    this.gameId = result.gameId;
    this.currentSign = result.sign;
    this.sequencePlanId = result.sequencePlanId;
    this.generatedSequenceId = result.generatedSequenceId;
    this.actionsCount = 0;

    this.tokenQueue.init(this.gameId, result.tokens);
    this.ready = true;

    console.log(
      `[ActionRecorder] gameId=${this.gameId}, plan=${this.sequencePlanId}, ` +
      `generatedSequence=${this.generatedSequenceId}, initial tokens=${result.tokens.length}`
    );
  }

  prepareInitialCandies(): AdvanceResult | null {
    if (!this.ready) {
      console.warn('[ActionRecorder] prepareInitialCandies called but not ready');
      return null;
    }
    const r = this.tokenQueue.prepareInitial();
    console.log('[ActionRecorder] prepareInitialCandies →', r);
    return r;
  }

  advanceAfterShot(): AdvanceResult | null {
    if (!this.ready) {
      console.warn('[ActionRecorder] advanceAfterShot called but not ready');
      return null;
    }
    const r = this.tokenQueue.advance();
    console.log('[ActionRecorder] advanceAfterShot →', r);
    return r;
  }

  async recordShoot(col: number, value: number): Promise<void> {
    if (!this.ready) return;
    this.actionsCount++;
    console.log(`[ActionRecorder] local shoot col=${col} value=${value}, actions=${this.actionsCount}`);
    try {
      const result = await sendAction(this.gameId, { type: 'shoot', col, value });
      this.currentSign = result.sign;
    } catch (e) {
      console.error('[ActionRecorder] shoot failed:', e);
    }
  }

  async recordRotate(direction: 'cw' | 'ccw'): Promise<void> {
    if (!this.ready) return;
    this.actionsCount++;
    console.log(`[ActionRecorder] local rotate direction=${direction}, actions=${this.actionsCount}`);
    try {
      const result = await sendAction(this.gameId, { type: 'rotate', direction });
      this.currentSign = result.sign;
    } catch (e) {
      console.error('[ActionRecorder] rotate failed:', e);
    }
  }

  async recordDirectMerge(col: number, value: number, resultValue: number): Promise<void> {
    if (!this.ready) return;
    this.actionsCount++;
    console.log(
      `[ActionRecorder] local direct_merge col=${col} value=${value} -> ${resultValue}, actions=${this.actionsCount}`
    );
    try {
      const result = await sendAction(this.gameId, {
        type: 'direct_merge', col, value, resultValue,
      });
      this.currentSign = result.sign;
    } catch (e) {
      console.error('[ActionRecorder] direct_merge failed:', e);
    }
  }

  async reportScore(score: number): Promise<void> {
    if (!this.ready) {
      console.warn(`[ActionRecorder] reportScore(${score}) skipped, not ready`);
      return;
    }
    console.log(`[ActionRecorder] reportScore score=${score}`);
    try {
      await updateScore({ gameId: this.gameId, score });
    } catch (e) {
      console.error('[ActionRecorder] updateScore failed:', e);
    }
  }

  async finish(finalScore: number, endReason?: string): Promise<{ rank: number } | null> {
    if (!this.ready) return null;
    try {
      const result = await endGame({
        gameId: this.gameId,
        finalSign: this.currentSign,
        finalScore,
        endReason,
      });
      console.log(
        `[ActionRecorder] game submitted, reason=${endReason || 'gameover'}, ` +
        `score=${result.score}, rank=${result.rank}`
      );
      return { rank: result.rank };
    } catch (e) {
      console.error('[ActionRecorder] submitGame failed:', e);
      return null;
    }
  }

  getGameId(): string { return this.gameId; }
  getSign(): string { return this.currentSign; }
}
