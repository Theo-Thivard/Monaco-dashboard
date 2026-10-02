import { describe, expect, it } from 'vitest'
import { resolveTokens } from '../config/theme'
import { createDefaultConfig } from '../config/defaults'
import type { Dataset } from '../core/datasets'
import { defaultFormat, fmt, unitLabel } from '../core/format'
import { tierFromPosition } from '../state/store'
import { buildOption, type ChartEnv } from './chartOptions'
import { prepareDataset } from './prepare'

const tokens = resolveTokens('cabinet', {})
const f = defaultFormat()
const env = (over: Partial<ChartEnv> = {}): ChartEnv => ({ tokens, fmt: (k, v, o) => fmt(k, v, f, o), unit: (k) => unitLabel(k, f), powerUnit: 'MW', legend: true, width: 600, ...over })
const ds: Dataset = {
  id: 't', kind: 'timeseries', format: 'power', stackable: true, categories: ['2026', '2027', '2028'],
  series: [{ id: 'a', name: 'Bas', values: [1000, 2000, 3000] }, { id: 'b', name: 'Haut', values: [1500, 2500, 4000] }],
}
const prep = prepareDataset(ds, {}, tokens)

describe('options de graphique', () => {
  it('aires : les valeurs finales s\'affichent comme en courbes', () => {
    for (const t of ['line', 'area', 'stackedArea'] as const) {
      const o = buildOption(prep, t, env()) as { series: { endLabel?: { show: boolean } }[] }
      expect(o.series.every((s) => s.endLabel?.show)).toBe(true)
    }
  })
  it('bornes d\'axe saisies en unité affichée (MW) converties en kW', () => {
    const o = buildOption(prep, 'line', env({ axisMin: 1, axisMax: 5 })) as { yAxis: { min?: number; max?: number } }
    expect(o.yAxis).toMatchObject({ min: 1000, max: 5000 })
    const auto = buildOption(prep, 'line', env()) as { yAxis: { min?: number } }
    expect(auto.yAxis.min).toBeUndefined()
  })
  it('légende longue : la marge haute du graphique augmente pour ne pas le recouvrir', () => {
    const short = buildOption(prep, 'line', env({ legendNames: ['Bas', 'Haut'] })) as { grid: { top: number } }
    const long = buildOption(prep, 'line', env({ width: 300, legendNames: Array.from({ length: 6 }, () => 'Un nom de série très long') })) as { grid: { top: number } }
    expect(long.grid.top).toBeGreaterThan(short.grid.top)
    expect((buildOption(prep, 'line', env({ legend: false })) as { grid: { top: number } }).grid.top).toBeLessThan(short.grid.top)
  })
})

describe('un bloc déplacé change de partie', () => {
  const page = createDefaultConfig().pages.global
  it('sous la section « détail » → détail ; au-dessus → vue client', () => {
    const sec = page.layout.find((l) => l.i === 'g-sec-detail')!
    const moved = page.layout.map((l) => (l.i === 'g-trajectory' ? { ...l, y: sec.y + 3 } : l))
    expect(tierFromPosition(page.widgets, moved, 'g-trajectory')).toBe('detail')
    const up = page.layout.map((l) => (l.i === 'g-detail' ? { ...l, y: 1 } : l))
    expect(tierFromPosition(page.widgets, up, 'g-detail')).toBe('client')
    const meth = page.layout.find((l) => l.i === 'g-sec-method')!
    expect(tierFromPosition(page.widgets, page.layout.map((l) => (l.i === 'g-detail' ? { ...l, y: meth.y + 2 } : l)), 'g-detail')).toBe('method')
  })
})
