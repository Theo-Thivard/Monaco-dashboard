#!/usr/bin/env bash
# Construit les anciennes versions du dashboard (listées dans versions.json) dans dist/<slug>/,
# afin qu'une nouvelle version ne remplace jamais l'ancienne : chacune garde son adresse.
# Usage : scripts/build-versions.sh <dossier dist> <préfixe d'adresse, p. ex. /Monaco-dashboard>
set -euo pipefail
DIST="$(cd "$1" && pwd)"
PREFIX="${2:-/Monaco-dashboard}"
ROOT="$(git rev-parse --show-toplevel)"
WORK="$(mktemp -d)"
trap 'cd "$ROOT"; git worktree prune; rm -rf "$WORK"' EXIT

jq -c '.[]' "$ROOT/versions.json" | while read -r v; do
  slug="$(jq -r .slug <<<"$v")"
  ref="$(jq -r .ref <<<"$v")"
  echo "::group::Version $slug ($ref)"
  git -C "$ROOT" worktree add --detach "$WORK/$slug" "$ref" >/dev/null
  (
    cd "$WORK/$slug"
    npm ci --no-audit --no-fund --loglevel=error
    npx vite build --base="$PREFIX/$slug/" --outDir "$DIST/$slug" --emptyOutDir
  )
  echo "::endgroup::"
done
