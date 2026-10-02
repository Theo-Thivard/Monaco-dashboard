// Textes personnalisés du message clé : l'utilisateur écrit librement, les chiffres restent vivants grâce à des
// jetons {central}, {bas}… remplacés à l'affichage par les valeurs du modèle (même formateur que partout).

import { actorBlock } from './actors'
import type { Entity, ScenarioResult } from './engine'
import { fmt, type FormatSettings } from './format'
import { lensValue } from './lens'
import type { Part } from './insights'
import type { Snapshot } from './snapshot'

export interface HeadlineToken { key: string; label: string; value: string }

/** Jetons disponibles pour la page courante (acteur : valeurs de l'acteur ; sinon : modèle complet). */
export function headlineTokens(snap: Snapshot, f: FormatSettings, scen: (i: number) => string, actor?: { id: Entity; name: string }): HeadlineToken[] {
  const pick = (r: ScenarioResult) => (actor ? actorBlock(r, actor.id) : r)
  const v = (r: ScenarioResult) => lensValue(pick(r), snap.lens)
  const power = (x: number) => fmt('power', x, f)
  const rise = (r: ScenarioResult) => { const b = pick(r); return fmt('pct', b.base ? b.total / b.base - 1 : 0, f, { sign: true, decimals: 0 }) }
  const [lo, mid, hi] = snap.results
  const act = snap.active
  const out: HeadlineToken[] = [
    { key: 'bas', label: `2035 · ${scen(0)}`, value: power(v(lo)) },
    { key: 'central', label: `2035 · ${scen(1)}`, value: power(v(mid)) },
    { key: 'haut', label: `2035 · ${scen(2)}`, value: power(v(hi)) },
    { key: '2026', label: 'Besoin 2026', value: power(pick(mid).base) },
    { key: 'hausse_bas', label: `Hausse du besoin ${scen(0)}`, value: rise(lo) },
    { key: 'hausse_central', label: `Hausse du besoin ${scen(1)}`, value: rise(mid) },
    { key: 'hausse_haut', label: `Hausse du besoin ${scen(2)}`, value: rise(hi) },
    { key: 'actif', label: 'Scénario affiché · 2035', value: power(v(act)) },
    { key: 'scenario', label: 'Nom du scénario affiché', value: scen(snap.scenario) },
  ]
  if (actor) out.push({ key: 'acteur', label: 'Nom de l\'acteur', value: actor.name })
  return out
}

/** Remplace les jetons ; les jetons inconnus sont laissés tels quels (visibles pour être corrigés). */
export function applyTokens(text: string, tokens: HeadlineToken[]): string {
  const map = new Map(tokens.map((t) => [t.key, t.value]))
  return text.replace(/\{([a-z0-9_]+)\}/gi, (m, k: string) => map.get(k.toLowerCase()) ?? m)
}

/** `**gras**` → parties mises en valeur. */
export function toParts(text: string): Part[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((s) => (s.startsWith('**') && s.endsWith('**') ? { t: s.slice(2, -2), strong: true } : { t: s }))
}
