#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE_DIR="/opt/ehi-cinema"
SHARED_DIR="$BASE_DIR/shared"
BIN_DIR="$BASE_DIR/bin"
ENV_FILE="$SHARED_DIR/ehi.env"

if [[ -z "${EHI_BOOTSTRAP_SECRET:-}" ]]; then
  echo "EHI_BOOTSTRAP_SECRET is required for the first installation" >&2
  exit 2
fi

install -d -m 755 "$BASE_DIR" "$BASE_DIR/releases" "$BIN_DIR"
install -d -m 700 "$SHARED_DIR"
chown 1000:1000 "$SHARED_DIR"
install -m 755 "$REPO_DIR/deploy/server/deploy-release.sh" "$BIN_DIR/deploy-release.sh"
install -m 755 "$REPO_DIR/deploy/server/watch-release.sh" "$BIN_DIR/watch-release.sh"

if [[ ! -f "$ENV_FILE" ]]; then
  umask 077
  cat > "$ENV_FILE" <<EOF
PUBLIC_ORIGIN=https://ehi.qrayyt.ru
SESSION_SECRET=$(openssl rand -hex 48)
TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
BOOTSTRAP_SECRET=$EHI_BOOTSTRAP_SECRET
TELEGRAM_TOKEN_FILE=/run/ehi-secrets/telegram-bot-token
BOOTSTRAP_MARKER_FILE=/run/ehi-secrets/.bootstrapped
EOF
fi

install -m 644 "$REPO_DIR/deploy/server/ehi-cinema.nginx" /etc/nginx/sites-available/ehi-cinema
ln -sfn /etc/nginx/sites-available/ehi-cinema /etc/nginx/sites-enabled/ehi-cinema
nginx -t
systemctl reload nginx

if ! command -v certbot >/dev/null 2>&1; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
fi
if [[ ! -d /etc/letsencrypt/live/ehi.qrayyt.ru ]]; then
  certbot --nginx -d ehi.qrayyt.ru --non-interactive --agree-tos --register-unsafely-without-email --redirect
fi

install -m 644 "$REPO_DIR/deploy/server/ehi-release.service" /etc/systemd/system/ehi-release.service
install -m 644 "$REPO_DIR/deploy/server/ehi-release.timer" /etc/systemd/system/ehi-release.timer
systemctl daemon-reload
systemctl enable --now ehi-release.timer

TAG="$(git -C "$REPO_DIR" describe --tags --exact-match)"
ln -sfn "$REPO_DIR" "$BASE_DIR/current"
docker compose -f "$REPO_DIR/compose.yaml" up -d --build --remove-orphans
printf '%s\n' "$TAG" > "$BASE_DIR/current-tag"

echo "EHI! CINEMA provisioned at https://ehi.qrayyt.ru"
