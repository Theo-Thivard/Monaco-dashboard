import { describe, expect, it } from 'vitest'
import { createDefaultConfig } from '../config/defaults'
import { computeScenario } from '../core/engine'
import { defaultParams, HYPS, withValue, type Params } from '../core/hypotheses'
import { buildSnapshot } from '../core/snapshot'
import { diffFromDefault, sanitizeConfig, type AppState } from './store'

const state = (over: Partial<AppState> = {}): AppState => ({
  params: defaultParams(), reference: defaultParams(), scenario: 1, route: { kind: 'scenario', scenario: 1 }, past: [], future: [],
  config: createDefaultConfig(),
  ui: { mode: 'client', editLayout: false, expanded: { detail: false, method: false }, panel: null, settingsTab: 'content', selectedWidget: null, toast: null },
  ...over,
})

describe('attribution des écarts (valeurs de Shapley)', () => {
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
  it('efficacité : la somme des impacts = écart total, sans résidu', () => {
    let p: Params = defaultParams()
    p = withValue(p, 'adrFin', 1, 0.5)
    p = withValue(p, 'iaFin', 1, 0.4)
    p = withValue(p, 'gIntFin', 1, 0.07)
    p = withValue(p, 'wFin', 1, 100)
    const snap = buildSnapshot(p, defaultParams(), 1)
    expect(snap.changes.rows).toHaveLength(4)
    expect(Math.abs(sum(snap.changes.rows.map((r) => r.delta)) - snap.changes.total)).toBeLessThan(1e-9)
    expect(snap.changes.residual).toBe(0)
  })
  it('interaction répartie équitablement entre deux hypothèses qui ne produisent un effet qu\'ensemble', () => {
    // intensité et IA du privé hors finance : avec IA = 0 l'intensité reste sans effet sur l'IA ; ici on teste la symétrie sur une paire à effet croisé
    const ref = withValue(withValue(defaultParams(), 'iaFin', 1, 0), 'adrIaFin', 1, 0)
    const p = withValue(withValue(ref, 'iaFin', 1, 0.2), 'adrIaFin', 1, 0.5)
    const snap = buildSnapshot(p, ref, 1)
    const [a, b] = snap.changes.rows
    expect(a.delta).toBeGreaterThan(0)
    expect(Math.abs(a.delta - b.delta)).toBeLessThan(1e-9 * Math.max(1, a.delta))
    expect(Math.abs(a.delta + b.delta - snap.changes.total)).toBeLessThan(1e-9)
  })
  it('au-delà de 10 changements : effets isolés + résidu, écart total exact', () => {
    let p: Params = defaultParams()
    for (const h of HYPS.filter((x) => x.control === 'slider' && !x.single).slice(0, 12)) p = withValue(p, h.id, 1, Math.min(h.max, h.def[1] + (h.max - h.min) * 0.05))
    const snap = buildSnapshot(p, defaultParams(), 1)
    expect(snap.changes.rows.length).toBeGreaterThan(10)
    expect(Math.abs(sum(snap.changes.rows.map((r) => r.delta)) + snap.changes.residual - snap.changes.total)).toBeLessThan(1e-9)
  })
})

describe('configuration', () => {
  it('par défaut : aucun écart', () => {
    const d = diffFromDefault(state())
    expect(d.assumptions).toHaveLength(0)
    expect(d.layout + d.theme + d.labels + d.visibility + d.charts + d.format).toBe(0)
  })
  it('détecte hypothèses, libellés, thème, format, graphiques', () => {
    const c = createDefaultConfig()
    c.labels['scenario:1'] = 'Référence client'
    c.theme.tokens = { primary: '#123456' }
    c.format.powerUnit = 'kW'
    c.pages.scenario.widgets = c.pages.scenario.widgets.map((w) => (w.id === 'ch-trajectory' ? { ...w, chartType: 'area' } : w))
    c.pages.scenario.layout = c.pages.scenario.layout.map((l) => (l.i === 'kpis' ? { ...l, h: 6 } : l))
    const d = diffFromDefault(state({ config: c, params: withValue(defaultParams(), 'adrFin', 1, 0.4) }))
    expect(d.assumptions).toHaveLength(1)
    expect(d.labels).toBe(1); expect(d.theme).toBe(1); expect(d.format).toBe(1); expect(d.charts).toBe(1); expect(d.layout).toBe(1)
  })
  it('sanitizeConfig : tolère les données incomplètes ou corrompues', () => {
    expect(sanitizeConfig(null).pages.scenario.widgets.length).toBe(createDefaultConfig().pages.scenario.widgets.length)
    // ancienne configuration (v2) : une seule page, devenue la page « Scénario »
    const c = sanitizeConfig({ brand: 'X', widgets: [{ id: 'a', kind: 'text', tier: 'client', visible: true }], layout: [{ i: 'zzz', x: 0, y: 0, w: 1, h: 1 }] })
    expect(c.brand).toBe('X')
    expect(c.pages.scenario.widgets).toHaveLength(1)
    expect(c.pages.scenario.layout).toHaveLength(0) // positions orphelines écartées
    expect(c.pages.global.widgets.length).toBeGreaterThan(5) // pages absentes : défaut
    expect(c.kpis.order.length).toBeGreaterThan(5)
  })
})

describe('performance', () => {
  it('un instantané complet se calcule en quelques millisecondes', () => {
    let p = defaultParams()
    const t0 = performance.now()
    for (let i = 0; i < 50; i++) {
      p = withValue(p, 'adrFin', 1, 0.3 + (i % 10) / 100)
      p = withValue(p, 'iaFin', 1, 0.2 + (i % 7) / 100)
      p = withValue(p, 'gIntFin', 1, 0.04 + (i % 5) / 1000)
      p = withValue(p, 'wFin', 1, 80 + (i % 9))
      buildSnapshot(p, defaultParams(), 1)
    }
    const per = (performance.now() - t0) / 50
    expect(per).toBeLessThan(25)
    expect(computeScenario(p, 1).addressable).toBeGreaterThan(0)
  })
})
