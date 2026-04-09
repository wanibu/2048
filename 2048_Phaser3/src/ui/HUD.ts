import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';

export class HUD {
  private scene: Phaser.Scene;
  private scoreText: Phaser.GameObjects.Text;
  private topScoreText: Phaser.GameObjects.Text;
  private score: number = 0;
  private topScore: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const saved = localStorage.getItem('giant2048_topscore');
    if (saved) this.topScore = parseInt(saved, 10);

    this.scoreText = scene.add.text(GAME_WIDTH / 2, 30, 'Score: 0', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);

    this.topScoreText = scene.add.text(GAME_WIDTH / 2, 65, `Best: ${this.topScore}`, {
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(100);
  }

  addScore(points: number): void {
    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);

    if (this.score > this.topScore) {
      this.topScore = this.score;
      this.topScoreText.setText(`Best: ${this.topScore}`);
      localStorage.setItem('giant2048_topscore', String(this.topScore));
    }

    this.scene.tweens.add({
      targets: this.scoreText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  getScore(): number {
    return this.score;
  }

  getTopScore(): number {
    return this.topScore;
  }
}
