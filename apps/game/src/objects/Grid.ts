import * as Phaser from 'phaser';
import { GRID_COLS, GRID_ROWS, STONE_VALUE, BOARD_BG_REGION, BOARD_SCALE, LayoutConfig } from '../config';
import { Border } from './Border';
import { Stone } from './Stone';

export class Grid {
  private scene: Phaser.Scene;
  private cells: Phaser.GameObjects.Rectangle[][] = [];
  private container: Phaser.GameObjects.Container;
  private backgroundLayer: Phaser.GameObjects.Container;
  private contentLayer: Phaser.GameObjects.Container;
  private effectLayer: Phaser.GameObjects.Container;
  public layout: LayoutConfig;
  public boardBg!: Phaser.GameObjects.Image;
  private readonly debugCellGap = 8;

  public data: number[][] = [];
  public borders: (Border | null)[][] = [];
  // 石头视觉层
  public stones: (Stone | null)[][] = [];

  constructor(scene: Phaser.Scene, layout: LayoutConfig) {
    this.scene = scene;
    this.layout = layout;
    this.container = scene.add.container(layout.boardCenterX, layout.boardCenterY);
    this.backgroundLayer = scene.add.container(0, 0);
    this.contentLayer = scene.add.container(0, 0);
    this.effectLayer = scene.add.container(0, 0);
    this.container.add(this.backgroundLayer);
    this.container.add(this.contentLayer);
    this.container.add(this.effectLayer);
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
    this.boardBg = this.scene.add.image(0, 0, 'shared0', 'board_bg');
    this.boardBg.setScale(BOARD_SCALE);
    this.boardBg.setDepth(-1);
    this.backgroundLayer.add(this.boardBg);

    // 5×5 棋盘格子调试框：测试时先隐藏
    for (let row = 0; row < GRID_ROWS; row++) {
      this.cells[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        this.cells[row][col] = null as unknown as Phaser.GameObjects.Rectangle;
      }
    }
  }

  private cellToLocal(row: number, col: number): { x: number; y: number } {
    return {
      x: this.layout.gridOffsetX - this.layout.boardCenterX + col * this.layout.cellSize + this.layout.cellSize / 2,
      y: this.layout.gridOffsetY - this.layout.boardCenterY + row * this.layout.cellSize + this.layout.cellSize / 2,
    };
  }

  cellToPixel(row: number, col: number): { x: number; y: number } {
    const local = this.cellToLocal(row, col);
    return {
      x: this.container.x + local.x,
      y: this.container.y + local.y,
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

  colToLocalX(col: number): number {
    return this.layout.gridOffsetX - this.layout.boardCenterX + col * this.layout.cellSize + this.layout.cellSize / 2;
  }

  getGridCenterLocalY(): number {
    return this.layout.gridOffsetY - this.layout.boardCenterY + (GRID_ROWS * this.layout.cellSize) / 2;
  }

  getBottomY(): number {
    return this.layout.gridOffsetY + GRID_ROWS * this.layout.cellSize;
  }

  getTopY(): number {
    return this.layout.gridOffsetY;
  }

  placeBorder(row: number, col: number, value: number): Border {
    const { x, y } = this.cellToLocal(row, col);
    const border = new Border(this.scene, x, y, value, row, col, this.layout.cellSize);
    this.data[row][col] = value;
    this.borders[row][col] = border;
    this.contentLayer.add(border);
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
    const { x, y } = this.cellToLocal(row, col);
    const stone = new Stone(this.scene, x, y, row, col, this.layout.cellSize);
    this.data[row][col] = STONE_VALUE;
    this.stones[row][col] = stone;
    this.contentLayer.add(stone);
    return stone;
  }

  localCellToPixel(row: number, col: number): { x: number; y: number } {
    return this.cellToLocal(row, col);
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

  addToContainer(child: Phaser.GameObjects.GameObject): void {
    this.contentLayer.add(child);
  }

  getBackgroundLayer(): Phaser.GameObjects.Container {
    return this.backgroundLayer;
  }

  getContentLayer(): Phaser.GameObjects.Container {
    return this.contentLayer;
  }

  addToEffectLayer(child: Phaser.GameObjects.GameObject): void {
    this.effectLayer.add(child);
  }
}
