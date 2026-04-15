import Phaser from 'phaser';
import { GRID_COLS, GRID_ROWS, STONE_VALUE, BOARD_BG_REGION, BOARD_WIDTH_RATIO, LayoutConfig } from '../config';
import { Border } from './Border';
import { Stone } from './Stone';

export class Grid {
  private scene: Phaser.Scene;
  private cells: Phaser.GameObjects.Rectangle[][] = [];
  private container: Phaser.GameObjects.Container;
  public layout: LayoutConfig;
  public boardBg!: Phaser.GameObjects.Image;

  public data: number[][] = [];
  public borders: (Border | null)[][] = [];
  // 石头视觉层
  public stones: (Stone | null)[][] = [];

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
      this.stones[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        this.data[row][col] = 0;
        this.borders[row][col] = null;
        this.stones[row][col] = null;
      }
    }
  }

  private drawGrid(): void {
    // 棋盘背景 771×771，固定裁切坐标(x=-786px, y=21px)，居中页面，等比缩放
    const tex = this.scene.textures.get('shared0');
    if (!tex.has('board_bg')) {
      tex.add('board_bg', 0, BOARD_BG_REGION.x, BOARD_BG_REGION.y, BOARD_BG_REGION.w, BOARD_BG_REGION.h);
    }
    this.boardBg = this.scene.add.image(this.layout.width / 2, this.layout.height / 2, 'shared0', 'board_bg');
    this.boardBg.setScale(0.80);
    this.boardBg.setDepth(-1);
    this.container.add(this.boardBg);

    // 棋盘背景四边红色边框（调试用，标识实际渲染范围）
    const bw = 771 * 0.80;
    const bh = 771 * 0.80;
    const bx = this.layout.width / 2 - bw / 2;
    const by = this.layout.height / 2 - bh / 2;
    const border = this.scene.add.rectangle(this.layout.width / 2, this.layout.height / 2, bw, bh);
    border.setStrokeStyle(2, 0xff0000, 1);
    border.setFillStyle(0x000000, 0);
    border.setDepth(999);
    this.container.add(border);

    // 中心点十字线（调试用）
    const cx = this.layout.width / 2;
    const cy = this.layout.height / 2;
    const crossSize = 20;
    const hLine = this.scene.add.line(0, 0, cx - crossSize, cy, cx + crossSize, cy, 0xff0000);
    hLine.setOrigin(0, 0);
    hLine.setLineWidth(1);
    hLine.setDepth(999);
    this.container.add(hLine);
    const vLine = this.scene.add.line(0, 0, cx, cy - crossSize, cx, cy + crossSize, 0xff0000);
    vLine.setOrigin(0, 0);
    vLine.setLineWidth(1);
    vLine.setDepth(999);
    this.container.add(vLine);

    // 网格格子（隐藏）
    for (let row = 0; row < GRID_ROWS; row++) {
      this.cells[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        this.cells[row][col] = null as unknown as Phaser.GameObjects.Rectangle;
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

  // 石头：在指定位置放置石头
  placeStone(row: number, col: number): Stone {
    const { x, y } = this.cellToPixel(row, col);
    const stone = new Stone(this.scene, x, y, row, col, this.layout.cellSize);
    this.data[row][col] = STONE_VALUE;
    this.stones[row][col] = stone;
    this.container.add(stone);
    return stone;
  }

  // 移除石头
  removeStone(row: number, col: number): void {
    const stone = this.stones[row][col];
    if (stone) {
      stone.destroy();
      this.stones[row][col] = null;
      this.data[row][col] = 0;
    }
  }

  // 判断是否是石头
  isStone(row: number, col: number): boolean {
    return this.data[row][col] === STONE_VALUE;
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }
}
