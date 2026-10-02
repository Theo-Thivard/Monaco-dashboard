import type { Lens } from '../core/lens'
import type { LensOverride, WidgetConfig } from './types'

/** Réglages de graphique effectifs pour une lecture : réglages communs, puis ceux propres à cette lecture. */
export function resolveWidget(wc: WidgetConfig, lens: Lens): WidgetConfig {
  const o = wc.lensOverrides?.[lens]
  if (!o) return wc
  const out: WidgetConfig = { ...wc }
  for (const k of Object.keys(o) as (keyof LensOverride)[]) if (o[k] !== undefined) (out as unknown as Record<string, unknown>)[k] = o[k]
  return out
}
