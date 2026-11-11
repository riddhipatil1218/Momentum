#!/usr/bin/env bash
# build.sh — assembles the claude.ai prototype into build/prototype:
# a copy of app/ with the prototype page and its sample-data script added.
# Usage (from the repo root): bash tools/prototype/build.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
rm -rf build/prototype
mkdir -p build/prototype
cp -R app/. build/prototype/
rm build/prototype/sw.js build/prototype/manifest.webmanifest   # not used in the preview
cp tools/prototype/index.html tools/prototype/prototype.js build/prototype/
echo "Prototype ready in build/prototype"
