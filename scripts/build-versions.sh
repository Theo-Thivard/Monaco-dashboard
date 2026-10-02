#!/usr/bin/env bash
# Construit les anciennes versions du dashboard (listées dans versions.json) dans dist/<slug>/,
# puis les AFFICHAGES enregistrés (variants/index.json) : même code que leur version, configuration enregistrée comme défaut,
# afin qu'une nouvelle version ne remplace jamais l'ancienne : chacune garde son adresse.
# Les archives sont FIGÉES : elles lisent la copie de l'Excel embarquée dans leur propre version (pas le fichier en ligne).
# Usage : scripts/build-versions.sh <dossier dist> <préfixe d'adresse, p. ex. /Monaco-dashboard>
set -euo pipefail
DIST="$(cd "$1" && pwd)"
PREFIX="${2:-/Monaco-dashboard}"
ROOT="$(git rev-parse --show-toplevel)"
WORK="$(mktemp -d)"
trap 'cd "$ROOT"; git worktree prune; rm -rf "$WORK"' EXIT

export REGISTRY_ROOT="$ROOT" SITE_ROOT="$PREFIX/"

# Cache des constructions d'archives (dossier BUILD_CACHE, conservé d'une publication à l'autre par le workflow)
CACHE="${BUILD_CACHE:-}"
restore_cache() { # <clé> <destination>
  [ -n "$CACHE" ] && [ -d "$CACHE/$1" ] || return 1
  rm -rf "$2"; cp -r "$CACHE/$1" "$2"
}
save_cache() { # <clé> <source> <préfixe>
  [ -n "$CACHE" ] || return 0
  mkdir -p "$CACHE"
  # une seule entrée par version : on supprime les anciennes clés du même préfixe
  for old in "$CACHE/$3"*; do [ -e "$old" ] && [ "$old" != "$CACHE/$1" ] && rm -rf "$old"; done
  rm -rf "$CACHE/$1"; cp -r "$2" "$CACHE/$1"
}

jq -c '.[]' "$ROOT/versions.json" | while read -r v; do
  slug="$(jq -r .slug <<<"$v")"
  ref="$(jq -r .ref <<<"$v")"
  echo "::group::Version $slug ($ref)"
  # une archive est figée : si son code n'a pas changé depuis la dernière publication, on réutilise sa construction
  key="$slug-$(git -C "$ROOT" rev-parse "$ref")"
  if restore_cache "$key" "$DIST/$slug"; then echo "(inchangée : réutilisée)"; echo "::endgroup::"; continue; fi
  git -C "$ROOT" worktree add --detach "$WORK/$slug" "$ref" >/dev/null
  (
    cd "$WORK/$slug"
    npm ci --no-audit --no-fund --loglevel=error
    # copie embarquée du classeur (versions qui lisent l'Excel) ; adresse « en ligne » volontairement inaccessible
    [ -f scripts/sync-model.mjs ] && node scripts/sync-model.mjs
    MODEL_LIVE_URL="http://archive.invalid/model.xlsx" npx vite build --base="$PREFIX/$slug/" --outDir "$DIST/$slug" --emptyOutDir
  )
  save_cache "$key" "$DIST/$slug" "$slug-"
  echo "::endgroup::"
done

# Affichages enregistrés : « <version>-<nom> ». Le code est celui de la version de base (version actuelle = ce dépôt).
CURRENT="$(jq -r .slug "$ROOT/version.json")"
[ -f "$ROOT/variants/index.json" ] && jq -c '.[]' "$ROOT/variants/index.json" | while read -r v; do
  slug="$(jq -r .slug <<<"$v")"
  base="$(jq -r .base <<<"$v")"
  echo "::group::Affichage $slug (base $base)"
  if [ "$base" != "$CURRENT" ]; then
    vkey="aff-$slug-$(git -C "$ROOT" rev-parse "$(jq -r --arg b "$base" '.[] | select(.slug==$b) | .ref' "$ROOT/versions.json")")-$(sha1sum "$ROOT/variants/$slug.json" | cut -c1-12)"
    if restore_cache "$vkey" "$DIST/$slug"; then echo "(inchangé : réutilisé)"; echo "::endgroup::"; continue; fi
  fi
  if [ "$base" = "$CURRENT" ]; then
    src="$ROOT"
  else
    ref="$(jq -r --arg b "$base" '.[] | select(.slug==$b) | .ref' "$ROOT/versions.json")"
    [ -n "$ref" ] || { echo "version de base inconnue : $base"; exit 1; }
    src="$WORK/base-$base"
    if [ ! -d "$src" ]; then
      git -C "$ROOT" worktree add --detach "$src" "$ref" >/dev/null
      (cd "$src" && npm ci --no-audit --no-fund --loglevel=error && { [ -f scripts/sync-model.mjs ] && node scripts/sync-model.mjs || true; })
    fi
  fi
  (
    cd "$src"
    # base figée (ancienne version) : copie embarquée du classeur ; version actuelle : classeur en ligne comme le site principal
    [ "$base" = "$CURRENT" ] || export MODEL_LIVE_URL="http://archive.invalid/model.xlsx"
    VARIANT_CONFIG="$ROOT/variants/$slug.json" APP_SLUG="$slug" \
      npx vite build --base="$PREFIX/$slug/" --outDir "$DIST/$slug" --emptyOutDir
  )
  [ "$base" = "$CURRENT" ] || save_cache "$vkey" "$DIST/$slug" "aff-$slug-"
  echo "::endgroup::"
done

# Bandeau « Autres versions » sur les versions figées (versions archivées et affichages de versions archivées)
ARCHIVED_SLUGS="$(jq -r '.[].slug' "$ROOT/versions.json" | tr '\n' ' ')"
OLD_VARIANTS=""
[ -f "$ROOT/variants/index.json" ] && OLD_VARIANTS="$(jq -r --arg c "$CURRENT" '.[] | select(.base != $c) | .slug' "$ROOT/variants/index.json" | tr '\n' ' ')"
(cd "$ROOT" && node scripts/inject-banner.mjs "$DIST" "$PREFIX" $ARCHIVED_SLUGS $OLD_VARIANTS)
