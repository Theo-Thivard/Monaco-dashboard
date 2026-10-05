#!/usr/bin/env bash
# Construit les anciennes versions du dashboard (listées dans versions.json) dans dist/<slug>/,
# puis les AFFICHAGES enregistrés (variants/index.json) : même code que leur version, configuration enregistrée comme défaut,
# afin qu'une nouvelle version ne remplace jamais l'ancienne : chacune garde son adresse.
# Toutes les versions et tous les affichages suivent le DERNIER classeur Excel du dépôt (N le plus élevé) : on le leur impose comme classeur embarqué
# et ils lisent aussi la version en ligne (branche main), comme la version courante. Seul leur code reste figé.
# Usage : app/scripts/build-versions.sh <dossier dist> <préfixe d'adresse, p. ex. /Monaco-dashboard>
set -euo pipefail
DIST="$(cd "$1" && pwd)"
PREFIX="${2:-/Monaco-dashboard}"
REPO="$(git rev-parse --show-toplevel)"      # dépôt (branches des archives)
APP="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" # dossier app/ : versions.json, variants/…
WORK="$(mktemp -d)"
trap 'cd "$REPO"; git worktree prune; rm -rf "$WORK"' EXIT

export REGISTRY_ROOT="$APP" SITE_ROOT="$PREFIX/"

# Dernier classeur Excel (Monaco_Besoins_IT_v<N>.xlsx, N le plus élevé) : à la racine du dépôt (ou dans app/ pour d'anciennes dispositions)
LATEST_MODEL="$(ls "$REPO" "$APP" 2>/dev/null | grep -E '^Monaco_Besoins_IT_v[0-9]+\.xlsx$' | sort -V | tail -1)"
LATEST_PATH="$REPO/$LATEST_MODEL"; [ -f "$LATEST_PATH" ] || LATEST_PATH="$APP/$LATEST_MODEL"
[ -f "$LATEST_PATH" ] || { echo "Aucun classeur Monaco_Besoins_IT_v<N>.xlsx trouvé"; exit 1; }
MODEL_KEY="$LATEST_MODEL-$(sha1sum "$LATEST_PATH" | cut -c1-12)"
echo "Classeur de référence pour toutes les versions : $LATEST_MODEL"
# remplace les classeurs d'une copie de travail (dossier code <src>) par le dernier : c'est lui que sync-model.mjs et vite.config.ts retiennent
pin_latest_model() { # <dossier code>
  local d
  for d in "$1/.." "$1"; do
    if ls "$d"/Monaco_Besoins_IT_v*.xlsx >/dev/null 2>&1; then rm -f "$d"/Monaco_Besoins_IT_v*.xlsx; cp "$LATEST_PATH" "$d/$LATEST_MODEL"; return 0; fi
  done
  cp "$LATEST_PATH" "$1/$LATEST_MODEL" # aucune copie dans cette disposition : on la dépose dans le dossier du code
}

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

jq -c '.[]' "$APP/versions.json" | while read -r v; do
  slug="$(jq -r .slug <<<"$v")"
  ref="$(jq -r .ref <<<"$v")"
  echo "::group::Version $slug ($ref)"
  # une archive est figée : si son code n'a pas changé depuis la dernière publication, on réutilise sa construction
  key="$slug-$(git -C "$REPO" rev-parse "$ref")-$MODEL_KEY"
  if restore_cache "$key" "$DIST/$slug"; then echo "(inchangée : réutilisée)"; echo "::endgroup::"; continue; fi
  git -C "$REPO" worktree add --detach "$WORK/$slug" "$ref" >/dev/null
  (
    cd "$WORK/$slug"
    [ -f app/package.json ] && cd app # dispositions récentes : le code est dans app/
    npm ci --no-audit --no-fund --loglevel=error
    # dernier classeur embarqué (versions qui lisent l'Excel) ; la version en ligne est lue comme pour la version courante
    pin_latest_model "$PWD"
    [ -f scripts/sync-model.mjs ] && node scripts/sync-model.mjs
    # clé de stockage propre à chaque version : une archive ne partage pas celle de la version courante
    APP_SLUG="$slug" npx vite build --base="$PREFIX/$slug/" --outDir "$DIST/$slug" --emptyOutDir
  )
  save_cache "$key" "$DIST/$slug" "$slug-"
  echo "::endgroup::"
done

# Affichages enregistrés : « <version>-<nom> ». Le code est celui de la version de base (version actuelle = ce dépôt).
CURRENT="$(jq -r .slug "$APP/version.json")"
[ -f "$APP/variants/index.json" ] && jq -c '.[]' "$APP/variants/index.json" | while read -r v; do
  slug="$(jq -r .slug <<<"$v")"
  base="$(jq -r .base <<<"$v")"
  echo "::group::Affichage $slug (base $base)"
  if [ "$base" != "$CURRENT" ]; then
    vkey="aff-$slug-$(git -C "$REPO" rev-parse "$(jq -r --arg b "$base" '.[] | select(.slug==$b) | .ref' "$APP/versions.json")")-$(sha1sum "$APP/variants/$slug.json" | cut -c1-12)-$MODEL_KEY"
    if restore_cache "$vkey" "$DIST/$slug"; then echo "(inchangé : réutilisé)"; echo "::endgroup::"; continue; fi
  fi
  if [ "$base" = "$CURRENT" ]; then
    src="$APP"
  else
    ref="$(jq -r --arg b "$base" '.[] | select(.slug==$b) | .ref' "$APP/versions.json")"
    [ -n "$ref" ] || { echo "version de base inconnue : $base"; exit 1; }
    wt="$WORK/base-$base"
    [ -d "$wt" ] || git -C "$REPO" worktree add --detach "$wt" "$ref" >/dev/null
    src="$wt"; [ -f "$wt/app/package.json" ] && src="$wt/app" # dispositions récentes : le code est dans app/ (à calculer une fois la copie de travail créée)
    if [ ! -d "$src/node_modules" ]; then
      (cd "$src" && npm ci --no-audit --no-fund --loglevel=error && pin_latest_model "$PWD" && { [ -f scripts/sync-model.mjs ] && node scripts/sync-model.mjs || true; })
    fi
  fi
  (
    cd "$src"
    VARIANT_CONFIG="$APP/variants/$slug.json" APP_SLUG="$slug" \
      npx vite build --base="$PREFIX/$slug/" --outDir "$DIST/$slug" --emptyOutDir
  )
  [ "$base" = "$CURRENT" ] || save_cache "$vkey" "$DIST/$slug" "aff-$slug-"
  echo "::endgroup::"
done

# Bandeau « Autres versions » sur les versions figées (versions archivées et affichages de versions archivées)
ARCHIVED_SLUGS="$(jq -r '.[].slug' "$APP/versions.json" | tr '\n' ' ')"
OLD_VARIANTS=""
[ -f "$APP/variants/index.json" ] && OLD_VARIANTS="$(jq -r --arg c "$CURRENT" '.[] | select(.base != $c) | .slug' "$APP/variants/index.json" | tr '\n' ' ')"
(cd "$APP" && node scripts/inject-banner.mjs "$DIST" "$PREFIX" $ARCHIVED_SLUGS $OLD_VARIANTS)
