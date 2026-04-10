import Phaser from 'phaser';
import {
  GRID_COLS, SPAWN_NUMBER_MAX, SHAPE_VALUES,
  SLING_REGIONS, COL_HIGHLIGHT_REGION, GRID_ROWS,
  LayoutConfig,
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
  private nextValue: number = 0;  // 下一个糖果的值
  private nextPreview: Shape | null = null; // 下一个糖果预览显示

  constructor(scene: Phaser.Scene, grid: Grid, layout: LayoutConfig) {
    this.scene = scene;
    this.grid = grid;
    this.layout = layout;

    // 弹弓位置比网格底部往下更多
    this.slingY = grid.getBottomY() + layout.cellSize * 1.8;

    // Register texture frames for sling states
    const tex = scene.textures.get('shared1');
    for (let i = 0; i < SLING_REGIONS.length; i++) {
      const r = SLING_REGIONS[i];
      if (!tex.has(`sling_${i}`)) {
        tex.add(`sling_${i}`, 0, r.x, r.y, r.w, r.h);
      }
    }

    // Register column highlight frame
    const chr = COL_HIGHLIGHT_REGION;
    if (!tex.has('col_highlight')) {
      tex.add('col_highlight', 0, chr.x, chr.y, chr.w, chr.h);
    }

    // Column highlight
    const hlX = grid.colToX(this.selectedCol);
    this.colHighlight = scene.add.image(hlX, layout.gridOffsetY + (GRID_ROWS * layout.cellSize) / 2, 'shared1', 'col_highlight');
    this.colHighlight.setDisplaySize(layout.cellSize, GRID_ROWS * layout.cellSize + layout.cellSize * 1.5);
    this.colHighlight.setAlpha(0.4);
    this.colHighlight.setDepth(5);
    this.colHighlight.setVisible(false);

    // Sling sprite
    const slingW = layout.cellSize * 1.54;
    this.slingH = slingW * (163 / 258);
    this.slingSprite = scene.add.image(hlX, this.slingY, 'shared1', 'sling_0');
    this.slingSprite.setDisplaySize(slingW, this.slingH);
    this.slingSprite.setDepth(50);

    // 生成第一个"下一个"糖果值
    this.nextValue = this.randomValue();
    this.spawnNextShape();
    this.setupInput();
  }

  // 随机生成一个糖果值
  private randomValue(): number {
    const spawnPool = SHAPE_VALUES.slice(-SPAWN_NUMBER_MAX);
    return spawnPool[Phaser.Math.Between(0, spawnPool.length - 1)];
  }

  private spawnNextShape(): void {
    // 安全清理：确保旧糖果不残留
    if (this.currentShape && this.currentShape.active) {
      this.currentShape.destroy();
    }
    this.currentShape = null;

    // 当前弹弓上的糖果 = 之前预告的"下一个"
    const value = this.nextValue;
    const x = this.grid.colToX(this.selectedCol);
    // 糖果球初始位置在弹弓上方
    this.shapeBaseY = this.slingY - this.slingH * 0.8 + 20;
    this.currentShape = new Shape(this.scene, x, this.shapeBaseY, value, this.layout.cellSize);
    this.currentShape.setDepth(60);
    this.shootAvailable = true;
    this.setSlingState(0);

    // 生成新的"下一个"并更新预览
    this.nextValue = this.randomValue();
    this.updateNextPreview();
  }

  // 更新底部中间的"下一个糖果"预览
  private updateNextPreview(): void {
    // 清理旧预览
    if (this.nextPreview && this.nextPreview.active) {
      this.nextPreview.destroy();
    }
    // 在页面底部中间显示下一个糖果（缩小显示）
    const previewX = this.layout.width / 2;
    const previewY = this.layout.height - this.layout.cellSize * 0.5;
    const previewSize = this.layout.cellSize * 0.7;
    this.nextPreview = new Shape(this.scene, previewX, previewY, this.nextValue, previewSize);
    this.nextPreview.setDepth(100);
    this.nextPreview.setAlpha(0.8);
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
      if (!this.isPointerInSlingArea(pointer.x, pointer.y)) return;
      this.isDragging = true;
      this.colHighlight.setVisible(true);
      this.scene.sound.play('slingshot1', { volume: 0.3 });
      this.updateColumnFromPointer(pointer.x);
      this.setSlingState(1);
      this.startPullAnimation();
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      // 检查鼠标是否在5列范围内
      if (this.isPointerInGridColumns(pointer.x)) {
        this.colHighlight.setVisible(true);
        this.updateColumnFromPointer(pointer.x);
      } else {
        // 离开5列范围，隐藏光柱
        this.colHighlight.setVisible(false);
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.colHighlight.setVisible(false);

      // 只有在5列范围内松手才发射
      if (this.isPointerInGridColumns(pointer.x)) {
        this.shoot();
      } else {
        // 松手在范围外，取消发射，重置弹弓
        this.setSlingState(0);
        if (this.currentShape) {
          this.currentShape.setY(this.shapeBaseY);
        }
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
    const topY = this.slingY - this.layout.cellSize * 1.5;
    const bottomY = this.slingY + this.layout.cellSize * 1.5;
    return py >= topY && py <= bottomY;
  }

  private updateColumnFromPointer(px: number): void {
    const col = Math.round((px - this.layout.gridOffsetX - this.layout.cellSize / 2) / this.layout.cellSize);
    const clamped = Phaser.Math.Clamp(col, 0, GRID_COLS - 1);
    if (clamped !== this.selectedCol) {
      this.selectedCol = clamped;
      this.updatePosition();
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
    this.slingSprite.setFrame(`sling_${state}`);
  }

  private moveColumn(delta: number): void {
    this.selectedCol = Phaser.Math.Clamp(this.selectedCol + delta, 0, GRID_COLS - 1);
    this.updatePosition();
  }

  private updatePosition(): void {
    const x = this.grid.colToX(this.selectedCol);
    this.slingSprite.setX(x);
    this.colHighlight.setX(x);
    if (this.currentShape) {
      this.currentShape.setX(x);
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
    const x = this.grid.colToX(this.selectedCol);
    shape.setPosition(x, this.shapeBaseY);
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
    this.scene.time.delayedCall(300, () => this.spawnNextShape());
  }
}
