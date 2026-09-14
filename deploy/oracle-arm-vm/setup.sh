#!/usr/bin/env bash
# One-shot bootstrap for the TokenPrint FastAPI backend on an Oracle Cloud
# Always-Free Ampere A1 (aarch64) VM. Run as root (sudo).
#
#   sudo bash setup.sh
#
# Requires: DNS for api.tokenprint.in already pointing at this VM's public IP
# (so Caddy can obtain a Let's Encrypt certificate), and Oracle security list /
# NSG ingress open on tcp/80 and tcp/443.
set -euo pipefail

DOMAIN="${DOMAIN:-api.tokenprint.in}"
APP_USER="${APP_USER:-ubuntu}"
REPO_URL="https://github.com/Sudharsanselvaraj/Token-Print.git"
APP_DIR="/opt/tokenprint"

log() { echo -e "[\033[1;34m*\033[0m] $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash setup.sh" >&2
  exit 1
fi

log "Updating apt + installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl ca-certificates python3-venv python3-pip

log "Installing Caddy (auto TLS for $DOMAIN)"
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

log "Cloning TokenPrint ($APP_DIR)"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone --depth 1 "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin && git -C "$APP_DIR" reset --hard origin/main
fi
mkdir -p "$APP_DIR/backend/data/gguf"

log "Creating virtualenv and installing backend requirements"
python3 -m venv "$APP_DIR/backend/.venv"
set +e
"$APP_DIR/backend/.venv/bin/pip" install --upgrade pip wheel
"$APP_DIR/backend/.venv/bin/pip" install -r "$APP_DIR/backend/requirements.txt"
RC=$?
set -e
if [[ $RC -ne 0 ]]; then
  log "requirements install failed (RC=$RC); retrying with unpinned torch (aarch64 wheel fallback)"
  "$APP_DIR/backend/.venv/bin/pip" install fastapi "uvicorn[standard]" websockets numpy python-multipart
  "$APP_DIR/backend/.venv/bin/pip" install torch transformers==4.51.3 scikit-learn==1.5.1
fi

log "Writing systemd unit (tokenprint-api)"
cat > /etc/systemd/system/tokenprint-api.service <<EOF
[Unit]
Description=TokenPrint FastAPI backend
After=network-online.target
Wants=network-online.target

[Service]
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/backend
Environment=PYTHONUNBUFFERED=1
Environment=HF_HOME=/home/$APP_USER/.cache/huggingface
ExecStart=$APP_DIR/backend/.venv/bin/uvicorn app.main:app --app-dir $APP_DIR/backend --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

log "Writing Caddyfile"
cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
    encode gzip
    reverse_proxy 127.0.0.1:8000
}
EOF

log "Starting services"
systemctl daemon-reload
systemctl enable --now tokenprint-api caddy

log "Waiting for backend to come up"
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    log "backend /health OK"
    break
  fi
  sleep 5
done

log "Pre-warming real model (first run downloads ~1GB from Hugging Face)..."
curl -sf --max-time 600 http://127.0.0.1:8000/architecture >/tmp/arch.json || echo "prewarm timed out; it will finish loading on first real request."

log "Idempotent smoke checks"
echo "--- /health ---"
curl -s http://127.0.0.1:8000/health
echo
echo "--- https://$DOMAIN/health ---"
curl -s "https://$DOMAIN/health"
echo
log "Done. The API is live at https://$DOMAIN"