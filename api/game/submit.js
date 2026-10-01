const { sql, ensureSchema } = require('../_lib/db');
const { json, method, requireSameOrigin } = require('../_lib/http');
const { currentPlayer, publicPlayer } = require('../_lib/auth');

function int(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

module.exports = async function handler(req, res) {
  if (!method(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  try {
    await ensureSchema();
    const player = await currentPlayer(req);
    if (!player) return json(res, 401, { error: 'auth_required' });

    const runId = String(req.body?.runId || '');
    const score = int(req.body?.score, 0, 10000000);
    const level = int(req.body?.level, 1, 10000);
    const stars = int(req.body?.stars, 0, 1000000);
    const coins = int(req.body?.coins, 0, 1000000);
    const playMs = int(req.body?.playMs, 0, 21600000);
    const bestCombo = int(req.body?.bestCombo, 0, 1000000);
    const starsRecovered = int(req.body?.starsRecovered, 0, 1000000);
    const dragonSurvivals = int(req.body?.dragonSurvivals, 0, 1000000);
    const royalStars = int(req.body?.royalStars, 0, 1000000);

    const q = sql();
    const runs = await q`
      SELECT id, started_at, finished_at
      FROM game_runs
      WHERE id = ${runId} AND player_id = ${player.id}
      LIMIT 1
    `;
    const run = runs[0];
    if (!run) return json(res, 404, { error: 'run_not_found' });
    if (run.finished_at) return json(res, 409, { error: 'run_already_submitted' });

    const serverMs = Date.now() - new Date(run.started_at).getTime();
    const maxScore = stars * 75 + coins * 30 + starsRecovered * 25 + royalStars * 80 + 250;
    const plausible =
      serverMs >= 800 &&
      serverMs <= 21600000 &&
      playMs <= serverMs + 15000 &&
      playMs >= Math.max(0, serverMs - 120000) &&
      score <= maxScore &&
      level <= Math.floor(score / 80) + 3 &&
      starsRecovered <= stars + 50 &&
      royalStars <= stars + 10;

    await q`
      UPDATE game_runs SET
        finished_at = NOW(),
        score = ${score}, level = ${level}, stars = ${stars}, coins = ${coins},
        play_ms = ${playMs}, best_combo = ${bestCombo},
        stars_recovered = ${starsRecovered}, dragon_survivals = ${dragonSurvivals},
        royal_stars = ${royalStars}, verified = ${plausible},
        reject_reason = ${plausible ? null : 'plausibility_check'}
      WHERE id = ${runId} AND player_id = ${player.id}
    `;

    if (!plausible) return json(res, 422, { error: 'score_rejected' });

    await q`
      UPDATE player_stats SET
        high_score = GREATEST(high_score, ${score}),
        highest_level = GREATEST(highest_level, ${level}),
        total_games = total_games + 1,
        total_stars = total_stars + ${stars},
        total_coins = total_coins + ${coins},
        total_play_ms = total_play_ms + ${playMs},
        best_combo = GREATEST(best_combo, ${bestCombo}),
        stars_recovered = stars_recovered + ${starsRecovered},
        dragon_survivals = dragon_survivals + ${dragonSurvivals},
        royal_stars = royal_stars + ${royalStars},
        updated_at = NOW()
      WHERE player_id = ${player.id}
    `;

    const rows = await q`
      SELECT p.id, p.nickname, p.created_at, s.*
      FROM players p JOIN player_stats s ON s.player_id = p.id
      WHERE p.id = ${player.id}
    `;
    json(res, 200, { accepted: true, player: publicPlayer(rows[0]) });
  } catch (err) {
    console.error(err);
    json(res, err.code === 'DB_NOT_CONFIGURED' ? 503 : 500, { error: err.code === 'DB_NOT_CONFIGURED' ? 'cloud_unavailable' : 'server_error' });
  }
};
