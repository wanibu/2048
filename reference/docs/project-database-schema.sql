PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS scores;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS generated_sequences;
DROP TABLE IF EXISTS sequence_plan_stages;
DROP TABLE IF EXISTS sequence_plans;
DROP TABLE IF EXISTS stages;

CREATE TABLE stages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  length INTEGER NOT NULL CHECK (length > 0),
  probabilities TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sequence_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sequence_plan_stages (
  id TEXT PRIMARY KEY,
  sequence_plan_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  stage_order INTEGER NOT NULL CHECK (stage_order > 0),
  created_at TEXT NOT NULL,
  FOREIGN KEY (sequence_plan_id) REFERENCES sequence_plans(id),
  FOREIGN KEY (stage_id) REFERENCES stages(id),
  UNIQUE (sequence_plan_id, stage_order)
);

CREATE TABLE generated_sequences (
  id TEXT PRIMARY KEY,
  sequence_plan_id TEXT NOT NULL,
  sequence_data TEXT NOT NULL,
  sequence_length INTEGER NOT NULL CHECK (sequence_length > 0),
  status TEXT NOT NULL CHECK (status IN ('enabled', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (sequence_plan_id) REFERENCES sequence_plans(id)
);

CREATE TABLE games (
  game_id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  seed INTEGER NOT NULL,
  step INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  sign TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'playing',
  sequence_plan_id TEXT,
  generated_sequence_id TEXT,
  end_reason TEXT NOT NULL DEFAULT '',
  ended_at TEXT NOT NULL DEFAULT '',
  last_update_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (sequence_plan_id) REFERENCES sequence_plans(id),
  FOREIGN KEY (generated_sequence_id) REFERENCES generated_sequences(id)
);

CREATE INDEX idx_games_fingerprint ON games(fingerprint);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_sequence_plan_id ON games(sequence_plan_id);
CREATE INDEX idx_games_generated_sequence_id ON games(generated_sequence_id);

CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  score INTEGER NOT NULL,
  actions_count INTEGER NOT NULL,
  sign TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(game_id)
);

CREATE INDEX idx_scores_score ON scores(score DESC);
CREATE INDEX idx_scores_game_id ON scores(game_id);

INSERT INTO stages (id, name, length, probabilities, created_at, updated_at) VALUES
  ('stage_a_001', 'A', 30, '{"2":25,"4":25,"8":10,"16":10,"32":8,"64":7,"128":5,"256":5,"stone":5}', '2026-04-16 10:00:00', '2026-04-16 10:00:00'),
  ('stage_b_001', 'B', 30, '{"2":20,"4":20,"8":10,"16":10,"32":8,"64":7,"128":7,"256":6,"512":5,"1024":3,"stone":4}', '2026-04-16 10:05:00', '2026-04-16 10:05:00'),
  ('stage_c_001', 'C', 30, '{"4":18,"8":10,"16":9,"32":8,"64":8,"128":8,"256":7,"512":7,"1024":6,"2048":5,"4096":4,"8192":3,"stone":7}', '2026-04-16 10:10:00', '2026-04-16 10:10:00'),
  ('stage_d_001', 'D', 30, '{"16":12,"32":12,"64":12,"128":11,"256":10,"512":10,"1024":9,"2048":8,"4096":6,"8192":5,"stone":5}', '2026-04-16 10:15:00', '2026-04-16 10:15:00');

INSERT INTO sequence_plans (id, name, description, created_at, updated_at) VALUES
  ('plan_001', 'plan1', '标准四阶段玩法方案', '2026-04-16 11:00:00', '2026-04-16 11:00:00'),
  ('plan_002', 'plan2', 'A+C 组合实验方案', '2026-04-16 11:10:00', '2026-04-16 11:10:00');

INSERT INTO sequence_plan_stages (id, sequence_plan_id, stage_id, stage_order, created_at) VALUES
  ('ps_001', 'plan_001', 'stage_a_001', 1, '2026-04-16 11:01:00'),
  ('ps_002', 'plan_001', 'stage_b_001', 2, '2026-04-16 11:01:00'),
  ('ps_003', 'plan_001', 'stage_c_001', 3, '2026-04-16 11:01:00'),
  ('ps_004', 'plan_001', 'stage_d_001', 4, '2026-04-16 11:01:00'),
  ('ps_005', 'plan_002', 'stage_a_001', 1, '2026-04-16 11:11:00'),
  ('ps_006', 'plan_002', 'stage_c_001', 2, '2026-04-16 11:11:00');

INSERT INTO generated_sequences (id, sequence_plan_id, sequence_data, sequence_length, status, created_at, updated_at) VALUES
  ('gs_0001', 'plan_001', '[2,4,2,8,16,4,2,"stone",32,4,64,8,2,16,4,2,8,32,4,2,16,64,4,2,8,128,4,2,16,256,2,4,8,16,32,64,128,256,512,4,2,8,16,"stone",32,64,128,256,1024,4,2,8,16,32,64,128,256,512,4,4,8,16,32,64,128,256,512,1024,2048,"stone",64,128,256,512,1024,2048,4096,8,16,32,64,128,256,512,1024,2048,4096,8192,16,32,64,128,256,512,1024,2048,4096,8192,"stone",64,128,256,512,1024,2048,4096,8192,32,64,128,256,512,1024,2048,4096,8192,16,32,64]', 120, 'enabled', '2026-04-16 12:00:00', '2026-04-16 12:00:00'),
  ('gs_0002', 'plan_001', '[4,2,4,8,16,2,4,8,32,"stone",64,4,2,8,16,32,64,128,256,4,2,8,16,32,64,128,256,512,1024,4,8,16,32,64,128,256,512,1024,2048,4,8,16,32,64,128,256,512,"stone",1024,2048,4096,8,16,32,64,128,256,512,1024,2048,4096,8192,16,32,64,128,256,512,1024,2048,4096,"stone",8192,64,128,256,512,1024,2048,4096,8192,32,64,128,256,512,1024,2048,4096,8192,16,32,64,128,256,512,1024,2048,4096,8192,32,64,128,"stone",256,512,1024,2048,4096,8192,64,128,256,512,1024]', 120, 'enabled', '2026-04-16 12:05:00', '2026-04-16 12:05:00'),
  ('gs_1001', 'plan_002', '[2,4,2,8,16,4,2,"stone",32,4,64,8,2,16,4,2,8,32,4,2,16,64,4,2,8,128,4,2,16,256,4,8,16,32,64,128,256,512,1024,2048,4,8,16,32,64,128,256,"stone",512,1024,2048,4096,8,16,32,64,128,256,512,1024,2048,4096,8192,16,32,64,128,256,512,1024,2048,4096,8192,64,128,256,512,"stone",1024,2048,4096,8192,32,64,128,256,512,1024,2048,4096,8192,16,32,64,128,256,512,1024,2048,4096,8192]', 100, 'enabled', '2026-04-16 12:10:00', '2026-04-16 12:10:00');

INSERT INTO games (game_id, fingerprint, user_id, seed, step, score, sign, status, sequence_plan_id, generated_sequence_id, end_reason, ended_at, last_update_at, created_at) VALUES
  ('g_demo_001', 'fp_user_a', 'user_a', 123456789, 28, 4096, 'sign_demo_001', 'finished', 'plan_001', 'gs_0001', 'gameover', '2026-04-16 12:40:00', '2026-04-16 12:40:00', '2026-04-16 12:15:00'),
  ('g_demo_002', 'fp_user_b', 'user_b', 987654321, 41, 8192, 'sign_demo_002', 'finished', 'plan_001', 'gs_0001', 'gameover', '2026-04-16 12:55:00', '2026-04-16 12:55:00', '2026-04-16 12:20:00'),
  ('g_demo_003', 'fp_user_c', 'user_c', 246813579, 19, 2048, 'sign_demo_003', 'playing', 'plan_002', 'gs_1001', '', '', '2026-04-16 12:58:00', '2026-04-16 12:30:00');

INSERT INTO scores (game_id, fingerprint, score, actions_count, sign, created_at) VALUES
  ('g_demo_001', 'fp_user_a', 4096, 28, 'sign_demo_001', '2026-04-16 12:40:00'),
  ('g_demo_002', 'fp_user_b', 8192, 41, 'sign_demo_002', '2026-04-16 12:55:00');
