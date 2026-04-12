CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  score INTEGER NOT NULL,
  actions_count INTEGER NOT NULL,
  sign TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);

CREATE TABLE IF NOT EXISTS games (
  game_id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  seed INTEGER NOT NULL,
  step INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  sign TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'playing',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_games_fingerprint ON games(fingerprint);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
