import { describe, expect, it } from 'vitest'
import { DATASETS, compatibleCharts, type Dataset } from './datasets'
import { computeScenario, groupBlocks } from './engine'
import { defaultFormat, displayedNumber, fmt } from './format'
import { deadHyps } from './actors'
import { defaultParams, HYPS, hypValue, withValue, type Params } from './hypotheses'
import { buildHeadline } from './insights'
import { KPI_DEFS, kpiValue, kpisForLens } from './kpis'
import { buildSnapshot } from './snapshot'

const ctx = (snap: ReturnType<typeof buildSnapshot>) => ({
  snap, label: (_k: string, d: string) => d, hypLabel: (id: string) => id, fmtHypValue: (_id: string, v: number) => String(v),
})
const ds = (snap: ReturnType<typeof buildSnapshot>): Record<string, Dataset> => Object.fromEntries(DATASETS.map((d) => [d.id, d.build(ctx(snap))]))
const close = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(a), Math.abs(b)))
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

// jeux d'hypothèses de test : défaut, modifié, et tirages pseudo-aléatoires reproductibles
function rnd(seed: number) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296) }
function randomParams(seed: number): Params {
  const r = rnd(seed)
  const p = defaultParams()
  for (const h of HYPS) {
    if (h.control !== 'slider') continue
    p[h.id] = p[h.id].map(() => h.min + r() * (h.max - h.min))
  }
  return p
}
const cases: [string, Params, number][] = [
  ['défaut / Bas', defaultParams(), 0], ['défaut / Central', defaultParams(), 1], ['défaut / Haut', defaultParams(), 2],
  ...[1, 2, 3, 4, 5, 6].map((i): [string, Params, number] => [`aléatoire ${i}`, randomParams(i), i % 3]),
]

describe.each(cases)('cohérence (lentille adressable) : %s', (_n, params, s) => {
  const snap = buildSnapshot(params, s, 'addressable')
  const d = ds(snap)
  const a = snap.active

  it('modèle : identités comptables', () => {
    for (const r of snap.results) {
      close(r.total, r.need + r.ia + r.other)
      close(r.addressable, r.addrBase + r.addrIa)
      close(r.addressable, sum(r.blocks.map((b) => b.addressable)))
      close(r.total, r.base + r.dAct + r.dInt + r.ia + r.other)
      close(r.addressable, sum(groupBlocks(r).map((g) => g.addressable)))
    }
  })
  it('KPI = jeux de données (même valeur partout)', () => {
    const k = (id: string) => kpiValue(KPI_DEFS.find((x) => x.id === id)!, a, snap.results)
    close(k('addressable'), d.addrByBlock.series[0].total!)
    close(k('addressable'), sum(d.addrByBlock.series[0].values))
    close(k('addressable'), d.scenarios.series[2].values[s])
    const tot = (set: Dataset) => set.steps!.map((t, i) => (t === 'total' ? i : -1)).filter((i) => i >= 0) // [base, besoin, adressable]
    close(k('addressable'), d.bridge.series[0].values[tot(d.bridge)[2]])
    close(k('addressable'), d.trajectory.series[s].values[9])
    close(k('addressable'), sum(d.trajectoryBlocks.series.map((x) => x.values[9])))
    close(k('addressable'), sum(d.addrByBlockScenario.series.map((x) => x.values[s])))
    close(k('addressable'), sum(d.socleAi.series.map((x) => x.values[s])))
    close(k('addressable'), d.detailTable.series[4 + s].total!)
    close(k('addressable'), sum(d.detailTable.series[4 + s].values))
    close(k('need'), d.bridge.series[0].values[tot(d.bridge)[1]])
    close(k('need'), d.scenarios.series[1].values[s])
    close(k('need'), sum(d.blockOverview.series[1].values))
    close(k('base'), d.bridge.series[0].values[tot(d.bridge)[0]])
    close(k('rate'), k('addressable') / k('need'))
    close(k('rate'), d.rateByBlock.series[0].total!)
  })
  it('cascade : somme des étapes = totaux', () => {
    const v = d.bridge.series[0].values
    const [a, b, c] = d.bridge.steps!.map((t, i) => (t === 'total' ? i : -1)).filter((i) => i >= 0)
    close(sum(v.slice(a, b)), v[b]) // base + écarts = besoin 2035
    close(v[b] + sum(v.slice(b + 1, c)), v[c]) // besoin + écarts = adressable
  })
  it('sensibilité : recalcul direct', () => {
    for (const row of snap.sensitivity.slice(0, 5)) {
      close(computeScenario(withValue(params, row.id, s, row.lowVal), s).addressable - a.addressable, row.low)
      close(computeScenario(withValue(params, row.id, s, row.highVal), s).addressable - a.addressable, row.high)
    }
  })
  it('totaux des séries = somme des valeurs (tableaux)', () => {
    for (const set of Object.values(d)) {
      if (set.kind === 'timeseries' || set.kind === 'bridge' || set.kind === 'sensitivity') continue
      for (const sr of set.series) if (sr.total !== undefined && set.id !== 'rateByBlock') close(sr.total, sum(sr.values))
    }
  })
  it('format : l\'affichage ne modifie pas la valeur de référence', () => {
    const f = defaultFormat()
    close(displayedNumber('power', a.addressable, f), Math.round(a.addressable / 10) / 100, 1e-9)
    // même chaîne dans le KPI, le tableau et l'infobulle
    expect(fmt('power', a.addressable, f)).toBe(fmt('power', d.scenarios.series[2].values[s], f))
  })
  it('message clé généré sans NaN', () => {
    const h = buildHeadline(snap, defaultFormat(), (id) => id)
    expect(JSON.stringify(h)).not.toMatch(/NaN|undefined|Infinity/)
  })
  it('types de graphiques par défaut compatibles', () => {
    for (const def of DATASETS) expect(compatibleCharts(d[def.id])).toContain(def.defaultChart)
  })
})

describe.each(cases)('cohérence (lentille besoins générés, livrable 2) : %s', (_n, params, s) => {
  const snap = buildSnapshot(params, s, 'need')
  const d = ds(snap)
  const a = snap.active
  const k = (id: string) => kpiValue(KPI_DEFS.find((x) => x.id === id)!, a, snap.results)

  it('trajectoire, scénarios, cascade et détail = besoin du modèle', () => {
    close(k('need'), d.trajectory.series[s].values[9])
    close(k('need'), d.scenarios.series[1].values[s])
    expect(d.scenarios.series).toHaveLength(2) // pas de série adressable
    close(k('need'), sum(d.trajectoryBlocks.series.map((x) => x.values[9])))
    close(k('need'), sum(d.addrByBlockScenario.series.map((x) => x.values[s])))
    close(k('need'), sum(d.socleAi.series.map((x) => x.values[s])))
    close(k('need'), sum(d.addrByBlock.series[0].values))
    close(k('need'), sum(d.blockOverview.series[1].values))
    expect(d.detailTable.series).toHaveLength(4) // 2026 + besoin des 3 scénarios
  })
  it('la cascade s\'arrête au besoin 2035 et somme exactement', () => {
    const v = d.bridge.series[0].values
    const st = d.bridge.steps!
    expect(st[st.length - 1]).toBe('total')
    expect(st.filter((t) => t === 'total')).toHaveLength(2)
    close(sum(v.slice(0, -1)), v[v.length - 1])
    close(v[v.length - 1], k('need'))
  })
  it('sensibilité : recalcul direct sur le besoin', () => {
    for (const row of snap.sensitivity.slice(0, 5)) {
      close(computeScenario(withValue(params, row.id, s, row.lowVal), s).total - a.total, row.low)
      close(computeScenario(withValue(params, row.id, s, row.highVal), s).total - a.total, row.high)
    }
  })
  it('indicateurs de la lentille : aucun écart de référence, aucun NaN', () => {
    for (const id of kpisForLens(KPI_DEFS.map((x) => x.id), 'need')) expect(Number.isFinite(k(id))).toBe(true)
    expect(JSON.stringify(buildHeadline(snap, defaultFormat(), (i) => i))).not.toMatch(/NaN|undefined|Infinity/)
    for (const def of DATASETS) expect(compatibleCharts(d[def.id])).toContain(def.defaultChart)
  })
})

describe('précision', () => {
  it('l\'impact du changement d\'une hypothèse n\'est jamais arrondi', () => {
    const base = computeScenario(defaultParams(), 1).addressable
    const p = withValue(defaultParams(), 'adrFin', 1, defaultParams().adrFin[1] + 1e-7)
    expect(computeScenario(p, 1).addressable).toBeGreaterThan(base)
  })
})

describe('registre des hypothèses', () => {
  it('défauts dans les bornes, valeurs cohérentes', () => {
    for (const h of HYPS) {
      expect(h.def.length).toBe(h.single ? 1 : 3)
      for (const v of h.def) { expect(v).toBeGreaterThanOrEqual(h.min); expect(v).toBeLessThanOrEqual(h.max) }
      expect(hypValue(defaultParams(), h.id, 1)).toBe(h.single ? h.def[0] : h.def[1])
    }
  })
  it('chaque hypothèse de scénario agit sur le résultat (sauf cas documentés)', () => {
    const base = defaultParams()
    const silent: string[] = []
    for (const h of HYPS) {
      if (h.control !== 'slider') continue
      const alt = withValue(base, h.id, 1, h.single ? h.def[0] * 1.3 : h.def[1] + 0.07 <= h.max ? h.def[1] + 0.07 : h.def[1] - 0.07)
      const moved = [0, 1, 2].some((s) => Math.abs(computeScenario(alt, s).addressable - computeScenario(base, s).addressable) > 1e-9)
      if (!moved) silent.push(h.id)
    }
    // les hypothèses sans effet (formule modifiée dans l'Excel) sont repérées et signalées, jamais ignorées en silence
    expect(silent.sort()).toEqual(deadHyps().sort())
  })
})
