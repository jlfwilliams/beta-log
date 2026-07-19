#!/usr/bin/env bash
set -euo pipefail

# Beta Log build script
#
# Usage:
#   ./scripts/build.sh
#       -> local build. Placeholders are left in bundle.js untouched, so the
#          dev fallback in config.js (the `.startsWith("__")` check) kicks in.
#
#   SHEETS_GVIZ_URL="https://..." APPS_SCRIPT_URL="https://..." ./scripts/build.sh
#       -> prod build. Placeholders get replaced with real values.
#
# Place this at: scripts/build.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DIST_DIR="dist"

echo "==> Cleaning $DIST_DIR"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

pwd

echo "==> Copying static files"
cp index.html "$DIST_DIR/"
[ -d assets ] && cp -r assets "$DIST_DIR/" || true
[ -d styles ] && cp -r styles "$DIST_DIR/" || true
cp favicon*.png "$DIST_DIR/" 2>/dev/null || true
cp favicon.ico "$DIST_DIR/" 2>/dev/null || true

echo "==> Bundling src/*.js in dependency order"
cat \
  src/chart.umd.min.js \
  src/config.js \
  src/grades.js \
  src/store.js \
  src/nav.js \
  src/log-form.js \
  src/dashboard.js \
  src/plan.js \
  src/lock.js \
  src/footer.js \
  > "$DIST_DIR/bundle.js"

echo "==> Injecting environment values (if provided)"
if [ -n "${GVIZ_SHEET_ID:-}" ]; then
  sed -i.bak "s|GVIZ_SHEET_ID|${GVIZ_SHEET_ID}|g" "$DIST_DIR/bundle.js"
  rm -f "$DIST_DIR/bundle.js.bak"
  echo "    GVIZ_SHEET_ID injected"
else
  echo "    GVIZ_SHEET_ID not set -- leaving placeholder (dev fallback will apply)"
fi

if [ -n "${APPS_SCRIPT_URL:-}" ]; then
  sed -i.bak "s|__APPS_SCRIPT_URL__|${APPS_SCRIPT_URL}|g" "$DIST_DIR/bundle.js"
  rm -f "$DIST_DIR/bundle.js.bak"
  echo "    APPS_SCRIPT_URL injected"
else
  echo "    APPS_SCRIPT_URL not set -- leaving placeholder (dev fallback will apply)"
fi

echo "==> Rewriting index.html to load the single bundle"
sed -i.bak '/<script[^>]*src="src\//d' "$DIST_DIR/index.html"
sed -i.bak 's|</body>|  <script src="bundle.js" defer></script>\n</body>|' "$DIST_DIR/index.html"
rm -f "$DIST_DIR/index.html.bak"

echo "==> Done. Output in $DIST_DIR/"