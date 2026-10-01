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
  /** Δ de demande adressable (kW) imputable à cette seule hypothèse */
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

function changes(p: Params, ref: Params, s: number, cur: number, base: number) {
  const rows: ChangeRow[] = []
  for (const h of HYPS) {
    if (!hypDiffers(p, ref, h.id, s)) continue
    const to = hypValue(p, h.id, s)
    const only = computeScenario(withValue(ref, h.id, s, to), s).addressable
    rows.push({ id: h.id, from: hypValue(ref, h.id, s), to, delta: only - base })
  }
  const total = cur - base
  const sum = rows.reduce((a, r) => a + r.delta, 0)
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return { rows, residual: total - sum, total }
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
