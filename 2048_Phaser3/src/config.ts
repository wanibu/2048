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

export function calcLayout(w: number, h: number): LayoutConfig {
  // 网格占画面宽度的73%（原版 93.5*5/640 ≈ 73%）
  // 棋盘占画面宽度70%（缩小3%）
  const gridWidth = w * 0.52;
  const cellSize = gridWidth / GRID_COLS;
  // 网格水平居中
  const gridOffsetX = (w - gridWidth) / 2;
  // 网格顶部在画面21%处（原版 200/960 ≈ 21%）
  const gridOffsetY = h * 0.21;
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
  8192: { x: 0,   y: 0,   w: 132, h: 131 },
  4096: { x: 132, y: 0,   w: 130, h: 131 },
  2048: { x: 262, y: 0,   w: 130, h: 131 },
  1024: { x: 0,   y: 133, w: 131, h: 127 },
  512:  { x: 131, y: 131, w: 130, h: 129 },
  256:  { x: 261, y: 256, w: 131, h: 131 },
  128:  { x: 0,   y: 260, w: 131, h: 131 },
  64:   { x: 131, y: 260, w: 130, h: 131 },
  32:   { x: 261, y: 514, w: 131, h: 131 },
  16:   { x: 0,   y: 514, w: 132, h: 131 },
  8:    { x: 132, y: 514, w: 130, h: 131 },
  4:    { x: 262, y: 770, w: 130, h: 131 },
  2:    { x: 0,   y: 770, w: 131, h: 131 },
  0:    { x: 131, y: 770, w: 131, h: 131 },
};

// Stone sprite: first frame of border-sheet0.png
export const STONE_REGION: SpriteRegion = { x: 0, y: 0, w: 128, h: 128 };

// 棋盘背景素材：shared-0-sheet0.png (777×740)
export const BOARD_BG_REGION: SpriteRegion = { x: 784, y: 0, w: 777, h: 740 };

// All shootable values (0 is the blank/empty shape)
export const SHAPE_VALUES = [8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2];

// Sling sprite regions from shared-0-sheet1.png (258×163 each)
export const SLING_REGIONS: SpriteRegion[] = [
  { x: 0,   y: 1284, w: 258, h: 163 }, // state 1: relaxed
  { x: 0,   y: 1026, w: 258, h: 163 }, // state 2: light pull
  { x: 512, y: 1026, w: 258, h: 163 }, // state 3: half pull
  { x: 0,   y: 1539, w: 258, h: 163 }, // state 4: full pull
];

// Column highlight from shared-0-sheet1.png (132×816)
export const COL_HIGHLIGHT_REGION: SpriteRegion = { x: 846, y: 0, w: 132, h: 816 };

// Giant head animation frames (421×610 each)
// Order: 1-1(open eyes) → 1-2 → 1-3 → 1-4(blink) → back to 1-1
export const GIANT_HEAD_FRAMES: { texture: string; region: SpriteRegion }[] = [
  { texture: 'shared0', region: { x: 1621, y: 1027, w: 421, h: 610 } }, // 1-1: eyes open
  { texture: 'shared1', region: { x: 2.8,    y: 2.7,    w: 421, h: 610 } }, // 1-2: closing
  { texture: 'shared1', region: { x: 425.8,  y: 2.6,    w: 421, h: 610 } }, // 1-3: almost closed
  { texture: 'shared0', region: { x: 2.5,    y: 1028.5, w: 421, h: 610 } }, // 1-4: closed
];
