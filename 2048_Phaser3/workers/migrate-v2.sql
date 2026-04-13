-- V2: 序列配置 + 局管理增强
ALTER TABLE games ADD COLUMN user_id TEXT DEFAULT '';
ALTER TABLE games ADD COLUMN sequence_config TEXT DEFAULT '';
ALTER TABLE games ADD COLUMN sequence TEXT DEFAULT '[]';
ALTER TABLE games ADD COLUMN end_reason TEXT DEFAULT '';
ALTER TABLE games ADD COLUMN ended_at TEXT DEFAULT '';
ALTER TABLE games ADD COLUMN last_update_at TEXT DEFAULT '';
