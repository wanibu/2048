PRAGMA foreign_keys = ON;

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
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sequence_plan_stages (
  id TEXT PRIMARY KEY,
  sequence_plan_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
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

INSERT INTO stages (id, name, length, probabilities, created_at, updated_at) VALUES
  (
    'stage_a_001',
    'A',
    30,
    '{"2":25,"4":25,"8":10,"16":10,"32":8,"64":7,"128":5,"256":5,"stone":5}',
    '2026-04-16 10:00:00',
    '2026-04-16 10:00:00'
  ),
  (
    'stage_b_001',
    'B',
    30,
    '{"2":20,"4":20,"8":10,"16":10,"32":8,"64":7,"128":7,"256":6,"512":5,"1024":3,"stone":4}',
    '2026-04-16 10:05:00',
    '2026-04-16 10:05:00'
  ),
  (
    'stage_c_001',
    'C',
    30,
    '{"4":18,"8":10,"16":9,"32":8,"64":8,"128":8,"256":7,"512":7,"1024":6,"2048":5,"4096":4,"8192":3,"stone":7}',
    '2026-04-16 10:10:00',
    '2026-04-16 10:10:00'
  );

INSERT INTO sequence_plans (id, name, description, created_at, updated_at) VALUES
  (
    'plan_001',
    'plan1',
    '标准三阶段测试方案',
    '2026-04-16 11:00:00',
    '2026-04-16 11:00:00'
  );

INSERT INTO sequence_plan_stages (id, sequence_plan_id, stage_id, stage_order, created_at) VALUES
  ('ps_001', 'plan_001', 'stage_a_001', 1, '2026-04-16 11:01:00'),
  ('ps_002', 'plan_001', 'stage_b_001', 2, '2026-04-16 11:01:00'),
  ('ps_003', 'plan_001', 'stage_c_001', 3, '2026-04-16 11:01:00');

INSERT INTO generated_sequences (id, sequence_plan_id, sequence_data, sequence_length, status, created_at, updated_at) VALUES
  (
    'gs_0001',
    'plan_001',
    '[2,4,2,8,16,4,2,"stone",32,4,64,8,2,16,4,2,8,32,4,2,16,64,4,2,8,128,4,2,16,256,2,4,8,16,32,64,128,256,512,4,2,8,16,"stone",32,64,128,256,1024,4,2,8,16,32,64,128,256,512,4,4,8,16,32,64,128,256,512,1024,2048,"stone",64,128,256,512,1024,2048,4096,8,16,32,64,128,256,512,1024,2048,4096,8192]',
    90,
    'enabled',
    '2026-04-16 12:00:00',
    '2026-04-16 12:00:00'
  );
