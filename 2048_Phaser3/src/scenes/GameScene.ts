import Phaser from 'phaser';
import { GRID_ROWS, calcLayout, LayoutConfig } from '../config';
import { Grid } from '../objects/Grid';
import { Sling } from '../objects/Sling';
import { Shape } from '../objects/Shape';
import { MergeSystem } from '../systems/MergeSystem';
import { RotateSystem } from '../systems/RotateSystem';
import { HUD } from '../ui/HUD';

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private sling!: Sling;
  private mergeSystem!: MergeSystem;
  private rotateSystem!: RotateSystem;
  private hud!: HUD;
  private layout!: LayoutConfig;
  private isRotating: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const layout = calcLayout(w, h);

    // 背景铺满
    const bg = this.add.image(w / 2, h / 2, 'playbackground');
    bg.setScale(Math.max(w / bg.width, h / bg.height));
    bg.setDepth(-1000);

    this.layout = layout;
    this.hud = new HUD(this, w);
    this.grid = new Grid(this, layout);
    this.mergeSystem = new MergeSystem(this.grid);
    this.rotateSystem = new RotateSystem(this.grid);

    this.sling = new Sling(this, this.grid, layout);
    this.sling.onShoot((shape, col) => this.handleShoot(shape, col));

    // 旋转按钮
    this.createRotateButtons(w, h, layout);
  }

  private createRotateButtons(w: number, h: number, layout: LayoutConfig): void {
    const btnSize = layout.cellSize * 0.7;
    const btnY = h - btnSize * 0.8;

    // 左旋转按钮 — 左下角
    const leftBtn = this.add.text(w * 0.15, btnY, '↺', {
      fontSize: `${Math.round(btnSize)}px`,
      color: '#ffffff',
      stroke: '#2e7d32',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(50);

    leftBtn.on('pointerdown', () => this.doRotate('ccw'));

    // 右旋转按钮 — 右下角
    const rightBtn = this.add.text(w * 0.85, btnY, '↻', {
      fontSize: `${Math.round(btnSize)}px`,
      color: '#ffffff',
      stroke: '#2e7d32',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(50);

    rightBtn.on('pointerdown', () => this.doRotate('cw'));

    // 键盘 A/D 旋转
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-A', () => this.doRotate('ccw'));
      this.input.keyboard.on('keydown-D', () => this.doRotate('cw'));
    }
  }

  private doRotate(direction: 'cw' | 'ccw'): void {
    if (this.isRotating) return;
    this.isRotating = true;

    if (direction === 'cw') {
      this.rotateSystem.rotateCW();
    } else {
      this.rotateSystem.rotateCCW();
    }

    this.sound.play('rotation', { volume: 0.3 });

    // 等旋转动画完成后检查合并
    this.time.delayedCall(250, () => {
      this.isRotating = false;
      this.checkMerges();
    });
  }

  private handleShoot(shape: Shape, col: number): void {
    const targetRow = this.findFarthestEmptyRow(col);

    if (targetRow === -1) {
      shape.destroy();
      this.sling.respawn();
      return;
    }

    const body = shape.getBody();
    body.setVelocity(0, 0);

    const targetPos = this.grid.cellToPixel(targetRow, col);
    const distance = Math.abs(shape.y - targetPos.y);
    const duration = Math.max(150, distance * 0.4);

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

    this.time.delayedCall(400, () => this.checkMerges());
  }
}
