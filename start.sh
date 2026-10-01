#!/bin/sh
# Starts the Library app on http://localhost:3000 (macOS and Linux).
# Optional: sh start.sh 3001  (use another port)
cd "$(dirname "$0")" || exit 1
PORT="${1:-3000}"
PAGE=""
[ -f index.html ] || PAGE="design.html"
URL="http://localhost:$PORT/$PAGE"

echo ""
echo "  Library is running at $URL"
echo "  Keep this window open. Press Ctrl+C to stop."
echo ""

(
  sleep 1
  if command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  fi
) >/dev/null 2>&1 &

if command -v python3 >/dev/null 2>&1; then exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then exec python -m http.server "$PORT"
elif command -v ruby >/dev/null 2>&1; then exec ruby -run -e httpd . -p "$PORT"
elif command -v php >/dev/null 2>&1; then exec php -S "localhost:$PORT"
elif command -v npx >/dev/null 2>&1; then exec npx --yes serve -l "$PORT" .
else
  echo "No web server found. Install Python 3 (https://www.python.org) and run this again."
  exit 1
fi
