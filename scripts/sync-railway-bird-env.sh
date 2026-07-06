#!/usr/bin/env bash
# Push Bird SMS credentials from local .env to Railway (production OTP).
# Prerequisite: npx @railway/cli login && railway link (select pure-random-instant-win)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Error: $ROOT/.env not found"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

missing=()
for var in BIRD_ACCESS_KEY BIRD_WORKSPACE_ID BIRD_CHANNEL_ID; do
  if [[ -z "${!var:-}" ]]; then
    missing+=("$var")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Error: missing in .env: ${missing[*]}"
  exit 1
fi

echo "Setting Bird OTP variables on Railway..."
npx --yes @railway/cli variables \
  --set "BIRD_ACCESS_KEY=${BIRD_ACCESS_KEY}" \
  --set "BIRD_WORKSPACE_ID=${BIRD_WORKSPACE_ID}" \
  --set "BIRD_CHANNEL_ID=${BIRD_CHANNEL_ID}"

echo "Done. Railway will redeploy automatically."
echo "Verify: curl -s https://pure-random-instant-win-production.up.railway.app/api/health | grep otpMode"
