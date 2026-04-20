// 预生成序列测试系统 — 序列生成逻辑
// Stage/Plan 配置存在数据库，这里只负责根据配置生成序列

export interface StageProbabilities {
  [key: string]: number; // { "2": 25, "4": 25, "stone": 5, ... } 百分比，总和=100
}

export interface StageRow {
  id: string;
  name: string;
  length: number;
  probabilities: string; // JSON string
}

export interface PlanStageRow {
  stage_id: string;
  stage_order: number;
  name: string;
  length: number;
  probabilities: string;
}

// ===== 旧的硬编码配置（兼容已有游戏） =====

export interface WeightRange {
  stepMin: number;
  stepMax: number;
  weights: Record<number, number>;
}

export interface SequenceConfig {
  id: string;
  name: string;
  ranges: WeightRange[];
}

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

function getWeightsForStep(config: SequenceConfig, step: number): Record<number, number> {
  for (const range of config.ranges) {
    if (step >= range.stepMin && step <= range.stepMax) {
      return range.weights;
    }
  }
  return config.ranges[config.ranges.length - 1].weights;
}

function weightedSelect(weights: Record<string, number>, hashValue: number): string {
  const entries = Object.entries(weights).map(([k, v]) => ({ value: k, weight: v }));
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

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ===== 旧版：确定性生成（兼容已有游戏） =====

export async function generateCandyWithConfig(
  seed: number, step: number, config: SequenceConfig
): Promise<number> {
  const hash = await sha256(`${seed}_${config.id}_candy_${step}`);
  const hashValue = parseInt(hash.slice(0, 8), 16);
  const weights = getWeightsForStep(config, step);
  // 旧版 weights 的 key 是 number，转成 string 兼容
  const strWeights: Record<string, number> = {};
  for (const [k, v] of Object.entries(weights)) strWeights[k] = v;
  return parseInt(weightedSelect(strWeights, hashValue));
}

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

export function randomConfig(seed: number): SequenceConfig {
  const index = seed % SEQUENCE_CONFIGS.length;
  return SEQUENCE_CONFIGS[index];
}

export function getConfigById(id: string): SequenceConfig | undefined {
  return SEQUENCE_CONFIGS.find(c => c.id === id);
}

// ===== 新版：从数据库 Stage 配置生成完整序列 =====

/**
 * 根据 plan 的 stages 列表，按顺序生成完整序列
 * stages 按 stage_order 排好序传入
 *
 * 石头生成规则：
 * 1. 先只用糖果概率生成纯糖果序列
 * 2. 根据石头比例计算间隔，均匀插入石头
 * 3. 前4个位置不放石头
 */
export async function generateSequenceFromPlan(
  stages: PlanStageRow[]
): Promise<string[]> {
  const sequence: string[] = [];

  for (const stage of stages) {
    const probs: StageProbabilities = JSON.parse(stage.probabilities);
    const stonePercent = probs['stone'] || 0;

    // 分离出纯糖果概率
    const candyProbs: StageProbabilities = {};
    for (const [k, v] of Object.entries(probs)) {
      if (k !== 'stone') candyProbs[k] = v;
    }

    // 重新归一化糖果概率到 100
    const candyTotal = Object.values(candyProbs).reduce((s, v) => s + v, 0);
    if (candyTotal <= 0) continue;
    const normalizedProbs: StageProbabilities = {};
    for (const [k, v] of Object.entries(candyProbs)) {
      normalizedProbs[k] = (v / candyTotal) * 100;
    }

    if (stonePercent <= 0) {
      // 没有石头，纯糖果
      for (let i = 0; i < stage.length; i++) {
        const hash = await sha256(`${stage.stage_id}_${stage.stage_order}_pos_${i}_${crypto.randomUUID()}`);
        const hashValue = parseInt(hash.slice(0, 8), 16);
        sequence.push(weightedSelect(normalizedProbs, hashValue));
      }
    } else {
      // 计算石头数量和间隔
      const stoneCount = Math.max(1, Math.round(stage.length * stonePercent / 100));
      const candyCount = stage.length - stoneCount;

      // 生成纯糖果序列
      const candies: string[] = [];
      for (let i = 0; i < candyCount; i++) {
        const hash = await sha256(`${stage.stage_id}_${stage.stage_order}_candy_${i}_${crypto.randomUUID()}`);
        const hashValue = parseInt(hash.slice(0, 8), 16);
        candies.push(weightedSelect(normalizedProbs, hashValue));
      }

      // 计算石头插入位置：均匀分布，前4个位置（在整体序列中的绝对位置）不放石头
      // interval = 总长度 / 石头数，从 interval 位置开始每隔 interval 插一个
      const interval = stage.length / stoneCount;
      const stonePositions: Set<number> = new Set();
      for (let i = 0; i < stoneCount; i++) {
        let pos = Math.round(interval * (i + 1) - 1);
        // 前4个位置不放石头（基于当前 stage 在整体序列中的偏移）
        const absolutePos = sequence.length + pos;
        if (absolutePos < 4) {
          // 往后挪到第一个 >= 4 的位置
          pos = 4 - sequence.length;
          if (pos < 0) pos = 0;
          while (stonePositions.has(pos) || (sequence.length + pos) < 4) pos++;
        }
        // 确保不超出范围且不重复
        while (pos >= stage.length || stonePositions.has(pos)) pos++;
        if (pos < stage.length) stonePositions.add(pos);
      }

      // 合并：遍历 stage.length 个位置，石头位置放 stone，其余从 candies 取
      let candyIdx = 0;
      for (let i = 0; i < stage.length; i++) {
        if (stonePositions.has(i)) {
          sequence.push('stone');
        } else {
          sequence.push(candies[candyIdx++]);
        }
      }
    }
  }

  return sequence;
}
