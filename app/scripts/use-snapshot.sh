#!/usr/bin/env bash
# Bundle a real daily report (e.g. stoxx-daily.json) into the app as its offline snapshot, then build web.
set -e
cp "$1" "$(dirname "$0")/../src/data/demo-daily.json"
cd "$(dirname "$0")/.." && npx expo export --platform web && python3 scripts/single-file-preview.py dist ../preview-index.html
