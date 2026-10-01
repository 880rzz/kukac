const { neon } = require('@neondatabase/serverless');

let sqlClient;
let schemaPromise;

function sql() {
  if (!process.env.DATABASE_URL) {
    const err = new Error('DATABASE_URL is not configured');
    err.code = 'DB_NOT_CONFIGURED';
    throw err;
  }
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

async function ensureSchema() {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    const q = sql();
    await q`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        nickname TEXT NOT NULL,
        nickname_normalized TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        recovery_hash TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await q`
      CREATE TABLE IF NOT EXISTS player_stats (
        player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
        high_score INTEGER NOT NULL DEFAULT 0,
        highest_level INTEGER NOT NULL DEFAULT 1,
        total_games INTEGER NOT NULL DEFAULT 0,
        total_stars BIGINT NOT NULL DEFAULT 0,
        total_coins BIGINT NOT NULL DEFAULT 0,
        total_play_ms BIGINT NOT NULL DEFAULT 0,
        best_combo INTEGER NOT NULL DEFAULT 0,
        stars_recovered INTEGER NOT NULL DEFAULT 0,
        dragon_survivals INTEGER NOT NULL DEFAULT 0,
        royal_stars INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await q`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token_hash TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `;
    await q`
      CREATE INDEX IF NOT EXISTS auth_sessions_player_idx
      ON auth_sessions(player_id)
    `;
    await q`
      CREATE TABLE IF NOT EXISTS game_runs (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ,
        score INTEGER,
        level INTEGER,
        stars INTEGER,
        coins INTEGER,
        play_ms BIGINT,
        best_combo INTEGER,
        stars_recovered INTEGER,
        dragon_survivals INTEGER,
        royal_stars INTEGER,
        verified BOOLEAN,
        reject_reason TEXT
      )
    `;
    await q`
      CREATE INDEX IF NOT EXISTS game_runs_player_idx
      ON game_runs(player_id, started_at DESC)
    `;
  })().catch(err => {
    schemaPromise = null;
    throw err;
  });
  return schemaPromise;
}

module.exports = { sql, ensureSchema };
