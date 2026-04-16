-- V3: 预生成序列测试系统

-- 1. stages: 阶段配置
CREATE TABLE IF NOT EXISTS stages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  length INTEGER NOT NULL CHECK(length > 0),
  probabilities TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. sequence_plans: 玩法方案
CREATE TABLE IF NOT EXISTS sequence_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. sequence_plan_stages: 方案与阶段的关联（多对多，带顺序）
CREATE TABLE IF NOT EXISTS sequence_plan_stages (
  id TEXT PRIMARY KEY,
  sequence_plan_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (sequence_plan_id) REFERENCES sequence_plans(id),
  FOREIGN KEY (stage_id) REFERENCES stages(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_stage_order
  ON sequence_plan_stages(sequence_plan_id, stage_order);

-- 4. generated_sequences: 实际生成的序列（可复用测试样本）
CREATE TABLE IF NOT EXISTS generated_sequences (
  id TEXT PRIMARY KEY,
  sequence_plan_id TEXT NOT NULL,
  sequence_data TEXT NOT NULL DEFAULT '[]',
  sequence_length INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'enabled',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (sequence_plan_id) REFERENCES sequence_plans(id)
);

CREATE INDEX IF NOT EXISTS idx_gen_seq_plan ON generated_sequences(sequence_plan_id);
CREATE INDEX IF NOT EXISTS idx_gen_seq_status ON generated_sequences(status);

-- games 表新增字段：关联预生成序列
ALTER TABLE games ADD COLUMN generated_sequence_id TEXT DEFAULT '';
