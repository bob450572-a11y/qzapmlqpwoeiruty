#!/bin/bash
# Virtual browser setup for GitHub Codespace
# Run: bash browser-setup.sh

echo "=== Installing dependencies ==="
sudo apt-get update -qq
sudo apt-get install -y -qq xvfb x11vnc novnc websockify fluxbox chromium-browser > /dev/null 2>&1

echo "=== Installing cloudflared for public URL ==="
if ! command -v cloudflared &> /dev/null; then
  wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
  chmod +x /usr/local/bin/cloudflared
fi

echo "=== Killing old processes ==="
pkill -f Xvfb 2>/dev/null; pkill -f fluxbox 2>/dev/null; pkill -f x11vnc 2>/dev/null; pkill -f websockify 2>/dev/null; pkill -f chromium 2>/dev/null
sleep 1

echo "=== Starting Xvfb ==="
Xvfb :99 -screen 0 1920x1080x24 &
sleep 1
export DISPLAY=:99

echo "=== Starting Fluxbox ==="
fluxbox &
sleep 1

echo "=== Starting x11vnc ==="
x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -noxdamage &
sleep 1

echo "=== Starting noVNC ==="
websockify --web=/usr/share/novnc 6080 localhost:5900 &
sleep 1

echo "=== Starting Chromium ==="
chromium-browser --no-sandbox --disable-gpu --disable-dev-shm-usage --window-size=1920,1080 --user-data-dir=/tmp/chrome-profile about:blank &
sleep 3

echo ""
echo "============================================"
echo "  VIRTUAL BROWSER IS RUNNING!"
echo "============================================"
echo ""
echo "  OPTION 1: Check the 'Ports' tab below."
echo "  Find port 6080 and click Open in Browser."
echo ""
echo "  OPTION 2: If Ports tab doesn't show 6080,"
echo "  run this in a NEW terminal:"
echo ""
echo "  nohup cloudflared tunnel --url http://localhost:6080 > /tmp/cf.log 2>&1 &"
echo "  sleep 8 && grep https /tmp/cf.log"
echo ""
echo "============================================"
