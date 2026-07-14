#!/bin/bash
# Virtual browser setup for GitHub Codespace
# Automatically starts Chrome, VNC, noVNC, and cloudflared tunnel
# Posts tunnel URL back to the Cloudflare Worker

WORKER_URL="https://qzapmlqpwoeiruty.bob450572.workers.dev"

echo "=== Installing dependencies ==="
sudo apt-get update -qq
sudo apt-get install -y -qq xvfb x11vnc novnc websockify fluxbox curl > /dev/null 2>&1

# Chromium: snap version is the real browser on Ubuntu 22.04+
if ! command -v google-chrome &> /dev/null && ! command -v chromium &> /dev/null; then
  echo "=== Installing Chromium ==="
  wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/chrome.deb 2>/dev/null
  sudo dpkg -i /tmp/chrome.deb 2>/dev/null
  sudo apt-get install -f -y -qq 2>/dev/null
fi

echo "=== Killing old processes ==="
pkill -f Xvfb 2>/dev/null; pkill -f fluxbox 2>/dev/null; pkill -f x11vnc 2>/dev/null; pkill -f websockify 2>/dev/null; pkill -f chrome 2>/dev/null
sleep 1

echo "=== Starting Xvfb ==="
Xvfb :99 -screen 0 1920x1080x24 &
sleep 1
export DISPLAY=:99

echo "=== Starting Fluxbox ==="
fluxbox >/dev/null 2>&1 &
sleep 1

echo "=== Starting x11vnc ==="
x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -noxdamage >/dev/null 2>&1 &
sleep 1

echo "=== Starting noVNC ==="
websockify --web=/usr/share/novnc 6080 localhost:5900 >/dev/null 2>&1 &
sleep 1

echo "=== Starting Chromium ==="
CHROME_BIN=$(command -v google-chrome 2>/dev/null || command -v chromium 2>/dev/null || command -v /snap/bin/chromium 2>/dev/null || echo "/snap/bin/chromium")
$CHROME_BIN --no-sandbox --disable-gpu --disable-dev-shm-usage --disable-software-rasterizer --window-size=1920,1080 --user-data-dir=/tmp/chrome-profile about:blank >/dev/null 2>&1 &
sleep 3

echo "=== Starting cloudflared tunnel ==="
nohup cloudflared tunnel --url http://localhost:6080 > /tmp/cf.log 2>&1 &
sleep 10

TUNNEL_URL=$(grep -o 'https://[^ ]*trycloudflare\.com' /tmp/cf.log | head -1)

echo "Tunnel URL: $TUNNEL_URL"

# Post callback to Worker with tunnel URL
CODESPACE_NAME="${CODESPACE_NAME:-unknown}"
if [ -n "$TUNNEL_URL" ] && [ "$CODESPACE_NAME" != "unknown" ]; then
  echo "=== Posting callback to Worker ==="
  curl -s -X POST "$WORKER_URL/api/session/callback" \
    -H "Content-Type: application/json" \
    -d "{\"codespaceName\":\"$CODESPACE_NAME\",\"tunnelUrl\":\"$TUNNEL_URL\"}"
  echo ""
fi

echo ""
echo "============================================"
echo "  VIRTUAL BROWSER IS RUNNING!"
echo "============================================"
echo ""
echo "  Tunnel URL: $TUNNEL_URL"
echo "  Codespace:  $CODESPACE_NAME"
echo ""
echo "============================================"
