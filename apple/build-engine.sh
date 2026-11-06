#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
client-nuxt/node_modules/.bin/esbuild apple/engine.ts --bundle --format=iife --global-name=BattleEngine --target=es2020 --outfile=apple/Resources/engine.js
