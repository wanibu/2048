import * as Phaser from 'phaser';
import {
  CURRENT_CANDY_DEPTH, CURRENT_CANDY_OFFSET_Y, CURRENT_CANDY_SIZE,
  GRID_COLS, SPAWN_NUMBER_MAX, SHAPE_VALUES,
  SLING_REGIONS,
  LayoutConfig, SELECTED_LINE_DISPLAY_HEIGHT, SELECTED_LINE_DISPLAY_WIDTH, SELECTED_LINE_DISPLAY_Y,
  NEXT_PREVIEW_DEPTH, NEXT_PREVIEW_SIZE, NEXT_PREVIEW_X, NEXT_PREVIEW_Y,
  SLING_DISPLAY_HEIGHT, SLING_DISPLAY_WIDTH, SLING_DISPLAY_X, SLING_DISPLAY_Y,
} from '../config';
import { Grid } from './Grid';
import { Shape } from './Shape';

export class Sling {
  private scene: Phaser.Scene;
  private grid: Grid;
  private layout: LayoutConfig;
  private currentShape: Shape | null = null;
  private selectedCol: number = 2;
  private shootAvailable: boolean = true;
  private onShootCallback: ((shape: Shape, col: number) => void) | null = null;

  private slingSprite: Phaser.GameObjects.Image;
  private slingState: number = 0;
  private colHighlight: Phaser.GameObjects.Image;
  private isDragging: boolean = false;

  private slingY: number;
  private slingH: number = 0;
  private shapeBaseY: number = 0; // 糖果球的初始Y位置
  private nextValue: number | null = null;  // 下一个糖果的值
  private nextPreview: Shape | null = null; // 下一个糖果预览显示

  getCurrentValue(): number | null {
    return this.currentShape ? this.currentShape.value : null;
  }

  constructor(scene: Phaser.Scene, grid: Grid, layout: LayoutConfig) {
    this.scene = scene;
    this.grid = grid;
    this.layout = layout;

    this.slingY = SLING_DISPLAY_Y;

    // Register texture frames for sling states
    const tex = scene.textures.get('shared1');
    for (let i = 0; i < SLING_REGIONS.length; i++) {
      const r = SLING_REGIONS[i];
      if (!tex.has(`sling_${i}`)) {
        tex.add(`sling_${i}`, 0, r.x, r.y, r.w, r.h);
      }
    }

    if (!tex.has('sling-default')) {
      tex.add('sling-default', 0, 1, 1281, 256, 160);
    }

    // Register column highlight frame using the same crop as GameScene's static SelectedLineO.
    if (!tex.has('selected-line-o')) {
      tex.add('selected-line-o', 0, 847, 1, 128, 808);
    }

    // Column highlight
    const hlX = grid.colToLocalX(this.selectedCol);
    const hlY = SELECTED_LINE_DISPLAY_Y - layout.boardCenterY;
    this.colHighlight = scene.add.image(hlX, hlY, 'shared1', 'selected-line-o');
    this.colHighlight.setOrigin(0.5, 0.5);
    this.colHighlight.setDisplaySize(SELECTED_LINE_DISPLAY_WIDTH, SELECTED_LINE_DISPLAY_HEIGHT);
    // this.colHighlight.setAlpha(0.4);
    this.colHighlight.setVisible(false);
    this.grid.addToContainer(this.colHighlight);

    // Sling sprite
    this.slingH = SLING_DISPLAY_HEIGHT;
    this.slingSprite = scene.add.image(SLING_DISPLAY_X, this.slingY, 'shared1', 'sling-default');
    this.slingSprite.setOrigin(0.5, 1);
    this.slingSprite.setDisplaySize(SLING_DISPLAY_WIDTH, this.slingH);
    this.slingSprite.setDepth(50);

    // 不自动生成糖果，等 GameScene 调用 initCandies 传入后端值
    this.setupInput();
  }

  // 由 GameScene 调用，传入后端返回的第1个和第2个糖果值
  initCandies(currentValue: number, nextValue: number | null): void {
    this.nextValue = nextValue;
    this.spawnWithValue(currentValue);
  }

  // 用指定值生成弹弓上的糖果
  private spawnWithValue(value: number): void {
    // 安全清理：确保旧糖果不残留
    if (this.currentShape && this.currentShape.active) {
      this.currentShape.destroy();
    }
    this.currentShape = null;

    const x = this.grid.colToX(this.selectedCol);
    // 糖果球初始位置：相对弹弓中心固定上移
    this.shapeBaseY = this.slingY + CURRENT_CANDY_OFFSET_Y;
    this.currentShape = new Shape(this.scene, x, this.shapeBaseY, value, CURRENT_CANDY_SIZE);
    this.currentShape.setDepth(CURRENT_CANDY_DEPTH);
    this.shootAvailable = true;
    this.setSlingState(0);

    // 更新预览
    this.updateNextPreview();
  }

  // 设置下一个糖果值（由后端返回后调用）
  setNextCandy(value: number | null): void {
    this.nextValue = value;
    this.updateNextPreview();
  }

  // 当前糖果发射成立后，立刻把 next 顶到弹弓上显示出来。
  // 但仍保持锁定状态，等 GameScene 在结算完成后解锁。
  promoteNextToCurrent(): boolean {
    const next = this.nextValue;
    if (next === null) {
      this.updateNextPreview();
      return false;
    }

    this.nextValue = null;
    this.spawnWithValue(next);
    this.shootAvailable = false;
    this.updateNextPreview();
    return true;
  }

  unlockCurrentShape(): void {
    if (this.currentShape && this.currentShape.active) {
      this.shootAvailable = true;
    }
  }

  // respawn：用 nextValue 生成当前糖果（下一个糖果等后端返回后设置）
  private spawnNextShape(): void {
    if (this.nextValue === null) {
      return;
    }
    this.spawnWithValue(this.nextValue);
  }

  // 更新底部中间的"下一个糖果"预览
  private updateNextPreview(): void {
    if (this.nextPreview && this.nextPreview.active) {
      this.nextPreview.destroy();
    }
    if (this.nextValue === null) {
      this.nextPreview = null;
      return;
    }
    this.nextPreview = new Shape(this.scene, NEXT_PREVIEW_X, NEXT_PREVIEW_Y, this.nextValue, NEXT_PREVIEW_SIZE);
    this.nextPreview.setDepth(NEXT_PREVIEW_DEPTH);
  }

  private setupInput(): void {
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.on('keydown-LEFT', () => {
        if (!this.isDragging) this.moveColumn(-1);
      });
      this.scene.input.keyboard.on('keydown-RIGHT', () => {
        if (!this.isDragging) this.moveColumn(1);
      });
      this.scene.input.keyboard.on('keydown-SPACE', () => this.shoot());
      this.scene.input.keyboard.on('keydown-UP', () => this.shoot());
    }

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // 如果点击了交互对象（如旋转按钮），不触发弹弓
      const hitObjects = this.scene.input.hitTestPointer(pointer);
      if (hitObjects.length > 0) return;
      if (!this.shootAvailable || !this.currentShape) return;
      // 只有点击弹弓移动区域才触发（网格宽度 × 弹弓上下范围）
      const pointerWorldX = this.getPointerWorldX(pointer);
      const pointerWorldY = this.getPointerWorldY(pointer);
      if (!this.isPointerInSlingArea(pointerWorldX, pointerWorldY)) return;
      this.isDragging = true;
      this.colHighlight.setVisible(true);
      this.scene.sound.play('slingshot1', { volume: 0.3 });
      this.updateDragPosition(pointerWorldX);
      this.setSlingState(1);
      this.startPullAnimation();
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.colHighlight.setVisible(true);
      this.updateDragPosition(this.getPointerWorldX(pointer));
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.colHighlight.setVisible(false);

      // 松手时始终吸附回最近列；逻辑列仍然只走 1~5 列。
      this.snapToSelectedColumn();

      if (this.currentShape) {
        this.currentShape.setY(this.shapeBaseY);
      }

      this.shoot();
    });
  }

  private isPointerInGridColumns(px: number): boolean {
    const leftEdge = this.layout.gridOffsetX;
    const rightEdge = this.layout.gridOffsetX + GRID_COLS * this.layout.cellSize;
    return px >= leftEdge && px <= rightEdge;
  }

  // 弹弓可点击区域：横向=网格宽度，纵向=弹弓上下各一个cellSize的范围
  private isPointerInSlingArea(px: number, py: number): boolean {
    if (!this.isPointerInGridColumns(px)) return false;
    const slingHitCenterY = this.slingY - this.slingH / 2;
    const topY = slingHitCenterY - this.layout.cellSize * 1.5;
    const bottomY = slingHitCenterY + this.layout.cellSize * 1.5;
    return py >= topY && py <= bottomY;
  }

  private getPointerWorldX(pointer: Phaser.Input.Pointer): number {
    return pointer.worldX ?? pointer.x;
  }

  private getPointerWorldY(pointer: Phaser.Input.Pointer): number {
    return pointer.worldY ?? pointer.y;
  }

  private getLeftmostColumnX(): number {
    return this.grid.colToX(0);
  }

  private getRightmostColumnX(): number {
    return this.grid.colToX(GRID_COLS - 1);
  }

  private getNearestColumnFromX(worldX: number): number {
    let nearestCol = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let col = 0; col < GRID_COLS; col++) {
      const distance = Math.abs(worldX - this.grid.colToX(col));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestCol = col;
      }
    }

    return nearestCol;
  }

  private updateDragPosition(pointerWorldX: number): void {
    const clampedWorldX = Phaser.Math.Clamp(
      pointerWorldX,
      this.getLeftmostColumnX(),
      this.getRightmostColumnX(),
    );
    const nearestCol = this.getNearestColumnFromX(clampedWorldX);

    this.selectedCol = nearestCol;
    this.slingSprite.setX(clampedWorldX);
    this.colHighlight.setX(this.grid.colToLocalX(nearestCol));

    if (this.currentShape) {
      this.currentShape.setX(clampedWorldX);
    }
  }

  private snapToSelectedColumn(): void {
    const snappedWorldX = this.grid.colToX(this.selectedCol);
    const snappedLocalX = this.grid.colToLocalX(this.selectedCol);

    this.slingSprite.setX(snappedWorldX);
    this.colHighlight.setX(snappedLocalX);

    if (this.currentShape) {
      this.currentShape.setX(snappedWorldX);
    }
  }

  private startPullAnimation(): void {
    // 每个状态糖果球往下移动一点，总共移动约弹弓高度
    const pullOffset = this.slingH * 0.3; // 每步下移量
    const pullSteps = [
      { delay: 0, state: 1, offset: pullOffset },
      { delay: 150, state: 2, offset: pullOffset * 2 },
      { delay: 300, state: 3, offset: pullOffset * 3 },
    ];
    for (const step of pullSteps) {
      this.scene.time.delayedCall(step.delay, () => {
        if (this.isDragging) {
          this.setSlingState(step.state);
          // 糖果球跟着往下移
          if (this.currentShape) {
            this.currentShape.setY(this.shapeBaseY + step.offset);
          }
        }
      });
    }
  }

  private setSlingState(state: number): void {
    this.slingState = state;
    this.slingSprite.setFrame(state === 0 ? 'sling-default' : `sling_${state}`);
  }

  private moveColumn(delta: number): void {
    this.selectedCol = Phaser.Math.Clamp(this.selectedCol + delta, 0, GRID_COLS - 1);
    this.updatePosition();
  }

  private updatePosition(): void {
    const worldX = this.grid.colToX(this.selectedCol);
    const localX = this.grid.colToLocalX(this.selectedCol);
    this.slingSprite.setX(worldX);
    this.colHighlight.setX(localX);
    if (this.currentShape) {
      this.currentShape.setX(worldX);
    }
  }

  private shoot(): void {
    if (!this.shootAvailable || !this.currentShape) return;
    this.shootAvailable = false;
    const shape = this.currentShape;
    this.currentShape = null;
    this.setSlingState(0);
    this.colHighlight.setVisible(false);
    if (this.onShootCallback) {
      this.onShootCallback(shape, this.selectedCol);
    }
  }

  onShoot(callback: (shape: Shape, col: number) => void): void {
    this.onShootCallback = callback;
  }

  // 发射被拒绝，糖果回到弹弓上，不换新糖果
  cancelShoot(shape: Shape): void {
    this.currentShape = shape;
    this.shootAvailable = true;
    // 把糖果移回弹弓位置
    const worldX = this.grid.colToX(this.selectedCol);
    shape.setPosition(worldX, this.shapeBaseY);
    const body = shape.getBody();
    body.setVelocity(0, 0);
    this.setSlingState(0);
  }

  respawn(): void {
    // 销毁旧的糖果（防止残留）
    if (this.currentShape) {
      this.currentShape.destroy();
      this.currentShape = null;
    }
    this.spawnNextShape();
  }
}
