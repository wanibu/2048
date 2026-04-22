PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sequence_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Plan 内联 stage：每个 stage 只属于一个 plan，删 plan 级联删
CREATE TABLE IF NOT EXISTS plan_stages (
  id TEXT PRIMARY KEY,
  sequence_plan_id TEXT NOT NULL,
  stage_order INTEGER NOT NULL CHECK (stage_order > 0),
  name TEXT NOT NULL,
  length INTEGER NOT NULL CHECK (length > 0),
  probabilities TEXT NOT NULL, -- JSON: {"2":10,"4":10,...,"stone":10}
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (sequence_plan_id) REFERENCES sequence_plans(id) ON DELETE CASCADE,
  UNIQUE (sequence_plan_id, stage_order)
);

CREATE INDEX IF NOT EXISTS idx_plan_stages_plan
  ON plan_stages(sequence_plan_id);

CREATE TABLE IF NOT EXISTS generated_sequences (
  id TEXT PRIMARY KEY,
  sequence_plan_id TEXT NOT NULL,
  sequence_data TEXT NOT NULL,
  sequence_length INTEGER NOT NULL CHECK (sequence_length > 0),
  status TEXT NOT NULL CHECK (status IN ('enabled', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (sequence_plan_id) REFERENCES sequence_plans(id)
);

CREATE INDEX IF NOT EXISTS idx_generated_sequences_status
  ON generated_sequences(status);

CREATE INDEX IF NOT EXISTS idx_generated_sequences_sequence_plan_id
  ON generated_sequences(sequence_plan_id);

CREATE TABLE IF NOT EXISTS games (
  game_id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
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
  created_at TEXT NOT NULL,
  FOREIGN KEY (sequence_plan_id) REFERENCES sequence_plans(id),
  FOREIGN KEY (generated_sequence_id) REFERENCES generated_sequences(id)
);

CREATE INDEX IF NOT EXISTS idx_games_fingerprint ON games(fingerprint);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_sequence_plan_id ON games(sequence_plan_id);
CREATE INDEX IF NOT EXISTS idx_games_generated_sequence_id ON games(generated_sequence_id);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  score INTEGER NOT NULL,
  actions_count INTEGER NOT NULL DEFAULT 0,
  sign TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(game_id)
);

CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_game_id ON scores(game_id);
