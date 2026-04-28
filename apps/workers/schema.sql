-- 全部去掉 FOREIGN KEY，引用关系完全由代码层面控制（删除时手动级联清理）
-- 之前 PRAGMA foreign_keys = ON 也移除

CREATE TABLE IF NOT EXISTS sequence_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Plan 内联 stage：每个 stage 只属于一个 plan，删 plan 时由代码手动 DELETE plan_stages
CREATE TABLE IF NOT EXISTS plan_stages (
  id TEXT PRIMARY KEY,
  sequence_plan_id TEXT NOT NULL,
  stage_order INTEGER NOT NULL CHECK (stage_order > 0),
  name TEXT NOT NULL,
  length INTEGER NOT NULL CHECK (length > 0),
  probabilities TEXT NOT NULL, -- JSON: {"2":10,"4":10,...,"stone":10}
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (sequence_plan_id, stage_order)
);

CREATE INDEX IF NOT EXISTS idx_plan_stages_plan
  ON plan_stages(sequence_plan_id);

CREATE TABLE IF NOT EXISTS generated_sequences (
  id TEXT PRIMARY KEY,
  sequence_plan_id TEXT NOT NULL,
  sequence_name TEXT NOT NULL DEFAULT '',
  sequence_note TEXT NOT NULL DEFAULT '',
  sequence_data TEXT NOT NULL,
  sequence_length INTEGER NOT NULL CHECK (sequence_length > 0),
  status TEXT NOT NULL CHECK (status IN ('enabled', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_generated_sequences_status
  ON generated_sequences(status);

CREATE INDEX IF NOT EXISTS idx_generated_sequences_sequence_plan_id
  ON generated_sequences(sequence_plan_id);

CREATE TABLE IF NOT EXISTS games (
  game_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '',
  kol_user_id TEXT NOT NULL DEFAULT '',
  platform_id TEXT NOT NULL DEFAULT '',
  app_id TEXT NOT NULL DEFAULT '',
  token_jti TEXT NOT NULL DEFAULT '',
  seed INTEGER NOT NULL,
  step INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  sign TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'playing',
  sequence_plan_id TEXT,
  generated_sequence_id TEXT,
  sequence_index INTEGER NOT NULL DEFAULT 0,
  end_reason TEXT NOT NULL DEFAULT '',
  ended_at TEXT NOT NULL DEFAULT '',
  last_update_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_platform_user ON games(platform_id, user_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_sequence_plan_id ON games(sequence_plan_id);
CREATE INDEX IF NOT EXISTS idx_games_generated_sequence_id ON games(generated_sequence_id);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL,
  actions_count INTEGER NOT NULL DEFAULT 0,
  sign TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_game_id ON scores(game_id);

-- 用户配置表：手动录入，记录某个 user_id 应该使用哪条 sequence
-- 不限制 user_id 唯一，允许同 user_id 多条记录（使用时取第一条）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  kol_user_id TEXT NOT NULL DEFAULT '',
  user_id TEXT NOT NULL DEFAULT '',
  platform_id TEXT NOT NULL DEFAULT '',
  sequence_id TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_kol_user_id ON users(kol_user_id);

-- 全局分布表：当用户没有显式 sequence_id 配置时按 ratio 加权随机选 sequence
-- ratio 是任意正整数，按相对权重计算（不强制总和=100）
CREATE TABLE IF NOT EXISTS distribution (
  id TEXT PRIMARY KEY,
  sequence_id TEXT NOT NULL,
  ratio INTEGER NOT NULL CHECK (ratio > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_distribution_sequence_id ON distribution(sequence_id);

-- 平台 API key：上游平台调用 /game-center/game/enter 时验证
CREATE TABLE IF NOT EXISTS platform_keys (
  key TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
