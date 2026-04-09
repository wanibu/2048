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

  constructor(scene: Phaser.Scene, grid: Grid, layout: LayoutConfig) {
    this.scene = scene;
    this.grid = grid;
    this.layout = layout;

    this.slingY = grid.getBottomY() + layout.cellSize * 0.8;

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
    const slingW = layout.cellSize * 1.4;
    const slingH = slingW * (163 / 258);
    this.slingSprite = scene.add.image(hlX, this.slingY, 'shared1', 'sling_0');
    this.slingSprite.setDisplaySize(slingW, slingH);
    this.slingSprite.setDepth(50);

    this.spawnNextShape();
    this.setupInput();
  }

  private spawnNextShape(): void {
    const spawnPool = SHAPE_VALUES.slice(-SPAWN_NUMBER_MAX);
    const value = spawnPool[Phaser.Math.Between(0, spawnPool.length - 1)];
    const x = this.grid.colToX(this.selectedCol);
    this.currentShape = new Shape(this.scene, x, this.slingY - this.layout.cellSize * 0.6, value, this.layout.cellSize);
    this.currentShape.setDepth(40);
    this.shootAvailable = true;
    this.setSlingState(0);
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
      if (!this.shootAvailable || !this.currentShape) return;
      this.isDragging = true;
      this.colHighlight.setVisible(true);
      this.scene.sound.play('slingshot1', { volume: 0.3 });
      this.updateColumnFromPointer(pointer.x);
      this.setSlingState(1);
      this.startPullAnimation();
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.updateColumnFromPointer(pointer.x);
    });

    this.scene.input.on('pointerup', () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.colHighlight.setVisible(false);
      this.shoot();
    });
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
    const pullSteps = [
      { delay: 0, state: 1 },
      { delay: 150, state: 2 },
      { delay: 300, state: 3 },
    ];
    for (const step of pullSteps) {
      this.scene.time.delayedCall(step.delay, () => {
        if (this.isDragging) this.setSlingState(step.state);
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

  respawn(): void {
    this.scene.time.delayedCall(300, () => this.spawnNextShape());
  }
}
