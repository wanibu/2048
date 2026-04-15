import Phaser from 'phaser';
import { GRID_COLS, GRID_ROWS, STONE_VALUE, BOARD_BG_REGION, LayoutConfig } from '../config';
import { Border } from './Border';
import { Stone } from './Stone';

export class Grid {
  private scene: Phaser.Scene;
  private cells: Phaser.GameObjects.Rectangle[][] = [];
  private container: Phaser.GameObjects.Container;
  public layout: LayoutConfig;

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
    // 棋盘背景图（shared-0-sheet0.png 裁切）原尺寸771×771，居中显示
    const tex = this.scene.textures.get('shared0');
    if (!tex.has('board_bg')) {
      tex.add('board_bg', 0, BOARD_BG_REGION.x, BOARD_BG_REGION.y, BOARD_BG_REGION.w, BOARD_BG_REGION.h);
    }
    const boardScale = this.layout.width / 771; // 宽度100%铺满
    const boardBg = this.scene.add.image(this.layout.width / 2, this.layout.height / 2, 'shared0', 'board_bg');
    boardBg.setScale(boardScale);
    boardBg.setDepth(-1);
    this.container.add(boardBg);

    // // 网格格子（暂时隐藏）
    // for (let row = 0; row < GRID_ROWS; row++) {
    //   this.cells[row] = [];
    //   for (let col = 0; col < GRID_COLS; col++) {
    //     const { x, y } = this.cellToPixel(row, col);
    //     const cell = this.scene.add.rectangle(x, y, this.layout.cellSize - 4, this.layout.cellSize - 4, 0x000000, 0);
    //     this.cells[row][col] = cell;
    //     this.container.add(cell);
    //   }
    // }

    // 初始化空的cells数组（保持数据结构不报错）
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
