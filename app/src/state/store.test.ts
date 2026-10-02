import { describe, expect, it } from 'vitest'
import { createDefaultConfig } from '../config/defaults'
import { computeScenario } from '../core/engine'
import { defaultParams, withValue } from '../core/hypotheses'
import { buildSnapshot } from '../core/snapshot'
import { diffFromDefault, sanitizeConfig, type AppState } from './store'

const state = (over: Partial<AppState> = {}): AppState => ({
  params: defaultParams(), scenario: 1, lens: 'need', route: { kind: 'scenario', scenario: 1 }, past: [], future: [],
  config: createDefaultConfig(),
  ui: { mode: 'client', editLayout: false, expanded: { detail: false, method: false }, panel: null, settingsTab: 'content', selectedWidget: null, sidebar: true, toast: null },
  ...over,
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
      buildSnapshot(p, 1, 'need')
    }
    const per = (performance.now() - t0) / 50
    expect(per).toBeLessThan(60)
    expect(computeScenario(p, 1).addressable).toBeGreaterThan(0)
  })
})

describe('modifier les trois scénarios ensemble', () => {
  it('même variation en % pour les trois scénarios, bornes respectées, valeur unique inchangée', async () => {
    const { getState, setParamTogether, resetAssumptions } = await import('./store')
    const { HYP_BY_ID } = await import('../core/hypotheses')
    resetAssumptions()
    const id = 'adrFin'
    const h = HYP_BY_ID[id]
    const before = [...getState().params[id]]
    const target = Math.min(h.max, before[1] * 1.2)
    setParamTogether(id, target, 1)
    const after = getState().params[id]
    expect(after[1]).toBeCloseTo(target, 12)
    before.forEach((b, k) => expect(after[k]).toBeCloseTo(Math.min(h.max, b * (target / before[1])), 10))
    expect(after[0]).not.toBe(before[0]) // pas seulement le scénario central
    expect(after[2]).not.toBe(before[2])
    resetAssumptions()
  })
})

describe('réglages de graphique par lecture', () => {
  it('une lecture ne modifie pas l\'autre ; vider un réglage le retire', async () => {
    const { resolveWidget } = await import('../config/resolve')
    const { updateWidgetLens, getState } = await import('./store')
    updateWidgetLens('ch-trajectory', 'need', { axisMin: 2, axisMax: 7 })
    updateWidgetLens('ch-trajectory', 'addressable', { axisMin: 0, axisMax: 4 })
    const w = getState().config.pages.scenario.widgets.find((x) => x.id === 'ch-trajectory')!
    expect(resolveWidget(w, 'need')).toMatchObject({ axisMin: 2, axisMax: 7 })
    expect(resolveWidget(w, 'addressable')).toMatchObject({ axisMin: 0, axisMax: 4 })
    updateWidgetLens('ch-trajectory', 'need', { axisMin: undefined, axisMax: undefined })
    const w2 = getState().config.pages.scenario.widgets.find((x) => x.id === 'ch-trajectory')!
    expect(w2.lensOverrides?.need).toBeUndefined()
    expect(resolveWidget(w2, 'addressable').axisMax).toBe(4)
  })
})
