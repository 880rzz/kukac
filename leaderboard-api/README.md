# KUKAC Leaderboard API

Separate Vercel serverless API for optional global score submission.

Required environment variables:
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- RATE_LIMIT_SALT
- KUKAC_ORIGIN=https://kukac.vipach.at

Deploy this directory as the Vercel project root. The public game profile remains local; only explicitly submitted leaderboard results are sent here.
