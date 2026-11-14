#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE_DIR="/opt/ehi-cinema"
SHARED_DIR="$BASE_DIR/shared"
BIN_DIR="$BASE_DIR/bin"
ENV_FILE="$SHARED_DIR/ehi.env"
CLOUDFLARED_VERSION="2026.11.0"
CLOUDFLARED_SHA256="51f7c68b57ed7269164075d7e789efce5b59355982f06392deeb037d982a51fd"

if [[ -z "${EHI_BOOTSTRAP_SECRET:-}" ]]; then
  echo "EHI_BOOTSTRAP_SECRET is required for the first installation" >&2
  exit 2
fi

install -d -m 755 "$BASE_DIR" "$BASE_DIR/releases" "$BIN_DIR"
install -d -m 700 "$SHARED_DIR"
chown 1000:1000 "$SHARED_DIR"
install -m 755 "$REPO_DIR/deploy/server/deploy-release.sh" "$BIN_DIR/deploy-release.sh"
install -m 755 "$REPO_DIR/deploy/server/watch-release.sh" "$BIN_DIR/watch-release.sh"

if [[ ! -x /usr/local/bin/cloudflared ]]; then
  TEMP_FILE="$(mktemp /tmp/cloudflared.XXXXXX)"
  trap 'rm -f -- "$TEMP_FILE"' EXIT
  curl --fail --silent --show-error --location \
    "https://github.com/cloudflare/cloudflared/releases/download/$CLOUDFLARED_VERSION/cloudflared-linux-amd64" \
    --output "$TEMP_FILE"
  printf '%s  %s\n' "$CLOUDFLARED_SHA256" "$TEMP_FILE" | sha256sum --check
  install -m 755 "$TEMP_FILE" /usr/local/bin/cloudflared
  rm -f -- "$TEMP_FILE"
  trap - EXIT
fi

install -m 644 "$REPO_DIR/deploy/server/ehi-quick-tunnel.service" /etc/systemd/system/ehi-quick-tunnel.service
systemctl daemon-reload
systemctl enable --now ehi-quick-tunnel.service

TUNNEL_URL=""
for attempt in {1..30}; do
  TUNNEL_URL="$(journalctl -u ehi-quick-tunnel.service --no-pager -n 120 | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -n 1 || true)"
  [[ -n "$TUNNEL_URL" ]] && break
  sleep 2
done
if [[ -z "$TUNNEL_URL" ]]; then
  echo "Quick Tunnel did not publish a URL" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  umask 077
  cat > "$ENV_FILE" <<EOF
PUBLIC_ORIGIN=http://141.98.235.153
TELEGRAM_WEBHOOK_ORIGIN=$TUNNEL_URL
SESSION_SECRET=$(openssl rand -hex 48)
TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
BOOTSTRAP_SECRET=$EHI_BOOTSTRAP_SECRET
TELEGRAM_TOKEN_FILE=/run/ehi-secrets/telegram-bot-token
BOOTSTRAP_MARKER_FILE=/run/ehi-secrets/.bootstrapped
EOF
else
  sed -i 's#^PUBLIC_ORIGIN=.*#PUBLIC_ORIGIN=http://141.98.235.153#' "$ENV_FILE"
  if grep -q '^TELEGRAM_WEBHOOK_ORIGIN=' "$ENV_FILE"; then
    sed -i "s#^TELEGRAM_WEBHOOK_ORIGIN=.*#TELEGRAM_WEBHOOK_ORIGIN=$TUNNEL_URL#" "$ENV_FILE"
  else
    printf 'TELEGRAM_WEBHOOK_ORIGIN=%s\n' "$TUNNEL_URL" >> "$ENV_FILE"
  fi
fi

install -m 644 "$REPO_DIR/deploy/server/ehi-ip.nginx" /etc/nginx/sites-available/ehi-ip
ln -sfn /etc/nginx/sites-available/ehi-ip /etc/nginx/sites-enabled/ehi-ip
nginx -t
systemctl reload nginx

install -m 644 "$REPO_DIR/deploy/server/ehi-release.service" /etc/systemd/system/ehi-release.service
install -m 644 "$REPO_DIR/deploy/server/ehi-release.timer" /etc/systemd/system/ehi-release.timer
systemctl daemon-reload
systemctl enable --now ehi-release.timer

TAG="$(git -C "$REPO_DIR" describe --tags --exact-match)"
ln -sfn "$REPO_DIR" "$BASE_DIR/current"
docker compose -f "$REPO_DIR/compose.yaml" up -d --build --remove-orphans
printf '%s\n' "$TAG" > "$BASE_DIR/current-tag"

echo "EHI! CINEMA provisioned at $TUNNEL_URL"
