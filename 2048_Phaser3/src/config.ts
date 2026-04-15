// Game dimensions (matching original Construct 3 project: 640x960)
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 960;

// Grid configuration
export const GRID_COLS = 5;
export const GRID_ROWS = 5;

// 根据实际canvas尺寸动态计算网格布局
export interface LayoutConfig {
  cellSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
  width: number;
  height: number;
}

// 棋盘背景占画面宽度的比例（等比缩放基准）
export const BOARD_WIDTH_RATIO = 0.85;
// 网格在棋盘背景内部的比例（网格区域 / 棋盘背景）
export const GRID_INSIDE_RATIO = 0.67;

export function calcLayout(w: number, h: number): LayoutConfig {
  // 棋盘背景 771×771，居中页面中心，等比缩放
  const boardDisplaySize = w * BOARD_WIDTH_RATIO;
  const gridWidth = boardDisplaySize * GRID_INSIDE_RATIO;
  const cellSize = gridWidth / GRID_COLS;
  // 网格中心 = 页面中心，反推 offset
  const gridOffsetX = w / 2 - gridWidth / 2;
  const gridOffsetY = h / 2 - (GRID_ROWS * cellSize) / 2;
  return { cellSize, gridOffsetX, gridOffsetY, width: w, height: h };
}

// Shooting
export const SHOOT_SPEED = 800;

// Merge
export const MERGE_TIMER = 0.4;
export const SPAWN_NUMBER_MAX = 5;

// Difficulty
export const STONE_START_TURN = 10;
export const STONE_INTERVAL = 5;
// 每打几个糖果生成一个石头
export const STONE_SPAWN_INTERVAL = 5;
// 石头在 grid.data 中的值
export const STONE_VALUE = -1;

// Shape spritesheet: actual sprite regions from shape-sheet0.png (512x1024)
// Each entry: { x, y, w, h } — source rectangle in the spritesheet
export interface SpriteRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

// value → source region in shape-sheet0.png
// Derived from background-position values; each ball is ~131×131
export const SHAPE_REGIONS: Record<number, SpriteRegion> = {
  8192: { x: 0, y: 0, w: 132, h: 131 },
  4096: { x: 132, y: 0, w: 130, h: 131 },
  2048: { x: 262, y: 0, w: 130, h: 131 },
  1024: { x: 0, y: 133, w: 131, h: 127 },
  512: { x: 131, y: 131, w: 130, h: 129 },
  256: { x: 261, y: 256, w: 131, h: 131 },
  128: { x: 0, y: 260, w: 131, h: 131 },
  64: { x: 131, y: 260, w: 130, h: 131 },
  32: { x: 261, y: 514, w: 131, h: 131 },
  16: { x: 0, y: 514, w: 132, h: 131 },
  8: { x: 132, y: 514, w: 130, h: 131 },
  4: { x: 262, y: 770, w: 130, h: 131 },
  2: { x: 0, y: 770, w: 131, h: 131 },
  0: { x: 131, y: 770, w: 131, h: 131 },
};

// Stone sprite: first frame of border-sheet0.png
export const STONE_REGION: SpriteRegion = { x: 0, y: 0, w: 128, h: 128 };

// 棋盘背景素材：shared-0-sheet0.png 771×771
// CSS: background-position: -781px 24px（x=-781px, y=24px 固定不变）
export const BOARD_BG_REGION: SpriteRegion = { x: 781, y: -24, w: 771, h: 771 };

// 底座背景素材：shared-0-sheet0.png (1026×261)
export const BASE_BG_REGION: SpriteRegion = { x: 768, y: 752, w: 1026, h: 261 };

// 旋转按钮素材：shared-0-sheet2.png (133×117)，左旋转原图，右旋转水平翻转
export const ROTATE_BTN_REGION: SpriteRegion = { x: 254, y: 770, w: 133, h: 117 };

// All shootable values (0 is the blank/empty shape)
export const SHAPE_VALUES = [8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2];

// Sling sprite regions from shared-0-sheet1.png (258×163 each)
export const SLING_REGIONS: SpriteRegion[] = [
  { x: 0, y: 1284, w: 258, h: 163 }, // state 1: relaxed
  { x: 0, y: 1026, w: 258, h: 163 }, // state 2: light pull
  { x: 512, y: 1026, w: 258, h: 163 }, // state 3: half pull
  { x: 0, y: 1539, w: 258, h: 163 }, // state 4: full pull
];

// Column highlight from shared-0-sheet1.png (132×816)
export const COL_HIGHLIGHT_REGION: SpriteRegion = { x: 846, y: 0, w: 132, h: 816 };

// Giant head animation frames (421×610 each)
// 睁眼闭眼动画帧（全部来自shared0合并图）
// 顺序：睁眼 → 过渡 → 过渡 → 闭眼
export const GIANT_HEAD_FRAMES: { texture: string; region: SpriteRegion }[] = [
  { texture: 'shared0', region: { x: 1622, y: 1025, w: 420, h: 611 } }, // blink-1: 睁眼
  { texture: 'shared0', region: { x: 4, y: 2023, w: 420, h: 611 } }, // blink-2
  { texture: 'shared0', region: { x: 427, y: 2023, w: 420, h: 611 } }, // blink-3
  { texture: 'shared0', region: { x: 4, y: 1027, w: 420, h: 611 } }, // blink-4: 闭眼
];
