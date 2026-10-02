// Applique la configuration d'un widget (ordre, noms, visibilité, couleurs des
// séries) à un jeu de données. Le tableau ET le graphique consomment le
// résultat : ils affichent donc exactement les mêmes séries et valeurs.

import type { WidgetConfig } from '../config/types'
import { palette, toneColor, type Tokens } from '../config/theme'
import type { Dataset } from '../core/datasets'

export interface PreparedDataset {
  ds: Dataset
  /** couleur de chaque série (clé = id de série) */
  colors: Record<string, string>
}

export function prepareDataset(ds: Dataset, wc: Pick<WidgetConfig, 'series' | 'seriesOrder'>, t: Tokens): PreparedDataset {
  const pal = palette(t)
  const colors: Record<string, string> = {}
  ds.series.forEach((s, i) => {
    colors[s.id] = wc.series?.[s.id]?.color ?? toneColor(s.tone, t) ?? pal[i % pal.length]
  })
  let series = ds.series
  if (wc.seriesOrder?.length) {
    const rank = new Map(wc.seriesOrder.map((id, i) => [id, i]))
    series = [...series].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999))
  }
  series = series
    .filter((s) => !wc.series?.[s.id]?.hidden)
    .map((s) => ({ ...s, name: wc.series?.[s.id]?.name?.trim() || s.name }))
  return { ds: { ...ds, series }, colors }
}
