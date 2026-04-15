import Phaser from 'phaser';

export class HUD {
  private scene: Phaser.Scene;
  private scoreText: Phaser.GameObjects.Text;
  private topScoreText: Phaser.GameObjects.Text;
  private score: number = 0;
  private topScore: number = 0;

  constructor(scene: Phaser.Scene, w: number, visible = true) {
    this.scene = scene;

    const saved = localStorage.getItem('giant2048_topscore');
    if (saved) this.topScore = parseInt(saved, 10);

    const fontSize = Math.round(w * 0.045);

    this.scoreText = scene.add.text(w / 2, w * 0.05, 'Score: 0', {
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100).setVisible(visible);

    this.topScoreText = scene.add.text(w / 2, w * 0.1, `Best: ${this.topScore}`, {
      fontSize: `${Math.round(fontSize * 0.7)}px`,
      color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(100).setVisible(visible);
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

  // 恢复分数（窗口resize后恢复用）
  setScore(score: number): void {
    this.score = score;
    this.scoreText.setText(`Score: ${score}`);
  }
}
