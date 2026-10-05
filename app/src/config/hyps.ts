// Bandeaux d'hypothèses indépendants : un jeu d'hypothèses affichées par contexte de page.
//   « need »        : Globale / Scénario en lecture « Besoins générés »    -> intensités numériques et surcouches IA
//   « addressable » : Globale / Scénario en lecture « Besoins adressables » -> toutes les parts captables
//   « actor:<id> »  : page d'un acteur, propre à cet acteur                 -> les hypothèses qui le font varier
// Chaque contexte garde sa liste (Afficher / masquer) sans toucher aux autres.

import { ACTORS, actorHyps } from '../core/actors'
import type { Entity } from '../core/engine'
import { HYPS, HYP_BY_ID } from '../core/hypotheses'
import type { Lens } from '../core/lens'
import type { Route } from '../state/route'
import type { DashboardConfig } from './types'

export type HypContext = string

export const hypContext = (route: Route, lens: Lens): HypContext => (route.kind === 'actor' ? `actor:${route.actor}` : lens)

/** Liste par défaut d'un contexte (lue dans le registre et dans l'Excel : elle suit leurs évolutions). */
export function defaultHypSet(ctx: HypContext): string[] {
  if (ctx === 'need') return HYPS.filter((h) => h.role === 'intensity' || h.role === 'ai').map((h) => h.id)
  if (ctx === 'addressable') return HYPS.filter((h) => h.category === 'capture').map((h) => h.id)
  if (ctx.startsWith('actor:')) return actorHyps(ctx.slice(6) as Entity).filter((id) => HYP_BY_ID[id])
  return []
}

export const allHypContexts = (): HypContext[] => ['need', 'addressable', ...ACTORS.map((a) => `actor:${a.id}`)]

/** Hypothèses affichées pour un contexte : choix de l'utilisateur, sinon liste par défaut. */
export const hypsOf = (config: Pick<DashboardConfig, 'hyps'>, ctx: HypContext): string[] => config.hyps.sets[ctx] ?? defaultHypSet(ctx)

/** Hypothèses qu'on peut afficher dans ce contexte : toutes, sauf sur une page acteur (celles qui le font varier). */
export const hypsAvailable = (ctx: HypContext): string[] => (ctx.startsWith('actor:') ? defaultHypSet(ctx) : HYPS.map((h) => h.id))

export const HYP_CONTEXT_LABEL: Record<string, string> = { need: 'Besoins générés', addressable: 'Besoins adressables' }
