#!/bin/sh
# Container start-up: make sure node_modules matches package-lock.json, then run the command.
#
# node_modules lives in a Docker volume that survives rebuilds, so after someone adds or
# removes a package it can be out of date. We store a fingerprint (hash) of the lockfile
# next to the installed packages and reinstall whenever the lockfile no longer matches.
set -e

HASH_FILE=node_modules/.package-lock.sha256
CURRENT_HASH=$(sha256sum package-lock.json | cut -d ' ' -f 1)

if [ "$(cat "$HASH_FILE" 2>/dev/null)" != "$CURRENT_HASH" ]; then
  echo "package-lock.json changed: reinstalling dependencies..."
  npm ci --no-audit --no-fund
  echo "$CURRENT_HASH" > "$HASH_FILE"
fi

exec "$@"
