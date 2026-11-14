#!/usr/bin/env bash
set -Eeuo pipefail

BASE_DIR="/opt/ehi-cinema"
LATEST_TAG="$(curl --fail --silent --show-error --max-time 15 \
  -H 'Accept: application/vnd.github+json' \
  https://api.github.com/repos/Qrayyt/ehi/releases/latest \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["tag_name"])')"
CURRENT_TAG="$(cat "$BASE_DIR/current-tag" 2>/dev/null || true)"

if [[ -n "$LATEST_TAG" && "$LATEST_TAG" != "$CURRENT_TAG" ]]; then
  "$BASE_DIR/bin/deploy-release.sh" "$LATEST_TAG"
fi
