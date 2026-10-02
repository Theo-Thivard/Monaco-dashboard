#!/usr/bin/env bash
# Construit les anciennes versions du dashboard (listées dans versions.json) dans dist/<slug>/,
# afin qu'une nouvelle version ne remplace jamais l'ancienne : chacune garde son adresse.
# Les archives sont FIGÉES : elles lisent la copie de l'Excel embarquée dans leur propre version (pas le fichier en ligne).
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
    # copie embarquée du classeur (versions qui lisent l'Excel) ; adresse « en ligne » volontairement inaccessible
    [ -f scripts/sync-model.mjs ] && node scripts/sync-model.mjs
    MODEL_LIVE_URL="http://archive.invalid/model.xlsx" npx vite build --base="$PREFIX/$slug/" --outDir "$DIST/$slug" --emptyOutDir
  )
  echo "::endgroup::"
done
