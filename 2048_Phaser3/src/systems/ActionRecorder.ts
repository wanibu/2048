import { getFingerprint } from '../utils/fingerprint';
import { startGame, sendAction, updateScore, endGame } from '../utils/api';

interface GameAction {
  type: 'shoot' | 'rotate' | 'direct_merge';
  col?: number;
  value?: number;
  direction?: 'cw' | 'ccw';
  resultValue?: number;
}

// 和后端通信的操作记录器
// 每步操作发给后端，后端维护签名链和糖果序列
export class ActionRecorder {
  private gameId: string = '';
  private currentSign: string = '';
  private score: number = 0;
  private ready: boolean = false;

  // 回调：当后端返回下一个糖果时通知外部
  private onNextCandyCallback: ((candy: number) => void) | null = null;

  async init(): Promise<{ currentCandy: number; nextCandy: number }> {
    const fingerprint = await getFingerprint();
    console.log('[ActionRecorder] fingerprint:', fingerprint.slice(0, 16) + '...');

    const result = await startGame(fingerprint);
    this.gameId = result.gameId;
    this.currentSign = result.sign;
    this.ready = true;

    console.log('[ActionRecorder] gameId:', this.gameId);
    return { currentCandy: result.currentCandy, nextCandy: result.nextCandy };
  }

  onNextCandy(callback: (candy: number) => void): void {
    this.onNextCandyCallback = callback;
  }

  async recordShoot(col: number, value: number): Promise<void> {
    if (!this.ready) return;
    const action: GameAction = { type: 'shoot', col, value };
    try {
      const result = await sendAction(this.gameId, action);
      this.currentSign = result.sign;
      console.log(`[ActionRecorder] shoot col=${col} value=${value} → nextCandy=${result.nextCandy}`);
      if (this.onNextCandyCallback) {
        this.onNextCandyCallback(result.nextCandy);
      }
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
      console.log(`[ActionRecorder] rotate ${direction}`);
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
      console.log(`[ActionRecorder] direct_merge col=${col} ${value}→${resultValue} → nextCandy=${result.nextCandy}`);
      if (this.onNextCandyCallback) {
        this.onNextCandyCallback(result.nextCandy);
      }
    } catch (e) {
      console.error('[ActionRecorder] direct_merge failed:', e);
    }
  }

  async reportScore(score: number): Promise<void> {
    if (!this.ready) return;
    this.score = score;
    try {
      await updateScore(this.gameId, score);
    } catch (e) {
      console.error('[ActionRecorder] updateScore failed:', e);
    }
  }

  async finish(): Promise<{ rank: number } | null> {
    if (!this.ready) return null;
    try {
      const result = await endGame(this.gameId, this.currentSign);
      console.log(`[ActionRecorder] game ended, rank=${result.rank}`);
      return { rank: result.rank };
    } catch (e) {
      console.error('[ActionRecorder] endGame failed:', e);
      return null;
    }
  }

  getGameId(): string {
    return this.gameId;
  }

  getSign(): string {
    return this.currentSign;
  }
}
