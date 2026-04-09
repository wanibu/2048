import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRID_ROWS, GRID_COLS, CELL_SIZE, GRID_OFFSET_X } from '../config';
import { Grid } from '../objects/Grid';
import { Sling } from '../objects/Sling';
import { Shape } from '../objects/Shape';
import { MergeSystem } from '../systems/MergeSystem';
import { HUD } from '../ui/HUD';

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private sling!: Sling;
  private mergeSystem!: MergeSystem;
  private hud!: HUD;
  private activeShapes: Shape[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Background — scaled to cover fullscreen, lowest depth
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'playbackground');
    const scaleX = GAME_WIDTH / bg.width;
    const scaleY = GAME_HEIGHT / bg.height;
    bg.setScale(Math.max(scaleX, scaleY));
    bg.setDepth(-1000);

    this.hud = new HUD(this);
    this.grid = new Grid(this);
    this.mergeSystem = new MergeSystem(this.grid);

    this.sling = new Sling(this, this.grid);
    this.sling.onShoot((shape, col) => this.handleShoot(shape, col));

  }

  private handleShoot(shape: Shape, col: number): void {
    // Immediately calculate where this shape will land and tween it there
    const targetRow = this.findFarthestEmptyRow(col);

    if (targetRow === -1) {
      // Column full — destroy and respawn
      shape.destroy();
      this.sling.respawn();
      return;
    }

    // Stop physics — use tween instead for smooth movement
    const body = shape.getBody();
    body.setVelocity(0, 0);

    const targetPos = this.grid.cellToPixel(targetRow, col);
    const distance = Math.abs(shape.y - targetPos.y);
    const duration = Math.max(150, distance * 0.4); // speed based on distance

    this.tweens.add({
      targets: shape,
      y: targetPos.y,
      duration,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.landShape(shape, col, targetRow);
      },
    });
  }

  private findFarthestEmptyRow(col: number): number {
    // Block shoots upward — lands at the topmost (farthest) empty row
    for (let r = 0; r < GRID_ROWS; r++) {
      if (this.grid.data[r][col] === 0) {
        return r;
      }
    }
    return -1;
  }

  private landShape(shape: Shape, col: number, targetRow: number): void {
    const value = shape.value;
    shape.destroy();

    const border = this.grid.placeBorder(targetRow, col, value);

    this.tweens.add({
      targets: border,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    // Collision sound on landing
    this.sound.play('slingshot2', { volume: 0.3 });

    this.time.delayedCall(150, () => this.checkMerges());
  }

  private checkMerges(): void {
    const groups = this.mergeSystem.findMergeGroups();

    if (groups.length === 0) {
      this.sling.respawn();
      return;
    }

    groups.sort((a, b) => b.cells.length - a.cells.length);
    const result = this.mergeSystem.executeMerge(groups[0]);

    this.hud.addScore(result.newValue);
    this.sound.play('collapse1', { volume: 0.4 });

    const border = this.grid.borders[result.row][result.col];
    if (border) {
      this.tweens.add({
        targets: border,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 120,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }

    // Check chain merges
    this.time.delayedCall(400, () => this.checkMerges());
  }
}
