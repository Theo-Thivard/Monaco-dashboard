import type { Lens } from '../core/lens'
import type { Route } from '../state/route'
import type { LensOverride, WidgetConfig } from './types'

/** Réglages de graphique effectifs pour une lecture : réglages communs, puis ceux propres à cette lecture. */
export function resolveWidget(wc: WidgetConfig, lens: Lens): WidgetConfig {
  const o = wc.lensOverrides?.[lens]
  if (!o) return wc
  const out: WidgetConfig = { ...wc }
  for (const k of Object.keys(o) as (keyof LensOverride)[]) if (o[k] !== undefined) (out as unknown as Record<string, unknown>)[k] = o[k]
  return out
}

/** Clé des textes propres à la page courante : un scénario ou un acteur (null pour la Globale : textes communs). */
export const entityKey = (r: Route): string | null => (r.kind === 'scenario' ? `scenario:${r.scenario}` : r.kind === 'actor' ? `actor:${r.actor}` : null)

/** Textes effectifs d'un bloc pour la page courante : textes communs, puis ceux propres au scénario / à l'acteur affiché. */
export function resolveEntityText(wc: WidgetConfig, key: string | null): WidgetConfig {
  const o = key ? wc.entityText?.[key] : undefined
  if (!o) return wc
  const out: WidgetConfig = { ...wc }
  for (const k of ['title', 'subtitle', 'note', 'text'] as const) if (o[k] !== undefined) out[k] = o[k]
  if (o.headline) out.headline = { ...wc.headline, ...o.headline }
  return out
}
