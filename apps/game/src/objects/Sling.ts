import * as Phaser from 'phaser';
import {
  CURRENT_CANDY_DEPTH, CURRENT_CANDY_OFFSET_Y, CURRENT_CANDY_SIZE,
  GRID_COLS, GRID_ROWS, SPAWN_NUMBER_MAX, SHAPE_VALUES, SHAPE_REGIONS,
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
  private ghostSprite: Phaser.GameObjects.Image;
  private ghostValue: number | null = null;
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
    this.colHighlight.setVisible(false);
    this.grid.addToContainer(this.colHighlight);

    // Ghost preview: 半透明的当前糖果，显示在该列的落点格子（A 分支）
    // 或棋盘外 row=GRID_ROWS 位置（B 分支：列满 + 底值同值，预演直接合并）
    this.ghostSprite = scene.add.image(0, 0, 'shape-full');
    this.ghostSprite.setOrigin(0.5, 0.5);
    this.ghostSprite.setAlpha(0.5);
    this.ghostSprite.setDisplaySize(layout.cellSize, layout.cellSize);
    this.ghostSprite.setVisible(false);
    this.grid.addToContainer(this.ghostSprite);
    // 让 highlight + ghost 都排在 contentLayer 最底层，后续放置的 borders 会盖在它们上面
    this.grid.getContentLayer().sendToBack(this.ghostSprite);
    this.grid.getContentLayer().sendToBack(this.colHighlight);

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
    this.refreshAimPreview();
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
      this.refreshAimPreview();
    }
  }

  // 由 GameScene 在棋盘数据变化（合并、旋转、石头爆炸等）后调用，刷新瞄准预览
  refreshPreview(): void {
    this.refreshAimPreview();
  }

  // 计算当前 selectedCol 是否可发射，以及落点行
  // 返回 null 表示 (C) 分支：列满 + 底值不同值 → 禁止发射
  private computeAimPreview(): { row: number; isOverflow: boolean } | null {
    if (!this.shootAvailable || !this.currentShape) return null;
    const col = this.selectedCol;
    const value = this.currentShape.value;
    const data = this.grid.data;
    const rows = GRID_ROWS;

    // (A) 列入口（最底行）为空 → 找落点
    if (data[rows - 1][col] === 0) {
      for (let r = rows - 2; r >= 0; r--) {
        if (data[r][col] !== 0) {
          return { row: r + 1, isOverflow: false };
        }
      }
      // 整列空 → 落到顶行
      return { row: 0, isOverflow: false };
    }

    // (B) 列满 + 底行同值 → 棋盘外 row=GRID_ROWS 位置预演直接合并
    if (data[rows - 1][col] === value) {
      return { row: rows, isOverflow: true };
    }

    // (C) 列满 + 底行不同值 → 禁止
    return null;
  }

  private refreshAimPreview(): void {
    const preview = this.computeAimPreview();
    // 默认不显示，只有在拖动（按下）状态才显示高亮 + ghost
    if (!preview || !this.currentShape || !this.isDragging) {
      this.colHighlight.setVisible(false);
      this.ghostSprite.setVisible(false);
      return;
    }

    // ghost 帧切到当前糖果值
    const value = this.currentShape.value;
    if (this.ghostValue !== value) {
      const frameName = `shape_${value}`;
      const tex = this.scene.textures.get('shape-full');
      const region = SHAPE_REGIONS[value];
      if (region && !tex.has(frameName)) {
        tex.add(frameName, 0, region.x, region.y, region.w, region.h);
      }
      if (tex.has(frameName)) {
        this.ghostSprite.setTexture('shape-full', frameName);
        // setTexture 后 sprite 的 displayWidth/Height 会按新 frame 的原生尺寸重置 scale，
        // 所以必须再调一次 setDisplaySize 把它定到 cell 大小（否则会显示成 frame 原生 128px 的小图）
        this.ghostSprite.setDisplaySize(this.layout.cellSize, this.layout.cellSize);
        this.ghostValue = value;
      } else {
        // 无对应帧 → 不显示 ghost（保持高亮即可）
        this.ghostSprite.setVisible(false);
        this.colHighlight.setX(this.grid.colToLocalX(this.selectedCol));
        this.colHighlight.setVisible(true);
        return;
      }
    }

    // 计算 ghost 位置（local 坐标，相对于 grid container）
    const localX = this.grid.colToLocalX(this.selectedCol);
    const localY = (this.layout.gridOffsetY - this.layout.boardCenterY)
      + preview.row * this.layout.cellSize
      + this.layout.cellSize / 2;
    this.ghostSprite.setPosition(localX, localY);
    this.ghostSprite.setVisible(true);

    this.colHighlight.setX(localX);
    this.colHighlight.setVisible(true);
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
      this.scene.sound.play('slingshot1', { volume: 0.3 });
      this.updateDragPosition(pointerWorldX);
      this.setSlingState(1);
      this.startPullAnimation();
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.updateDragPosition(this.getPointerWorldX(pointer));
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.isDragging = false;

      const pointerWorldX = this.getPointerWorldX(pointer);
      const pointerWorldY = this.getPointerWorldY(pointer);
      const releasedInArea = this.isPointerInSlingArea(pointerWorldX, pointerWorldY);

      // 糖果吸附到选中列并回到基准 Y
      this.snapToSelectedColumn();
      if (this.currentShape) {
        this.currentShape.setY(this.shapeBaseY);
      }

      if (releasedInArea) {
        // 有效区内松手 → 正常发射
        this.shoot();
      } else {
        // 有效区外松手 → 静默取消，弹弓回默认状态，糖果停留等下次拖
        this.setSlingState(0);
      }
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

    if (this.currentShape) {
      this.currentShape.setX(clampedWorldX);
    }
    this.refreshAimPreview();
  }

  private snapToSelectedColumn(): void {
    const snappedWorldX = this.grid.colToX(this.selectedCol);

    this.slingSprite.setX(snappedWorldX);

    if (this.currentShape) {
      this.currentShape.setX(snappedWorldX);
    }
    this.refreshAimPreview();
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
    this.slingSprite.setX(worldX);
    if (this.currentShape) {
      this.currentShape.setX(worldX);
    }
    this.refreshAimPreview();
  }

  private shoot(): void {
    if (!this.shootAvailable || !this.currentShape) return;
    // (C) 列满 + 底值不同值 → 静默拒绝（与 C3 原版一致：SelectedLine 不显示，发射键无效）
    if (this.computeAimPreview() === null) {
      return;
    }
    this.shootAvailable = false;
    const shape = this.currentShape;
    this.currentShape = null;
    this.setSlingState(0);
    this.refreshAimPreview();
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
    this.refreshAimPreview();
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
