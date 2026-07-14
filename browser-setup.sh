#!/bin/bash
# Install and run Chromium + noVNC in GitHub Codespace
# This gives you a real browser accessible via the Codespace port forwarding

set -e

echo "=== Installing virtual browser dependencies ==="
sudo apt-get update -qq
sudo apt-get install -y -qq \
  xvfb \
  chromium-browser \
  x11vnc \
  novnc \
  websockify \
  fluxbox \
  fonts-ipafont-gothic \
  fonts-wqy-zenhei \
  fonts-thai-tlwg \
  fonts-kacst \
  fonts-freefont-ttf \
  xfonts-base \
  xfonts-100dpi \
  xfonts-75dpi \
  xfonts-scalable \
  > /dev/null 2>&1

echo "=== Starting Xvfb (virtual display) ==="
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99

sleep 1

echo "=== Starting Fluxbox window manager ==="
fluxbox &
sleep 1

echo "=== Starting x11vnc ==="
x11vnc -display :99 -forever -nopw -shared -rfbport 5900 &
sleep 1

echo "=== Starting noVNC on port 6080 ==="
websockify --web /usr/share/novnc 6080 localhost:5900 &
sleep 1

echo "=== Starting Chromium ==="
chromium-browser \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --disable-software-rasterizer \
  --remote-debugging-port=9222 \
  --window-size=1920,1080 \
  --user-data-dir=/tmp/chrome-profile \
  "about:blank" &

sleep 2

echo ""
echo "============================================"
echo "  VIRTUAL BROWSER IS RUNNING!"
echo "============================================"
echo ""
echo "  Click the 'Ports' tab in your Codespace."
echo "  Look for port 6080 and click the globe icon"
echo "  (or 'Open in Browser') to access noVNC."
echo ""
echo "  You'll see a full Chromium browser you can"
echo "  interact with — just like browser.lol!"
echo ""
echo "  The browser runs at 1920x1080 resolution."
echo "============================================"

# Keep the script running
wait
