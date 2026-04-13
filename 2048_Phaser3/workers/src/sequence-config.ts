// 糖果序列生成配置
// 按步数区间设置不同的糖果出现概率

export interface WeightRange {
  stepMin: number;
  stepMax: number;
  weights: Record<number, number>; // { 2: 30, 4: 30, 8: 10 ... } 百分比
}

export interface SequenceConfig {
  id: string;
  name: string;
  ranges: WeightRange[];
}

// 默认配置
export const SEQUENCE_CONFIGS: SequenceConfig[] = [
  {
    id: 'SEQA',
    name: '标准模式',
    ranges: [
      {
        stepMin: 1, stepMax: 50,
        weights: { 2: 30, 4: 30, 8: 10, 16: 10, 32: 10, 64: 10 },
      },
      {
        stepMin: 51, stepMax: 100,
        weights: { 2: 5, 4: 5, 8: 10, 16: 15, 32: 30, 64: 20, 128: 15 },
      },
      {
        stepMin: 101, stepMax: 9999,
        weights: { 2: 5, 4: 5, 8: 5, 16: 10, 32: 20, 64: 25, 128: 20, 256: 10 },
      },
    ],
  },
  {
    id: 'SEQB',
    name: '均衡模式',
    ranges: [
      {
        stepMin: 1, stepMax: 50,
        weights: { 2: 20, 4: 20, 8: 20, 16: 13, 32: 10, 64: 10, 128: 7 },
      },
      {
        stepMin: 51, stepMax: 100,
        weights: { 2: 5, 4: 6, 8: 10, 16: 15, 32: 25, 64: 22, 128: 17 },
      },
      {
        stepMin: 101, stepMax: 9999,
        weights: { 2: 3, 4: 5, 8: 8, 16: 12, 32: 20, 64: 25, 128: 17, 256: 10 },
      },
    ],
  },
];

// 根据步数找到对应的概率配置
function getWeightsForStep(config: SequenceConfig, step: number): Record<number, number> {
  for (const range of config.ranges) {
    if (step >= range.stepMin && step <= range.stepMax) {
      return range.weights;
    }
  }
  // fallback: 用最后一个范围
  return config.ranges[config.ranges.length - 1].weights;
}

// 确定性加权随机：用 hash 值从加权列表中选
function weightedSelect(weights: Record<number, number>, hashValue: number): number {
  const entries = Object.entries(weights).map(([k, v]) => ({ value: parseInt(k), weight: v }));
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  const target = hashValue % totalWeight;

  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.weight;
    if (target < cumulative) {
      return entry.value;
    }
  }
  return entries[entries.length - 1].value;
}

// SHA-256 hash（同步版，用于 Workers 环境）
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 用 seed + step + config 确定性生成一个糖果值
export async function generateCandyWithConfig(
  seed: number, step: number, config: SequenceConfig
): Promise<number> {
  const hash = await sha256(`${seed}_${config.id}_candy_${step}`);
  const hashValue = parseInt(hash.slice(0, 8), 16);
  const weights = getWeightsForStep(config, step);
  return weightedSelect(weights, hashValue);
}

// 批量生成糖果序列
export async function generateSequence(
  seed: number, startStep: number, count: number, config: SequenceConfig
): Promise<number[]> {
  const sequence: number[] = [];
  for (let i = 0; i < count; i++) {
    const candy = await generateCandyWithConfig(seed, startStep + i, config);
    sequence.push(candy);
  }
  return sequence;
}

// 随机选一套配置
export function randomConfig(seed: number): SequenceConfig {
  const index = seed % SEQUENCE_CONFIGS.length;
  return SEQUENCE_CONFIGS[index];
}

// 根据ID获取配置
export function getConfigById(id: string): SequenceConfig | undefined {
  return SEQUENCE_CONFIGS.find(c => c.id === id);
}
