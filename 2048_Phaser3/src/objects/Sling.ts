import Phaser from 'phaser';
import {
  GRID_COLS, CELL_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y, GRID_ROWS,
  SPAWN_NUMBER_MAX, SHAPE_VALUES,
  SLING_REGIONS, COL_HIGHLIGHT_REGION,
} from '../config';
import { Grid } from './Grid';
import { Shape } from './Shape';

export class Sling {
  private scene: Phaser.Scene;
  private grid: Grid;
  private currentShape: Shape | null = null;
  private selectedCol: number = 2;
  private shootAvailable: boolean = true;
  private onShootCallback: ((shape: Shape, col: number) => void) | null = null;

  // Sling sprite (4 states)
  private slingSprite: Phaser.GameObjects.Image;
  private slingState: number = 0; // 0-3

  // Column highlight
  private colHighlight: Phaser.GameObjects.Image;

  // Drag state
  private isDragging: boolean = false;
  private dragStartTime: number = 0;

  // Sling position
  private slingX: number;
  private slingY: number;

  constructor(scene: Phaser.Scene, grid: Grid) {
    this.scene = scene;
    this.grid = grid;

    this.slingX = grid.colToX(this.selectedCol);
    this.slingY = grid.getBottomY() + 80;

    // Register texture frames for sling states
    const tex = scene.textures.get('shared1');
    for (let i = 0; i < SLING_REGIONS.length; i++) {
      const r = SLING_REGIONS[i];
      tex.add(`sling_${i}`, 0, r.x, r.y, r.w, r.h);
    }

    // Register column highlight frame
    const chr = COL_HIGHLIGHT_REGION;
    tex.add('col_highlight', 0, chr.x, chr.y, chr.w, chr.h);

    // Column highlight sprite (hidden by default)
    this.colHighlight = scene.add.image(this.slingX, GRID_OFFSET_Y + (GRID_ROWS * CELL_SIZE) / 2, 'shared1', 'col_highlight');
    this.colHighlight.setDisplaySize(CELL_SIZE, GRID_ROWS * CELL_SIZE + 150);
    this.colHighlight.setAlpha(0.4);
    this.colHighlight.setDepth(5);
    this.colHighlight.setVisible(false);

    // Sling sprite
    this.slingSprite = scene.add.image(this.slingX, this.slingY, 'shared1', 'sling_0');
    this.slingSprite.setDisplaySize(130, 82);
    this.slingSprite.setDepth(50);

    this.spawnNextShape();
    this.setupInput();
  }

  private spawnNextShape(): void {
    const spawnPool = SHAPE_VALUES.slice(-SPAWN_NUMBER_MAX);
    const value = spawnPool[Phaser.Math.Between(0, spawnPool.length - 1)];
    const x = this.grid.colToX(this.selectedCol);
    this.currentShape = new Shape(this.scene, x, this.slingY - 50, value);
    this.currentShape.setDepth(40);
    this.shootAvailable = true;
    this.setSlingState(0);
  }

  private setupInput(): void {
    // Keyboard controls
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

    // Touch/mouse: press and drag
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.shootAvailable || !this.currentShape) return;

      this.isDragging = true;
      this.dragStartTime = this.scene.time.now;
      this.colHighlight.setVisible(true);

      // Play slingshot pull sound
      this.scene.sound.play('slingshot1', { volume: 0.3 });

      // Snap to nearest column
      this.updateColumnFromPointer(pointer.x);

      // Start pull animation
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
    const col = Math.round((px - GRID_OFFSET_X - CELL_SIZE / 2) / CELL_SIZE);
    const clamped = Phaser.Math.Clamp(col, 0, GRID_COLS - 1);
    if (clamped !== this.selectedCol) {
      this.selectedCol = clamped;
      this.updatePosition();
    }
  }

  private startPullAnimation(): void {
    // Animate through sling states 1→2→3 over time
    const pullSteps = [
      { delay: 0, state: 1 },
      { delay: 150, state: 2 },
      { delay: 300, state: 3 },
    ];

    for (const step of pullSteps) {
      this.scene.time.delayedCall(step.delay, () => {
        if (this.isDragging) {
          this.setSlingState(step.state);
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

    // Reset sling to relaxed
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

  getSelectedCol(): number {
    return this.selectedCol;
  }
}
