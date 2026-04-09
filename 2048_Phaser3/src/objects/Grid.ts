import Phaser from 'phaser';
import { GRID_COLS, GRID_ROWS, CELL_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y } from '../config';
import { Border } from './Border';

export class Grid {
  private scene: Phaser.Scene;
  private cells: Phaser.GameObjects.Rectangle[][] = [];
  private container: Phaser.GameObjects.Container;

  // Data layer: 0 = empty, positive = block value, -1 = stone
  public data: number[][] = [];
  // Visual layer: Border objects on the grid
  public borders: (Border | null)[][] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.initData();
    this.drawGrid();
  }

  private initData(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      this.data[row] = [];
      this.borders[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        this.data[row][col] = 0;
        this.borders[row][col] = null;
      }
    }
  }

  private drawGrid(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      this.cells[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        const { x, y } = this.cellToPixel(row, col);
        const cell = this.scene.add.rectangle(x, y, CELL_SIZE - 4, CELL_SIZE - 4, 0x2a2a4a, 0.6);
        cell.setStrokeStyle(2, 0x444477);
        this.cells[row][col] = cell;
        this.container.add(cell);
      }
    }
  }

  cellToPixel(row: number, col: number): { x: number; y: number } {
    return {
      x: GRID_OFFSET_X + col * CELL_SIZE + CELL_SIZE / 2,
      y: GRID_OFFSET_Y + row * CELL_SIZE + CELL_SIZE / 2,
    };
  }

  pixelToCell(px: number, py: number): { row: number; col: number } | null {
    const col = Math.round((px - GRID_OFFSET_X - CELL_SIZE / 2) / CELL_SIZE);
    const row = Math.round((py - GRID_OFFSET_Y - CELL_SIZE / 2) / CELL_SIZE);
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null;
    return { row, col };
  }

  colToX(col: number): number {
    return GRID_OFFSET_X + col * CELL_SIZE + CELL_SIZE / 2;
  }

  getBottomY(): number {
    return GRID_OFFSET_Y + GRID_ROWS * CELL_SIZE;
  }

  getTopY(): number {
    return GRID_OFFSET_Y;
  }

  placeBorder(row: number, col: number, value: number): Border {
    const { x, y } = this.cellToPixel(row, col);
    const border = new Border(this.scene, x, y, value, row, col);
    this.data[row][col] = value;
    this.borders[row][col] = border;
    this.container.add(border);
    return border;
  }

  removeBorder(row: number, col: number): void {
    const border = this.borders[row][col];
    if (border) {
      border.destroy();
      this.borders[row][col] = null;
      this.data[row][col] = 0;
    }
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }
}
