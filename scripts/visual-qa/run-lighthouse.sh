#!/bin/bash
# Runs Lighthouse mobile against a fixed set of key pages and saves JSON reports.
# Usage: ./run-lighthouse.sh <out-dir> <cookie-file-or-empty>
set -e

OUT_DIR="$1"
COOKIE_FILE="$2"
CHROME_PATH="/Users/pass/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
BASE="https://plan.empowermint.co.za"

mkdir -p "$OUT_DIR"

EXTRA_HEADERS=""
if [ -n "$COOKIE_FILE" ] && [ -f "$COOKIE_FILE" ]; then
  COOKIE=$(cat "$COOKIE_FILE")
  EXTRA_HEADERS="--extra-headers={\"Cookie\":\"$COOKIE\"}"
fi

run() {
  local name="$1"
  local url="$2"
  local auth="$3"
  local headers=""
  if [ "$auth" = "auth" ]; then
    headers="$EXTRA_HEADERS"
  fi
  echo "Running lighthouse: $name ($url)"
  npx --yes lighthouse "$url" \
    --output=json --output-path="$OUT_DIR/$name.json" \
    --chrome-path="$CHROME_PATH" \
    --chrome-flags="--headless=new --no-sandbox" \
    --only-categories=performance,accessibility,best-practices \
    --quiet $headers 2>&1 | grep -i "error\|warn" || true
}

run "01-welcome" "$BASE/" ""
run "02-register" "$BASE/register" ""
run "03-login" "$BASE/login" ""
run "05-dashboard" "$BASE/dashboard" "auth"
run "06-calendar" "$BASE/calendar" "auth"
run "09-exam-timer-setup" "$BASE/exam-timer/setup" "auth"
run "11-focus-timer" "$BASE/timer/11f92745-c9ed-4674-a365-dce86dcdd3c4" "auth"

echo "Done."
