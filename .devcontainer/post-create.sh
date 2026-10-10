#!/usr/bin/env bash
# Runs once, after the container is created. Mirrors the CI install steps (.github/workflows/ci.yml).
set -euo pipefail

want="$(tr -d 'v\n' < .nvmrc)"
have="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$have" != "$want" ]; then
  echo "Node $have in the container, .nvmrc says $want: update the node feature in devcontainer.json." >&2
  exit 1
fi

# Named volumes are created root-owned.
sudo chown vscode:vscode node_modules /home/vscode/.cache/ms-playwright

npm ci
npx playwright install --with-deps chromium webkit
