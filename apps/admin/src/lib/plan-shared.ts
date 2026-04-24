export const ALL_VALUES: readonly number[] = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
export const STONE_VALUE = 0;

export interface CandyColor {
  bg: string;
  dark: string;
}

export const COLOR_MAP: Record<number, CandyColor> = {
  2:    { bg: '#ff4d7a', dark: '#b01c45' },
  4:    { bg: '#ff5d8f', dark: '#c8346a' },
  8:    { bg: '#ff8a3c', dark: '#c85a1a' },
  16:   { bg: '#ff3b3b', dark: '#b02424' },
  32:   { bg: '#8e5dff', dark: '#5a2ec0' },
  64:   { bg: '#ffd23c', dark: '#b8941d' },
  128:  { bg: '#c14dff', dark: '#7e1dbb' },
  256:  { bg: '#ff4dcc', dark: '#b01c88' },
  512:  { bg: '#4ecd7a', dark: '#1f8a47' },
  1024: { bg: '#7a4a2a', dark: '#4a2a14' },
  2048: { bg: '#f4737b', dark: '#92454a' },
  4096: { bg: '#c14dff', dark: '#7e1dbb' },
  8192: { bg: '#5a3a1a', dark: '#2a1a08' },
  0:    { bg: '#a8a8b0', dark: '#606068' }, // stone
};

export type WeightKey = number | 'stone';
export type Weights = Record<string, number>;

export interface Stage {
  id?: string;
  name: string;
  length: number;
  weights: Weights;
}

export interface Plan {
  id?: string;
  name: string;
  note?: string;
  stages: Stage[];
  sequences?: unknown[];
}

export const labelOf = (v: number): string => (v === STONE_VALUE ? 'stone' : String(v));

export function expectedValue(weights: Weights): number {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let sum = 0;
  for (const [v, w] of Object.entries(weights)) {
    const numV = v === 'stone' ? 0 : Number(v);
    sum += numV * (w / total);
  }
  return sum;
}

export function normalize(weights: Weights, target = 100): Weights {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return weights;
  const out: Weights = {};
  for (const [k, w] of Object.entries(weights)) out[k] = (w / total) * target;
  return out;
}

export function evenSplit(keys: (number | string)[]): Weights {
  const out: Weights = {};
  const n = keys.length;
  if (n === 0) return out;
  keys.forEach((k) => { out[String(k)] = 100 / n; });
  return out;
}

export function genTokens(plan: Plan, seed: number): string[] {
  const tokens: string[] = [];
  let i = 0;
  const totalLen = plan.stages.reduce((a, s) => a + (s.length || 0), 0);
  for (const stage of plan.stages) {
    const keys = Object.keys(stage.weights).filter((k) => k !== 'stone').map(String);
    const vals = keys.map((k) => stage.weights[k] || 0);
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    for (let k = 0; k < stage.length; k++) {
      const r = Math.abs(Math.sin((seed + i * 31) * 1.14592)) * total;
      let acc = 0, pick = keys[0] || '2';
      for (let j = 0; j < keys.length; j++) {
        acc += vals[j];
        if (r <= acc) { pick = keys[j]; break; }
      }
      tokens.push(pick);
      i++;
    }
  }
  let stoneBudget = 0;
  for (const s of plan.stages) {
    const total = Object.values(s.weights).reduce((a, b) => a + b, 0) || 1;
    const ratio = (s.weights.stone || 0) / total;
    stoneBudget += ratio * s.length;
  }
  const stoneCount = Math.round(stoneBudget);
  if (stoneCount > 0 && totalLen > 4) {
    const interval = Math.max(1, Math.floor(totalLen / stoneCount));
    for (let n = 0; n < stoneCount; n++) {
      const pos = Math.min((n + 1) * interval - 1, totalLen - 1);
      if (pos >= 4 && pos < tokens.length) tokens[pos] = 'stone';
    }
  }
  return tokens;
}
