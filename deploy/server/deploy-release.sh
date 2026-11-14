#!/usr/bin/env bash
set -Eeuo pipefail

TAG="${1:-}"
BASE_DIR="/opt/ehi-cinema"
RELEASES_DIR="$BASE_DIR/releases"
RELEASE_DIR="$RELEASES_DIR/$TAG"
REPOSITORY="https://github.com/Qrayyt/ehi.git"

mkdir -p "$BASE_DIR"
exec 9>"$BASE_DIR/deploy.lock"
if ! flock -n 9; then
  echo "Another EHI! CINEMA deployment is already running"
  exit 0
fi

if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+([.-][A-Za-z0-9._-]+)?$ ]]; then
  echo "Invalid release tag" >&2
  exit 2
fi

mkdir -p "$RELEASES_DIR"
if [[ ! -d "$RELEASE_DIR/.git" ]]; then
  TEMP_DIR="$(mktemp -d "$RELEASES_DIR/.incoming.XXXXXX")"
  trap 'rm -rf -- "$TEMP_DIR"' EXIT
  git clone --depth 1 --branch "$TAG" "$REPOSITORY" "$TEMP_DIR"
  mv "$TEMP_DIR" "$RELEASE_DIR"
  trap - EXIT
fi

docker compose -f "$RELEASE_DIR/compose.yaml" build --pull
docker compose -f "$RELEASE_DIR/compose.yaml" up -d --remove-orphans

for attempt in {1..24}; do
  if curl --fail --silent --max-time 3 http://127.0.0.1:3015/api/health >/dev/null; then
    ln -sfn "$RELEASE_DIR" "$BASE_DIR/current"
    printf '%s\n' "$TAG" > "$BASE_DIR/current-tag"
    find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -name 'v*' -printf '%T@ %p\n' \
      | sort -nr | tail -n +5 | cut -d' ' -f2- \
      | while IFS= read -r old_release; do
          [[ "$old_release" == "$RELEASES_DIR"/v* ]] && rm -rf -- "$old_release"
        done
    echo "Deployed $TAG"
    exit 0
  fi
  sleep 3
done

docker compose -f "$RELEASE_DIR/compose.yaml" logs --tail 80 web >&2
echo "Health check failed for $TAG" >&2
exit 1
