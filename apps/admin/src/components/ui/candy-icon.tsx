// 复用 apps/game/public/assets/images/border-sheet0.png 作为 CSS sprite
// 原图 512×1024，4×8 网格，每帧 128×128。映射表来自 sprite-debug-border.html

const SHEET_URL = '/assets/border-sheet0.png';
const SHEET_W = 512;
const SHEET_H = 1024;

// key -> [x, y]（原图中帧左上角坐标）
const POS: Record<string, [number, number]> = {
  stone: [2, 1],
  '8192': [132, 0],
  '4096': [261, 1],
  '2048': [384, 0],
  '1024': [132, 131],
  '512': [262, 131],
  '256': [2, 260],
  '128': [132, 260],
  '64': [262, 263],
  '32': [2, 513],
  '16': [132, 514],
  '8': [262, 514],
  '4': [1, 769],
  '2': [131, 769],
};

export type CandyKey = keyof typeof POS | string;

export function candyAvailableKeys(): string[] {
  // 按常用顺序返回，从 2 开始，最后 stone
  return ['2', '4', '8', '16', '32', '64', '128', '256', '512', '1024', '2048', '4096', '8192', 'stone'];
}

export function isKnownCandy(key: string): boolean {
  return key in POS;
}

export function CandyIcon({
  value, size = 48, className,
}: {
  value: CandyKey;
  size?: number;
  className?: string;
}) {
  const pos = POS[value];
  if (!pos) {
    return (
      <div
        className={className}
        style={{ width: size, height: size, background: '#999', borderRadius: 4 }}
        title={`unknown: ${value}`}
      />
    );
  }
  const scale = size / 128;
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${SHEET_URL})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `${-pos[0] * scale}px ${-pos[1] * scale}px`,
        backgroundSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
        imageRendering: 'auto',
      }}
    />
  );
}
