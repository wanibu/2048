import Phaser from 'phaser';
import { GRID_COLS, GRID_ROWS, LayoutConfig } from '../config';
import { Border } from './Border';

export class Grid {
  private scene: Phaser.Scene;
  private cells: Phaser.GameObjects.Rectangle[][] = [];
  private container: Phaser.GameObjects.Container;
  public layout: LayoutConfig;

  public data: number[][] = [];
  public borders: (Border | null)[][] = [];

  constructor(scene: Phaser.Scene, layout: LayoutConfig) {
    this.scene = scene;
    this.layout = layout;
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
        const cell = this.scene.add.rectangle(x, y, this.layout.cellSize - 4, this.layout.cellSize - 4, 0x2a2a4a, 0.6);
        cell.setStrokeStyle(2, 0x444477);
        this.cells[row][col] = cell;
        this.container.add(cell);
      }
    }
  }

  cellToPixel(row: number, col: number): { x: number; y: number } {
    return {
      x: this.layout.gridOffsetX + col * this.layout.cellSize + this.layout.cellSize / 2,
      y: this.layout.gridOffsetY + row * this.layout.cellSize + this.layout.cellSize / 2,
    };
  }

  pixelToCell(px: number, py: number): { row: number; col: number } | null {
    const col = Math.round((px - this.layout.gridOffsetX - this.layout.cellSize / 2) / this.layout.cellSize);
    const row = Math.round((py - this.layout.gridOffsetY - this.layout.cellSize / 2) / this.layout.cellSize);
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null;
    return { row, col };
  }

  colToX(col: number): number {
    return this.layout.gridOffsetX + col * this.layout.cellSize + this.layout.cellSize / 2;
  }

  getBottomY(): number {
    return this.layout.gridOffsetY + GRID_ROWS * this.layout.cellSize;
  }

  getTopY(): number {
    return this.layout.gridOffsetY;
  }

  placeBorder(row: number, col: number, value: number): Border {
    const { x, y } = this.cellToPixel(row, col);
    const border = new Border(this.scene, x, y, value, row, col, this.layout.cellSize);
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
