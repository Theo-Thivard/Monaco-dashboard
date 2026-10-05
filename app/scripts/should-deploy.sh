#!/usr/bin/env bash
# Dit si la publication doit être relancée pour ce push (écrit « skip=true » ou « skip=false » dans $GITHUB_OUTPUT).
# On saute la publication uniquement quand le push se limite à SUPPRIMER des classeurs Monaco_Besoins_IT_v<N>.xlsx
# qui n'étaient pas la dernière version : le site ne change pas (il utilise la version la plus élevée restante).
# Si la dernière version a été supprimée, ou pour tout autre changement, on publie normalement.
# Usage : should-deploy.sh <sha avant le push>   (depuis la racine du dépôt, historique complet récupéré)
set -euo pipefail
BEFORE="${1:-}"
OUT="${GITHUB_OUTPUT:-/dev/stdout}"
skip=false
if [[ -n "$BEFORE" && ! "$BEFORE" =~ ^0+$ ]] && git cat-file -e "$BEFORE^{commit}" 2>/dev/null; then
  changed="$(git diff --name-status "$BEFORE" HEAD)"
  # uniquement des suppressions de classeurs ?
  if [[ -n "$changed" ]] && ! grep -qvE '^D[[:space:]]+Monaco_Besoins_IT_v[0-9]+\.xlsx$' <<<"$changed"; then
    remaining="$(ls Monaco_Besoins_IT_v*.xlsx 2>/dev/null | sed -E 's/.*_v([0-9]+)\.xlsx/\1/' | sort -n | tail -1 || true)"
    deleted="$(sed -E 's/.*_v([0-9]+)\.xlsx/\1/' <<<"$changed" | sort -n | tail -1)"
    if [[ -n "$remaining" && "$deleted" -lt "$remaining" ]]; then
      skip=true
      echo "Suppression d'une ancienne version (v$deleted) alors que la v$remaining reste la dernière : rien à republier."
    else
      echo "La dernière version (v$deleted) a été supprimée : republication avec la plus élevée restante (v${remaining:-aucune})."
    fi
  fi
fi
echo "skip=$skip" >> "$OUT"
