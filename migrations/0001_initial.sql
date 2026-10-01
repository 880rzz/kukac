PRAGMA foreign_keys = ON;

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  nickname_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  recovery_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE TABLE player_stats (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  high_score INTEGER NOT NULL DEFAULT 0 CHECK (high_score >= 0),
  highest_level INTEGER NOT NULL DEFAULT 1 CHECK (highest_level >= 1),
  total_games INTEGER NOT NULL DEFAULT 0 CHECK (total_games >= 0),
  total_stars INTEGER NOT NULL DEFAULT 0 CHECK (total_stars >= 0),
  total_coins INTEGER NOT NULL DEFAULT 0 CHECK (total_coins >= 0),
  total_play_ms INTEGER NOT NULL DEFAULT 0 CHECK (total_play_ms >= 0),
  best_combo INTEGER NOT NULL DEFAULT 0 CHECK (best_combo >= 0),
  stars_recovered INTEGER NOT NULL DEFAULT 0 CHECK (stars_recovered >= 0),
  dragon_survivals INTEGER NOT NULL DEFAULT 0 CHECK (dragon_survivals >= 0),
  royal_stars INTEGER NOT NULL DEFAULT 0 CHECK (royal_stars >= 0),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE TABLE auth_sessions (
  token_hash TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL
) STRICT;

CREATE INDEX auth_sessions_player_idx ON auth_sessions(player_id);
CREATE INDEX auth_sessions_expiry_idx ON auth_sessions(expires_at);

CREATE TABLE game_runs (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  finished_at INTEGER,
  score INTEGER,
  level INTEGER,
  stars INTEGER,
  coins INTEGER,
  play_ms INTEGER,
  best_combo INTEGER,
  stars_recovered INTEGER,
  dragon_survivals INTEGER,
  royal_stars INTEGER,
  verified INTEGER CHECK (verified IN (0, 1) OR verified IS NULL),
  reject_reason TEXT
) STRICT;

CREATE INDEX game_runs_player_idx ON game_runs(player_id, started_at DESC);
