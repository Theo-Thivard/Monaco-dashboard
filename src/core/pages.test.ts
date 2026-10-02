import { describe, expect, it } from 'vitest'
import { ACTORS, actorBlock, actorHyps } from './actors'
import { DATASETS, compatibleCharts, type Dataset } from './datasets'
import { computeScenario } from './engine'
import { defaultFormat, fmt } from './format'
import { defaultParams, withValue, type Params } from './hypotheses'
import { buildActorHeadline, buildGlobalHeadline } from './insights'
import { ACTOR_KPI_DEFS } from './kpis'
import { buildSnapshot } from './snapshot'

const close = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(a), Math.abs(b)))
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
const ctx = (snap: ReturnType<typeof buildSnapshot>, actor?: (typeof ACTORS)[number]['id']) => ({
  snap, actor, label: (_k: string, d: string) => d, hypLabel: (id: string) => id, fmtHypValue: (_id: string, v: number) => String(v),
})
const ds = (snap: ReturnType<typeof buildSnapshot>, id: string, actor?: (typeof ACTORS)[number]['id']): Dataset => DATASETS.find((d) => d.id === id)!.build(ctx(snap, actor))

const modified: Params = withValue(withValue(withValue(defaultParams(), 'adrFin', 1, 0.5), 'iaPriv', 2, 0.4), 'bitrate', 0, 5)

describe.each([['défaut', defaultParams()], ['modifié', modified]])('pages Globale / Acteurs – cohérence (%s)', (_n, params) => {
  for (const s of [0, 1, 2]) {
    const snap = buildSnapshot(params, s, 'addressable')

    it(`Globale : acteurs et écarts cohérents avec le modèle (scénario ${s})`, () => {
      const a = ds(snap, 'actorsAddr')
      snap.results.forEach((r, i) => { close(sum(a.series[i].values), r.addressable); close(a.series[i].total!, r.addressable) })
      const sp = ds(snap, 'spreadByActor')
      close(sum(sp.series[0].values), snap.results[2].addressable - snap.results[0].addressable)
      for (const r of snap.results) close(sum(ACTORS.map((x) => actorBlock(r, x.id).addressable)), r.addressable)
    })

    describe.each(ACTORS)('acteur $id', (actor) => {
      const b = actorBlock(snap.active, actor.id)
      it(`datasets de l'acteur = bloc du moteur (scénario ${s})`, () => {
        const bd = ds(snap, 'actorBridge', actor.id)
        const br = bd.series[0].values
        const [i0, i1, i2] = bd.steps!.map((t, i) => (t === 'total' ? i : -1)).filter((i) => i >= 0)
        close(br[i0], b.base); close(br[i1], b.total); close(br[i2], b.addressable)
        close(sum(br.slice(i0, i1)), br[i1]); close(br[i1] + sum(br.slice(i1 + 1, i2)), br[i2])
        const sc = ds(snap, 'actorScenarios', actor.id)
        close(sc.series[2].values[s], b.addressable); close(sc.series[1].values[s], b.total); close(sc.series[0].values[s], b.base)
        const tr = ds(snap, 'actorTrajectory', actor.id)
        close(tr.series[s].values[9], b.addressable)
        close(tr.series[s].values[0], actorBlock(computeScenario(params, s, 0), actor.id).addressable) // 2026 : sans surcouche IA
        const tb = ds(snap, 'actorTable', actor.id)
        close(tb.series[s].values[6], b.addressable); close(tb.series[s].values[3], b.total)
        close(tb.series[s].values[4] + tb.series[s].values[5], b.addressable)
        close(tb.series[s].values[1] + tb.series[s].values[2], b.total)
      })
      it(`KPI de l'acteur = jeux de données ; poids = part du total (scénario ${s})`, () => {
        const v = { b, r: snap.active }
        const k = (id: string) => ACTOR_KPI_DEFS.find((x) => x.id === id)!.compute(v)
        const abr = ds(snap, 'actorBridge', actor.id)
        close(k('addressable'), abr.series[0].values[abr.steps!.lastIndexOf('total')])
        close(k('need'), ds(snap, 'actorScenarios', actor.id).series[1].values[s])
        close(k('weight'), b.addressable / snap.active.addressable)
        close(k('rate'), b.addressable / b.total)
      })
      it(`sensibilité de l'acteur : uniquement ses hypothèses (scénario ${s})`, () => {
        const sen = ds(snap, 'actorSensitivity', actor.id)
        expect(sen.categories.length).toBeLessThanOrEqual(8)
        const ids = new Set(actorHyps(actor.id))
        const rows = (snap.sensitivity.length, sen.categories)
        for (const c of rows) expect(ids.has(c)).toBe(true) // hypLabel du test = identifiant
      })
      it(`messages clés sans NaN (scénario ${s})`, () => {
        const f = defaultFormat()
        const h = buildActorHeadline(snap, actor, f, 'x', actor.label, (id) => id)
        expect(JSON.stringify(h)).not.toMatch(/NaN|undefined|Infinity/)
      })
    })

    it(`headline globale sans NaN (scénario ${s})`, () => {
      const h = buildGlobalHeadline(snap, defaultFormat(), (i) => `S${i}`, (a) => a.label)
      expect(JSON.stringify(h)).not.toMatch(/NaN|undefined|Infinity/)
    })
  }

  it('chaque jeu de données « acteur » est vide sans acteur et son type par défaut est compatible', () => {
    const snap = buildSnapshot(params, 1, 'addressable')
    for (const id of ['actorBridge', 'actorScenarios', 'actorTrajectory', 'actorSensitivity', 'actorTable']) {
      expect(ds(snap, id).empty).toBeTruthy()
      const def = DATASETS.find((d) => d.id === id)!
      expect(compatibleCharts(ds(snap, id, 'DSP'))).toContain(def.defaultChart)
    }
    for (const id of ['actorsAddr', 'spreadByActor']) expect(compatibleCharts(ds(snap, id))).toContain(DATASETS.find((d) => d.id === id)!.defaultChart)
  })
})

describe('page acteur – lentille besoins générés', () => {
  const snap = buildSnapshot(defaultParams(), 1, 'need')
  it.each(ACTORS)('$id : cascade jusqu\'au besoin 2035, KPI = bloc du moteur', (actor) => {
    const b = actorBlock(snap.active, actor.id)
    const bd = ds(snap, 'actorBridge', actor.id)
    const v = bd.series[0].values
    expect(bd.steps!.filter((t) => t === 'total')).toHaveLength(2)
    close(v[v.length - 1], b.total); close(sum(v.slice(0, -1)), b.total)
    expect(ds(snap, 'actorScenarios', actor.id).series).toHaveLength(2)
    close(ds(snap, 'actorTrajectory', actor.id).series[1].values[9], b.total)
    expect(JSON.stringify(buildActorHeadline(snap, actor, defaultFormat(), 'x', actor.label, (id) => id))).not.toMatch(/NaN|undefined|Infinity/)
    const w = ACTOR_KPI_DEFS.find((k) => k.id === 'weightNeed')!.compute({ b, r: snap.active })
    close(w, b.total / snap.active.total)
  })
  it('besoin : la somme des acteurs = besoin total', () => {
    for (const r of snap.results) close(sum(ACTORS.map((x) => actorBlock(r, x.id).total)), r.total)
    const a = ds(snap, 'actorsAddr')
    snap.results.forEach((r, i) => close(sum(a.series[i].values), r.total))
  })
})

describe('un seul modèle pour tous les scénarios et tous les acteurs', () => {
  it('une page Scénario n\'est qu\'un choix d\'index : mêmes formules, hypothèses différentes', () => {
    const p = defaultParams()
    const snap = buildSnapshot(p, 0, 'addressable')
    for (const s of [0, 1, 2]) expect(snap.results[s]).toEqual(computeScenario(p, s))
  })
  it('l\'affichage d\'un acteur passe par le formateur central', () => {
    const snap = buildSnapshot(defaultParams(), 1, 'addressable')
    const b = actorBlock(snap.active, 'DSP')
    expect(fmt('power', b.addressable, defaultFormat())).toMatch(/^\d+,\d{2} MW IT$/)
  })
})
