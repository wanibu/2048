// 糖果 token 的颜色板 — 用于 ProbabilityGrid 里的彩色圆点、徽章边框/文字
// 颜色取自截图 + 原游戏 Phaser 端配色的近似值

export const CANDY_ORDER: string[] = [
  '2', '4', '8', '16', '32',
  '64', '128', '256',
  '512', '1024', '2048',
  '4096', '8192',
  'stone',
];

export interface CandyColor {
  ball: string;   // 列头圆球颜色
  badgeBg: string;   // 已填值时的徽章背景（带透明）
  badgeText: string; // 徽章文字
  badgeBorder: string;
}

export const CANDY_COLORS: Record<string, CandyColor> = {
  '2':    { ball: '#E94560', badgeBg: '#FFE4E6', badgeText: '#BE123C', badgeBorder: '#FB7185' },
  '4':    { ball: '#EC4899', badgeBg: '#FCE7F3', badgeText: '#9D174D', badgeBorder: '#F472B6' },
  '8':    { ball: '#F97316', badgeBg: '#FFEDD5', badgeText: '#9A3412', badgeBorder: '#FB923C' },
  '16':   { ball: '#DC2626', badgeBg: '#FEE2E2', badgeText: '#991B1B', badgeBorder: '#EF4444' },
  '32':   { ball: '#8B5CF6', badgeBg: '#EDE9FE', badgeText: '#5B21B6', badgeBorder: '#A78BFA' },
  '64':   { ball: '#EAB308', badgeBg: '#FEF9C3', badgeText: '#854D0E', badgeBorder: '#FACC15' },
  '128':  { ball: '#A855F7', badgeBg: '#F3E8FF', badgeText: '#6B21A8', badgeBorder: '#C084FC' },
  '256':  { ball: '#DB2777', badgeBg: '#FCE7F3', badgeText: '#831843', badgeBorder: '#EC4899' },
  '512':  { ball: '#10B981', badgeBg: '#D1FAE5', badgeText: '#065F46', badgeBorder: '#34D399' },
  '1024': { ball: '#8B5A2B', badgeBg: '#FEF3C7', badgeText: '#78350F', badgeBorder: '#B45309' },
  '2048': { ball: '#FDE68A', badgeBg: '#FEF9C3', badgeText: '#854D0E', badgeBorder: '#FACC15' },
  '4096': { ball: '#7E22CE', badgeBg: '#F3E8FF', badgeText: '#581C87', badgeBorder: '#9333EA' },
  '8192': { ball: '#57534E', badgeBg: '#F5F5F4', badgeText: '#44403C', badgeBorder: '#78716C' },
  'stone':{ ball: '#94A3B8', badgeBg: '#F1F5F9', badgeText: '#475569', badgeBorder: '#94A3B8' },
};

export function candyLabel(key: string): string {
  return key.toUpperCase() === 'STONE' ? 'STONE' : key;
}
