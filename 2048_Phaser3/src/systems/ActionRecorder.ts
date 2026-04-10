import { GameAction, GameRecord, chainSign, initSign } from '../shared/game-logic';

export class ActionRecorder {
  private actions: GameAction[] = [];
  private currentSign: string = '';
  private seed: number;
  private step: number = 0;
  private score: number = 0;
  private ready: boolean = false;

  constructor() {
    // 用时间戳作为随机种子
    this.seed = Date.now();
    this.init();
  }

  private async init(): Promise<void> {
    this.currentSign = await initSign(this.seed);
    this.ready = true;
  }

  async recordShoot(col: number, value: number): Promise<void> {
    if (!this.ready) return;
    this.step++;
    const action: GameAction = { step: this.step, type: 'shoot', col, value };
    this.currentSign = await chainSign(this.currentSign, action);
    this.actions.push(action);
  }

  async recordRotate(direction: 'cw' | 'ccw'): Promise<void> {
    if (!this.ready) return;
    this.step++;
    const action: GameAction = { step: this.step, type: 'rotate', direction };
    this.currentSign = await chainSign(this.currentSign, action);
    this.actions.push(action);
  }

  async recordDirectMerge(col: number, value: number, resultValue: number): Promise<void> {
    if (!this.ready) return;
    this.step++;
    const action: GameAction = { step: this.step, type: 'direct_merge', col, value, resultValue };
    this.currentSign = await chainSign(this.currentSign, action);
    this.actions.push(action);
  }

  updateScore(score: number): void {
    this.score = score;
  }

  getRecord(): GameRecord {
    return {
      actions: [...this.actions],
      finalScore: this.score,
      finalSign: this.currentSign,
      seed: this.seed,
    };
  }

  getSeed(): number {
    return this.seed;
  }

  // 从保存的记录恢复（窗口resize后），保持签名链完整
  restoreFrom(record: GameRecord): void {
    this.actions = [...record.actions];
    this.currentSign = record.finalSign;
    this.seed = record.seed;
    this.score = record.finalScore;
    this.step = record.actions.length;
    this.ready = true;
  }
}
