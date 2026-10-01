// Instantané du modèle : TOUTES les valeurs dérivées (scénarios, trajectoires,
// référence, sensibilité, écarts) sont calculées ici, une seule fois par
// changement d'hypothèse. KPI, graphiques, tableaux et infobulles ne font que
// lire cet objet.

import { computeAll, computeScenario, HORIZON, type ScenarioResult } from './engine'
import { HYPS, hypDiffers, hypValue, withValue, type Params } from './hypotheses'

export interface SensitivityRow {
  id: string
  /** Δ de demande adressable (kW) quand l'hypothèse passe à sa valeur basse / haute */
  low: number
  high: number
  lowVal: number
  highVal: number
}

export interface ChangeRow {
  id: string
  from: number
  to: number
  /** Δ de demande adressable (kW) imputable à cette hypothèse (valeur de Shapley : effets croisés répartis) */
  delta: number
}

export interface Snapshot {
  params: Params
  reference: Params
  scenario: number
  results: ScenarioResult[]
  refResults: ScenarioResult[]
  active: ScenarioResult
  activeRef: ScenarioResult
  trajectory: ScenarioResult[][]
  sensitivity: SensitivityRow[]
  /** écart exact actif − référence = Σ delta + residual (effets croisés) */
  changes: { rows: ChangeRow[]; residual: number; total: number }
}

/** Plage testée pour la sensibilité : bornes Bas/Haut de l'Excel, ±20 % pour les valeurs uniques. */
export function sensitivityRange(id: string): [number, number] | null {
  const h = HYPS.find((x) => x.id === id)!
  if (h.control !== 'slider') return null
  const lo = h.single ? h.def[0] * 0.8 : Math.min(...h.def)
  const hi = h.single ? h.def[0] * 1.2 : Math.max(...h.def)
  return lo === hi ? null : [Math.max(h.min, lo), Math.min(h.max, hi)]
}

function sensitivity(p: Params, s: number, center: number): SensitivityRow[] {
  const rows: SensitivityRow[] = []
  for (const h of HYPS) {
    const r = sensitivityRange(h.id)
    if (!r) continue
    const run = (v: number) => computeScenario(withValue(p, h.id, s, v), s).addressable - center
    const low = run(r[0])
    const high = run(r[1])
    if (Math.abs(low) < 1e-9 && Math.abs(high) < 1e-9) continue
    rows.push({ id: h.id, low, high, lowVal: r[0], highVal: r[1] })
  }
  return rows.sort((a, b) => Math.max(Math.abs(b.low), Math.abs(b.high)) - Math.max(Math.abs(a.low), Math.abs(a.high)))
}

/**
 * Écart actif − référence réparti entre les hypothèses modifiées.
 * Jusqu'à SHAPLEY_MAX hypothèses : valeurs de Shapley (répartition équitable des effets croisés,
 * somme exacte). Au-delà : effet isolé de chaque hypothèse + résidu « effets croisés ».
 */
const SHAPLEY_MAX = 10

function changes(p: Params, ref: Params, s: number, cur: number, base: number) {
  const ids = HYPS.filter((h) => hypDiffers(p, ref, h.id, s)).map((h) => h.id)
  const n = ids.length
  const total = cur - base
  const from = (id: string) => hypValue(ref, id, s)
  const to = (id: string) => hypValue(p, id, s)
  let delta: number[]
  if (n === 0) delta = []
  else if (n <= SHAPLEY_MAX) {
    const val = new Float64Array(1 << n)
    for (let mask = 0; mask < 1 << n; mask++) {
      let q = ref
      for (let k = 0; k < n; k++) if (mask & (1 << k)) q = withValue(q, ids[k], s, to(ids[k]))
      val[mask] = computeScenario(q, s).addressable
    }
    const fact = [1]
    for (let k = 1; k <= n; k++) fact[k] = fact[k - 1] * k
    delta = ids.map((_, i) => {
      let phi = 0
      for (let mask = 0; mask < 1 << n; mask++) {
        if (mask & (1 << i)) continue
        let size = 0
        for (let m = mask; m; m &= m - 1) size++
        phi += (fact[size] * fact[n - size - 1]) / fact[n] * (val[mask | (1 << i)] - val[mask])
      }
      return phi
    })
  } else {
    delta = ids.map((id) => computeScenario(withValue(ref, id, s, to(id)), s).addressable - base)
  }
  const rows: ChangeRow[] = ids.map((id, i) => ({ id, from: from(id), to: to(id), delta: delta[i] }))
  const residual = total - delta.reduce((a, b) => a + b, 0)
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return { rows, residual: Math.abs(residual) < 1e-9 ? 0 : residual, total }
}

export function buildSnapshot(params: Params, reference: Params, scenario: number): Snapshot {
  const results = computeAll(params)
  const refResults = computeAll(reference)
  const active = results[scenario]
  const activeRef = refResults[scenario]
  const trajectory = [0, 1, 2].map((s) => Array.from({ length: HORIZON + 1 }, (_, t) => computeScenario(params, s, t)))
  return {
    params, reference, scenario, results, refResults, active, activeRef, trajectory,
    sensitivity: sensitivity(params, scenario, active.addressable),
    changes: changes(params, reference, scenario, active.addressable, activeRef.addressable),
  }
}

let cache: { p: Params; r: Params; s: number; snap: Snapshot } | null = null
/** Version mémoïsée (identité des objets) : un seul calcul pour tous les composants. */
export function getSnapshot(params: Params, reference: Params, scenario: number): Snapshot {
  if (cache && cache.p === params && cache.r === reference && cache.s === scenario) return cache.snap
  const snap = buildSnapshot(params, reference, scenario)
  cache = { p: params, r: reference, s: scenario, snap }
  return snap
}
