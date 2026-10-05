// Moteur de calcul : lit les résultats du classeur Excel (recalculé avec les hypothèses courantes).
// Aucune formule n'est écrite ici : tout vient de l'Excel (voir model.ts). Ce fichier met en forme les résultats
// (blocs, totaux, décomposition des écarts) et fournit le profil annuel interpolé 2026 → 2035.

import type { Params } from './hypotheses'
import { ENTITIES, getModel, numberAt, overridesFor, zeroed, type Entity, type Model } from './model'
import type { Run } from './xl/workbook'

export { ENTITIES }
export type { Entity }
export const SCENARIOS = ['Bas', 'Central', 'Haut'] as const
export const HORIZON = 9 // 2026 -> 2035


export const ENTITY_LABEL: Record<Entity, string> = {
  DSP: 'DSP', AUTRES: 'Autres entités publiques', POMP: 'Corps Sapeurs Pompiers', DITN: 'DITN', CHPG: 'CHPG',
  MT: 'Monaco Telecom', FIN: 'Finance', PRIV: 'Privé hors finance',
}

export interface BlockResult {
  id: Entity
  label: string
  base: number // kW baseline 2026 (Excel)
  need: number // besoin hors IA 2035 (kW)
  ia: number // besoin IA (kW)
  total: number // besoin total 2035 (kW)
  /** part du besoin total non expliquée par « hors IA + IA » (0 tant que l'Excel additionne simplement les deux) */
  other: number
  adrShare: number // part adressable du socle (Excel)
  adrIaShare: number // part adressable de l'IA (Excel)
  addressable: number // demande adressable (kW, Excel)
  addrBase: number // part de la demande adressable hors IA (kW)
  addrIa: number // part de la demande adressable liée à l'IA (kW)
  dAct: number // effet effectifs / activité / métier sur le besoin (kW)
  dInt: number // effet intensité numérique (kW)
}

export interface ScenarioResult {
  scenario: number
  year: number
  blocks: BlockResult[]
  base: number
  need: number
  ia: number
  total: number
  other: number
  addressable: number
  addrBase: number
  addrIa: number
  dAct: number
  dInt: number
  rate: number
  growth: number
}

/** Définit une propriété calculée à la demande (une seule fois). */
function lazy<T extends object, K extends string>(o: T, key: K, f: () => number) {
  let cache: number | undefined
  Object.defineProperty(o, key, { enumerable: true, configurable: true, get: () => (cache ??= f()) })
}

class ModelRun {
  readonly main: Run
  private cfInt?: Run
  private cfAi?: Run
  private cache: (ScenarioResult | undefined)[] = [undefined, undefined, undefined]
  constructor(readonly m: Model, readonly p: Params) {
    this.main = m.wb.evaluate(overridesFor(m, p))
  }
  /** Résultat d'un scénario, calculé à la demande (les évaluations de sensibilité n'ont besoin que d'un scénario). */
  result(s: number): ScenarioResult { return (this.cache[s] ??= this.read(s)) }
  private intRun() { return (this.cfInt ??= this.m.wb.evaluate(zeroed(this.m, this.p, 'intensity'))) }
  private aiRun() { return (this.cfAi ??= this.m.wb.evaluate(zeroed(this.m, this.p, 'ai'))) }

  private read(s: number): ScenarioResult {
    const { m } = this
    const map = m.scenarios[s]
    const n = (g: number, run: Run = this.main) => numberAt(run, g, m)
    const blocks: BlockResult[] = ENTITIES.map((id) => {
      const c = map.blocks[id]
      const need = n(c.need), ia = n(c.ia), total = n(c.total)
      const b = { id, label: ENTITY_LABEL[id], base: n(c.base), need, ia, total, other: total - need - ia, adrShare: n(c.adrShare), adrIaShare: n(c.adrIaShare), addressable: n(c.addressable) } as BlockResult
      // décomposition par scénarios contrefactuels : IA = 0 ; intensité numérique = 0
      lazy(b, 'addrBase', () => n(c.addressable, this.aiRun()))
      lazy(b, 'addrIa', () => b.addressable - b.addrBase)
      lazy(b, 'dInt', () => need - n(c.need, this.intRun()))
      lazy(b, 'dAct', () => need - b.dInt - b.base)
      return b
    })
    const sum = (f: (b: BlockResult) => number) => blocks.reduce((a, b) => a + f(b), 0)
    const t = map.totals
    const base = t?.base !== undefined ? n(t.base) : sum((b) => b.base)
    const need = t?.need !== undefined ? n(t.need) : sum((b) => b.need)
    const ia = t?.ia !== undefined ? n(t.ia) : sum((b) => b.ia)
    const total = t?.total !== undefined ? n(t.total) : sum((b) => b.total)
    const addressable = t?.addressable !== undefined ? n(t.addressable) : sum((b) => b.addressable)
    const r = { scenario: s, year: 2026 + HORIZON, blocks, base, need, ia, total, other: total - need - ia, addressable, rate: total ? addressable / total : 0, growth: base ? total / base : 0 } as ScenarioResult
    lazy(r, 'addrBase', () => sum((b) => b.addrBase))
    lazy(r, 'addrIa', () => sum((b) => b.addrIa))
    lazy(r, 'dAct', () => sum((b) => b.dAct))
    lazy(r, 'dInt', () => sum((b) => b.dInt))
    return r
  }
}

const runs = new WeakMap<Params, ModelRun>()
function getRun(p: Params): ModelRun {
  let r = runs.get(p)
  if (!r) { r = new ModelRun(getModel(), p); runs.set(p, r) }
  return r
}

/** Profil à l'année t (0 = 2026, 9 = 2035) : t = 9 est exactement le résultat de l'Excel ; entre les deux, croissance composée du besoin
 *  et montée linéaire de la surcouche IA (interpolation ajoutée par le dashboard : l'Excel ne calcule que 2035). */
function atYear(r: ScenarioResult, t: number): ScenarioResult {
  const k = t / HORIZON
  const blocks: BlockResult[] = r.blocks.map((b) => {
    const need = b.base > 0 && b.need > 0 ? b.base * Math.pow(b.need / b.base, k) : b.base + (b.need - b.base) * k
    const fNeed = b.need ? need / b.need : 0
    const ia = b.ia * fNeed * k
    const addrBase = b.need ? b.addrBase * fNeed : 0
    const addrIa = b.ia ? b.addrIa * (ia / b.ia) : 0
    const out = {
      ...b, need, ia, total: need + ia + b.other * k, other: b.other * k, addrBase, addrIa, addressable: addrBase + addrIa,
      dInt: b.dInt * k, dAct: need - b.base - b.dInt * k,
    }
    return out
  })
  const sum = (f: (b: BlockResult) => number) => blocks.reduce((a, b) => a + f(b), 0)
  const base = sum((b) => b.base), total = sum((b) => b.total), addressable = sum((b) => b.addressable)
  return {
    scenario: r.scenario, year: 2026 + t, blocks, base, need: sum((b) => b.need), ia: sum((b) => b.ia), total, other: sum((b) => b.other), addressable,
    addrBase: sum((b) => b.addrBase), addrIa: sum((b) => b.addrIa), dAct: sum((b) => b.dAct), dInt: sum((b) => b.dInt),
    rate: total ? addressable / total : 0, growth: base ? total / base : 0,
  }
}

export function computeScenario(p: Params, s: number, t: number = HORIZON): ScenarioResult {
  const r = getRun(p).result(s)
  return t >= HORIZON ? r : atYear(r, t)
}

export const computeAll = (p: Params, t: number = HORIZON) => [0, 1, 2].map((s) => computeScenario(p, s, t))

// Regroupement identique à 3_Output (v5 : une ligne par acteur)
export interface GroupDef { id: string; label: string; members: Entity[]; /** besoin porté par le secteur public / l'opérateur (part captable conventionnelle) */ captive: boolean }
export const OUTPUT_GROUPS: GroupDef[] = [
  { id: 'DSP', label: 'DSP', members: ['DSP'], captive: true },
  { id: 'AUTRES', label: 'Autres entités publiques', members: ['AUTRES'], captive: true },
  { id: 'POMP', label: 'Corps Sapeurs Pompiers', members: ['POMP'], captive: true },
  { id: 'DITN', label: 'DITN', members: ['DITN'], captive: true },
  { id: 'CHPG', label: 'CHPG', members: ['CHPG'], captive: true },
  { id: 'MT', label: 'Monaco Telecom', members: ['MT'], captive: true },
  { id: 'FIN', label: 'Finance', members: ['FIN'], captive: false },
  { id: 'PRIV', label: 'Privé hors finance', members: ['PRIV'], captive: false },
]

export interface GroupResult {
  id: string; label: string; captive: boolean
  base: number; need: number; ia: number; total: number
  addressable: number; addrBase: number; addrIa: number; dAct: number; dInt: number; other: number
}

export function groupBlocks(r: ScenarioResult): GroupResult[] {
  return OUTPUT_GROUPS.map((g) => {
    const bs = r.blocks.filter((b) => g.members.includes(b.id))
    const sum = (f: (b: BlockResult) => number) => bs.reduce((a, b) => a + f(b), 0)
    return {
      id: g.id, label: g.label, captive: g.captive,
      base: sum((b) => b.base), need: sum((b) => b.need), ia: sum((b) => b.ia), total: sum((b) => b.total), other: sum((b) => b.other),
      addressable: sum((b) => b.addressable), addrBase: sum((b) => b.addrBase), addrIa: sum((b) => b.addrIa),
      dAct: sum((b) => b.dAct), dInt: sum((b) => b.dInt),
    }
  })
}
