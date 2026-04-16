import { getFingerprint } from '../utils/fingerprint';
import { startGame, sendAction, updateScore, endGame, SequenceToken } from '../utils/api';

// 和后端通信的局级记录器。
// 新模式只有两次交互：
// 1. 开局：拿完整 sequence
// 2. 结束：一次性提交整局结果
export class ActionRecorder {
  private gameId: string = '';
  private currentSign: string = '';
  private ready: boolean = false;
  private userId: string = '';
  private sequencePlanId: string = '';
  private generatedSequenceId: string = '';

  // sequence 是本局唯一内容来源：
  // - 数字字符串 => 糖果
  // - "stone" => 立即生成一个石头障碍
  private sequence: SequenceToken[] = [];
  private sequenceIndex: number = 0;

  private currentCandy: number | null = null;
  private nextCandy: number | null = null;
  private actionsCount: number = 0;

  async init(userId?: string): Promise<void> {
    this.userId = userId || '';
    const fingerprint = await getFingerprint();
    console.log('[ActionRecorder] fingerprint:', fingerprint.slice(0, 16) + '...');

    const result = await startGame(fingerprint, this.userId);
    this.gameId = result.gameId;
    this.currentSign = result.sign;
    this.sequencePlanId = result.sequencePlanId;
    this.generatedSequenceId = result.generatedSequenceId;
    this.sequence = result.sequence;
    this.sequenceIndex = 0;
    this.currentCandy = null;
    this.nextCandy = null;
    this.actionsCount = 0;
    this.ready = true;

    console.log(
      `[ActionRecorder] gameId=${this.gameId}, plan=${this.sequencePlanId}, ` +
      `generatedSequence=${this.generatedSequenceId}, sequence length=${this.sequence.length}`
    );
  }

  prepareInitialCandies(onStone: () => void): { currentCandy: number; nextCandy: number | null } | null {
    if (!this.ready) return null;

    this.currentCandy = this.consumePlayableCandy(onStone);
    this.nextCandy = this.consumePlayableCandy(onStone);

    if (this.currentCandy === null) {
      return null;
    }

    return {
      currentCandy: this.currentCandy,
      nextCandy: this.nextCandy,
    };
  }

  advanceAfterShot(onStone: () => void): { currentCandy: number; nextCandy: number | null } | null {
    if (!this.ready || this.nextCandy === null) {
      return null;
    }

    this.currentCandy = this.nextCandy;
    this.nextCandy = this.consumePlayableCandy(onStone);

    return {
      currentCandy: this.currentCandy,
      nextCandy: this.nextCandy,
    };
  }

  private consumePlayableCandy(onStone: () => void): number | null {
    while (this.sequenceIndex < this.sequence.length) {
      const token = this.sequence[this.sequenceIndex];
      this.sequenceIndex++;

      if (token === 'stone') {
        console.log(`[ActionRecorder] token[${this.sequenceIndex - 1}] => stone`);
        onStone();
        continue;
      }

      const value = parseInt(token, 10);
      if (!Number.isFinite(value)) {
        console.warn(`[ActionRecorder] invalid token ignored: ${token}`);
        continue;
      }

      console.log(`[ActionRecorder] token[${this.sequenceIndex - 1}] => candy ${value}`);
      return value;
    }

    console.warn('[ActionRecorder] sequence exhausted');
    return null;
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
        type: 'direct_merge',
        col,
        value,
        resultValue,
      });
      this.currentSign = result.sign;
    } catch (e) {
      console.error('[ActionRecorder] direct_merge failed:', e);
    }
  }

  // 保留接口形状，现阶段不再实时上报。
  async reportScore(score: number): Promise<void> {
    if (!this.ready) return;
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
