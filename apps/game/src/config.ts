// Game dimensions (matching original Construct 3 project: 640x960)
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 960;
// 桌面宽屏模式下 canvas 的 CSS 显示宽高比（width/height）
export const DESKTOP_ASPECT_RATIO = 0.462;

export const PLAY_BACKGROUND_DISPLAY_WIDTH = 958;
export const PLAY_BACKGROUND_DISPLAY_HEIGHT = 1630;
// Menu & Game 两个场景视觉一致：共用同一组背景坐标。
// data.json 原始值：Menu (-158, -314), Game (-158, -402)；这里是手动 tune 后的值。
export const PLAY_BACKGROUND_MENU_X = 0;
export const PLAY_BACKGROUND_MENU_Y = -310;
export const PLAY_BACKGROUND_GAME_X = PLAY_BACKGROUND_MENU_X;
export const PLAY_BACKGROUND_GAME_Y = PLAY_BACKGROUND_MENU_Y;

export const SLING_DISPLAY_X = 320;
export const SLING_DISPLAY_Y = 1050;
export const SLING_DISPLAY_WIDTH = 256;
export const SLING_DISPLAY_HEIGHT = 160;

// 下一颗糖果预览（位于底部 tray 中央的 candy-hole 里）
export const NEXT_PREVIEW_X = 320;
export const NEXT_PREVIEW_Y = 1115;
export const NEXT_PREVIEW_SIZE = 90;
export const NEXT_PREVIEW_DEPTH = 140;

// 弹弓上当前糖果（待发射的那颗）
export const CURRENT_CANDY_OFFSET_Y = -90;
export const CURRENT_CANDY_SIZE = 110;
export const CURRENT_CANDY_DEPTH = 140;

export const SELECTED_LINE_DISPLAY_X = 320;
export const SELECTED_LINE_DISPLAY_Y = 448;
export const SELECTED_LINE_DISPLAY_WIDTH = 128 * 0.78;
export const SELECTED_LINE_DISPLAY_HEIGHT = 808 * 0.78;

// Grid configuration
export const GRID_COLS = 5;
export const GRID_ROWS = 5;

// 根据实际canvas尺寸动态计算网格布局
export interface LayoutConfig {
  cellSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
  boardCenterX: number;
  boardCenterY: number;
  width: number;
  height: number;
}

// C3 data.json Grid instance: center=(320,420), display=630x586, origin=(0.503807,0.489768).
export const BOARD_DISPLAY_WIDTH = 630;
export const BOARD_DISPLAY_HEIGHT = 586;
export const BOARD_OFFSET_X = 0;
export const BOARD_OFFSET_Y = 0;
export const CELL_SIZE = 93.5;

export function calcLayout(w: number, h: number): LayoutConfig {
  const cellSize = CELL_SIZE;
  const gridWidth = CELL_SIZE * GRID_COLS;
  // 棋盘中心 = data.json Game 实例硬编码 (320, 420)，不随 canvas 尺寸浮动
  const boardCenterX = 320 + BOARD_OFFSET_X;
  const boardCenterY = 420 + BOARD_OFFSET_Y;
  const gridOffsetX = boardCenterX - gridWidth / 2;
  const gridOffsetY = boardCenterY - (GRID_ROWS * cellSize) / 2;
  return { cellSize, gridOffsetX, gridOffsetY, boardCenterX, boardCenterY, width: w, height: h };
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

export const STONE_DESTROY_FRAME_SIZE = 160;
export const STONE_DESTROY_CONTAINER_OFFSET_X = 0;
export const STONE_DESTROY_CONTAINER_OFFSET_Y = 0;
// 总时长 500ms ÷ 8 帧 ≈ 62.5ms/帧
export const STONE_DESTROY_FRAME_DURATION_MS = 63;
export const STONE_DESTROY_FRAME_OFFSETS = [
  { x: 50, y: 21 },
  { x: 29, y: 20 },
  { x: 21, y: 1 },
  { x: 5, y: 8 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 4 },
  { x: 0, y: 0 },
];
export const STONE_DESTROY_FRAMES: SpriteRegion[] = [
  { x: 0, y: 736, w: 256, h: 256 },
  { x: 256, y: 768, w: 256, h: 256 },
  { x: 768, y: 768, w: 256, h: 256 },
  { x: 768, y: 512, w: 256, h: 256 },
  { x: 261, y: 0, w: 256, h: 256 },
  { x: 510, y: 510, w: 256, h: 256 },
  { x: 4, y: 5, w: 256, h: 256 },
  { x: 517, y: 0, w: 256, h: 256 },
];

// mergeeffect-sheet0.png 是 512×1024，8 帧，每帧 170×170 围绕 8 个星群中心切
export const MERGE_EFFECT_FRAME_SIZE = 160;
export const MERGE_EFFECT_CONTAINER_OFFSET_X = 0;
export const MERGE_EFFECT_CONTAINER_OFFSET_Y = 0;
export const MERGE_EFFECT_FRAME_DURATION_MS = 60;
export const MERGE_EFFECT_FRAME_OFFSETS = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];
export const MERGE_EFFECT_FRAMES: SpriteRegion[] = [
  { x: 255, y: 0, w: 170, h: 170 },   // 1 右上
  { x: 25, y: 225, w: 170, h: 170 },  // 2 左中上
  { x: 175, y: 240, w: 170, h: 170 }, // 3 中上
  { x: 0, y: 455, w: 170, h: 170 },   // 4 左中
  { x: 155, y: 460, w: 170, h: 170 }, // 5 正中
  { x: 340, y: 435, w: 170, h: 170 }, // 6 右中
  { x: 0, y: 720, w: 170, h: 170 },   // 7 左下
  { x: 342, y: 730, w: 170, h: 170 }, // 8 右下
];

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

// value -> source region in border-sheet0.png.
// C3 uses Border for candies already placed inside the grid; Shape is for the projectile.
export const BORDER_REGIONS: Record<number, SpriteRegion> = {
  // 8192: { x: 1, y: 1, w: 128, h: 128 },
  8192: { x: 131, y: 1, w: 128, h: 128 },
  4096: { x: 261, y: 1, w: 128, h: 128 },
  2048: { x: 1, y: 131, w: 128, h: 128 },
  1024: { x: 131, y: 131, w: 128, h: 128 },
  512: { x: 261, y: 131, w: 128, h: 128 },
  256: { x: 1, y: 261, w: 128, h: 128 },
  128: { x: 131, y: 261, w: 128, h: 128 },
  64: { x: 261, y: 261, w: 128, h: 128 },
  32: { x: 1, y: 513, w: 128, h: 128 },
  16: { x: 131, y: 513, w: 128, h: 128 },
  8: { x: 261, y: 513, w: 128, h: 128 },
  4: { x: 1, y: 769, w: 128, h: 128 },
  2: { x: 131, y: 769, w: 128, h: 128 },
};

// Stone sprite: first frame of border-sheet0.png
export const STONE_REGION: SpriteRegion = { x: 0, y: 0, w: 128, h: 128 };

// 棋盘背景素材：shared-0-sheet0.png 771×771
// CSS: background-position: -781px 24px（x=-781px, y=24px 固定不变）
// 棋盘背景（data.json Grid Default 帧：shared-0-sheet0.png @ (770, 1, 788, 733)）
export const BOARD_BG_REGION: SpriteRegion = { x: 770, y: 1, w: 788, h: 733 };

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

export interface SpriteAnimationFrame extends SpriteRegion {
  texture: string;
  pivotX: number;
  pivotY: number;
}

// BorderExplodeAnimation: original 11-frame pink burst used by the menu title digits.
export const BORDER_EXPLODE_FRAMES: SpriteAnimationFrame[] = [
  { texture: 'borderexplode-full-2', x: 257, y: 1, w: 221, h: 221, pivotX: 0.5023, pivotY: 0.5023 },
  { texture: 'borderexplode-full-0', x: 1, y: 1, w: 258, h: 258, pivotX: 0.5, pivotY: 0.5 },
  { texture: 'borderexplode-full-1', x: 257, y: 257, w: 221, h: 236, pivotX: 0.5023, pivotY: 0.5 },
  { texture: 'borderexplode-full-0', x: 1, y: 261, w: 232, h: 245, pivotX: 0.5, pivotY: 0.502 },
  { texture: 'borderexplode-full-2', x: 1, y: 257, w: 208, h: 221, pivotX: 0.5, pivotY: 0.5023 },
  { texture: 'borderexplode-full-2', x: 257, y: 257, w: 200, h: 230, pivotX: 0.5, pivotY: 0.5 },
  { texture: 'borderexplode-full-1', x: 257, y: 1, w: 225, h: 242, pivotX: 0.5022, pivotY: 0.5 },
  { texture: 'borderexplode-full-1', x: 1, y: 1, w: 235, h: 233, pivotX: 0.5021, pivotY: 0.5021 },
  { texture: 'borderexplode-full-0', x: 261, y: 1, w: 250, h: 245, pivotX: 0.5, pivotY: 0.502 },
  { texture: 'borderexplode-full-0', x: 261, y: 257, w: 246, h: 245, pivotX: 0.5, pivotY: 0.502 },
  { texture: 'borderexplode-full-1', x: 1, y: 257, w: 227, h: 234, pivotX: 0.5022, pivotY: 0.5 },
];
