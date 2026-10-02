// Instantané du modèle : TOUTES les valeurs dérivées (scénarios, trajectoires,
// sensibilité) sont calculées ici, une seule fois par changement d'hypothèse.
// KPI, graphiques, tableaux et infobulles ne font que lire cet objet.

import { computeAll, computeScenario, HORIZON, type ScenarioResult } from './engine'
import { HYPS, withValue, type Params } from './hypotheses'
import { lensValue, type Lens } from './lens'

export interface SensitivityRow {
  id: string
  /** Δ de l'indicateur de la lentille (kW) quand l'hypothèse passe à sa valeur basse / haute */
  low: number
  high: number
  lowVal: number
  highVal: number
}

export interface Snapshot {
  params: Params
  scenario: number
  /** lentille de lecture : besoins générés (livrable 2) ou adressables (livrable 3) */
  lens: Lens
  results: ScenarioResult[]
  active: ScenarioResult
  trajectory: ScenarioResult[][]
  sensitivity: SensitivityRow[]
}

/** Plage testée pour la sensibilité : bornes Bas/Haut de l'Excel, ±20 % pour les valeurs uniques. */
export function sensitivityRange(id: string): [number, number] | null {
  const h = HYPS.find((x) => x.id === id)!
  if (h.control !== 'slider') return null
  const lo = h.single ? h.def[0] * 0.8 : Math.min(...h.def)
  const hi = h.single ? h.def[0] * 1.2 : Math.max(...h.def)
  return lo === hi ? null : [Math.max(h.min, lo), Math.min(h.max, hi)]
}

/** Sensibilité d'un indicateur (par défaut : besoin total) à chaque hypothèse. */
export function sensitivityFor(p: Params, s: number, metric: (r: ScenarioResult) => number = (r) => r.total): SensitivityRow[] {
  const center = metric(computeScenario(p, s))
  const rows: SensitivityRow[] = []
  for (const h of HYPS) {
    const r = sensitivityRange(h.id)
    if (!r) continue
    const run = (v: number) => metric(computeScenario(withValue(p, h.id, s, v), s)) - center
    const low = run(r[0])
    const high = run(r[1])
    if (Math.abs(low) < 1e-9 && Math.abs(high) < 1e-9) continue
    rows.push({ id: h.id, low, high, lowVal: r[0], highVal: r[1] })
  }
  return rows.sort((a, b) => Math.max(Math.abs(b.low), Math.abs(b.high)) - Math.max(Math.abs(a.low), Math.abs(a.high)))
}

export function buildSnapshot(params: Params, scenario: number, lens: Lens = 'need'): Snapshot {
  const results = computeAll(params)
  const trajectory = [0, 1, 2].map((s) => Array.from({ length: HORIZON + 1 }, (_, t) => computeScenario(params, s, t)))
  return { params, scenario, lens, results, active: results[scenario], trajectory, sensitivity: sensitivityFor(params, scenario, (r) => lensValue(r, lens)) }
}

let cache: { p: Params; s: number; l: Lens; snap: Snapshot } | null = null
/** Version mémoïsée (identité des objets) : un seul calcul pour tous les composants. */
export function getSnapshot(params: Params, scenario: number, lens: Lens): Snapshot {
  if (cache && cache.p === params && cache.s === scenario && cache.l === lens) return cache.snap
  const snap = buildSnapshot(params, scenario, lens)
  cache = { p: params, s: scenario, l: lens, snap }
  return snap
}
