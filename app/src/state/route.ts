// Routes de navigation : Globale · Scénario → Bas/Central/Haut · Acteurs → DSP… (dans le « hash » de l'adresse).
// Navigation et contenu sont distincts : la route désigne une page, le contenu vient du modèle central.

import { ACTOR_BY_ID, ACTOR_BY_SLUG } from '../core/actors'
import type { Entity } from '../core/engine'

export type PageKind = 'global' | 'scenario' | 'actor'
export type Route =
  | { kind: 'global' }
  | { kind: 'scenario'; scenario: number }
  | { kind: 'actor'; actor: Entity }

export const SCENARIO_SLUGS = ['bas', 'central', 'haut'] as const

/** Anciennes adresses (Excel v4) : DENJS et APDP font désormais partie de « Autres entités publiques ». */
const LEGACY_ACTOR_SLUGS: Record<string, Entity> = { denjs: 'AUTRES', apdp: 'AUTRES' }

export const DEFAULT_ROUTE: Route = { kind: 'global' }

/** « #/scenario/central », « #/acteur/dsp », « #/globale » */
export function formatRoute(r: Route): string {
  switch (r.kind) {
    case 'global': return '#/globale'
    case 'scenario': return `#/scenario/${SCENARIO_SLUGS[r.scenario]}`
    case 'actor': return `#/acteur/${ACTOR_BY_ID[r.actor].slug}`
  }
}

/** Tolérant : adresse inconnue ou vide -> Globale. Ignore la requête (?s=…). */
export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').split('?')[0].replace(/^\/+|\/+$/g, '')
  const [a, b] = path.split('/')
  if (a === 'scenario' || a === 'scénario') {
    const i = SCENARIO_SLUGS.indexOf(b as (typeof SCENARIO_SLUGS)[number])
    if (i >= 0) return { kind: 'scenario', scenario: i }
  }
  if (a === 'acteur' || a === 'acteurs') {
    const actor = ACTOR_BY_SLUG[b]
    if (actor) return { kind: 'actor', actor: actor.id }
    if (LEGACY_ACTOR_SLUGS[b]) return { kind: 'actor', actor: LEGACY_ACTOR_SLUGS[b] }
  }
  return DEFAULT_ROUTE
}

export const sameRoute = (a: Route, b: Route) => formatRoute(a) === formatRoute(b)
