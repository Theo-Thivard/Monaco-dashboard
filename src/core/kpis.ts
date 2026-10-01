// Registre des KPI : chaque indicateur est défini une seule fois ici.
// La même fonction `compute` sert à la valeur courante ET à la valeur de
// référence, donc l'écart affiché est cohérent par construction.

import type { FormatKind } from './hypotheses'
import { groupBlocks, HORIZON, SCENARIOS, type ScenarioResult } from './engine'

export interface KpiView {
  /** résultat du scénario actif */
  r: ScenarioResult
  /** les trois scénarios (même jeu d'hypothèses) */
  all: ScenarioResult[]
}

export interface KpiDef {
  id: string
  label: string
  description: string
  category: 'Demande' | 'Structure' | 'Incertitude'
  format: FormatKind
  /** libellé de l'écart : pts pour des pourcentages, % pour le reste */
  delta: 'relative' | 'points' | 'absolute'
  /** une hausse est-elle une bonne nouvelle pour le client ? (couleur de l'écart) */
  higherIsBetter: boolean | null
  defaultVisible: boolean
  compute: (v: KpiView) => number
}

const sumCaptive = (r: ScenarioResult, key: 'addressable') =>
  groupBlocks(r).filter((g) => g.captive).reduce((a, g) => a + g[key], 0)

export const KPI_DEFS: KpiDef[] = [
  { id: 'addressable', label: 'Demande adressable 2035', description: 'Puissance IT hébergeable à Monaco en 2035 (socle + IA)', category: 'Demande', format: 'power', delta: 'relative', higherIsBetter: true, defaultVisible: true, compute: (v) => v.r.addressable },
  { id: 'need', label: 'Besoin IT total 2035', description: 'Puissance IT générée par l\'économie monégasque en 2035, avant part captable', category: 'Demande', format: 'power', delta: 'relative', higherIsBetter: null, defaultVisible: true, compute: (v) => v.r.total },
  { id: 'rate', label: 'Taux adressable', description: 'Demande adressable en % du besoin total 2035', category: 'Structure', format: 'pct', delta: 'points', higherIsBetter: true, defaultVisible: true, compute: (v) => v.r.rate },
  { id: 'cagr', label: 'Croissance annuelle du besoin', description: 'Taux de croissance annuel moyen du besoin total 2026 → 2035', category: 'Demande', format: 'pct', delta: 'points', higherIsBetter: null, defaultVisible: true, compute: (v) => Math.pow(v.r.growth, 1 / HORIZON) - 1 },
  { id: 'base', label: 'Besoin IT 2026', description: 'Puissance IT générée en 2026 (baseline)', category: 'Demande', format: 'power', delta: 'relative', higherIsBetter: null, defaultVisible: false, compute: (v) => v.r.base },
  { id: 'growth', label: 'Multiplicateur 2026 → 2035', description: 'Besoin 2035 / besoin 2026', category: 'Demande', format: 'ratio', delta: 'absolute', higherIsBetter: null, defaultVisible: false, compute: (v) => v.r.growth },
  { id: 'aiNeed', label: 'Surcouche IA (besoin)', description: 'Besoin IT additionnel lié à l\'IA en 2035', category: 'Demande', format: 'power', delta: 'relative', higherIsBetter: null, defaultVisible: false, compute: (v) => v.r.ia },
  { id: 'aiShare', label: 'Part de l\'IA dans le besoin', description: 'Surcouche IA / besoin total 2035', category: 'Structure', format: 'pct', delta: 'points', higherIsBetter: null, defaultVisible: false, compute: (v) => (v.r.total ? v.r.ia / v.r.total : 0) },
  { id: 'aiAddressable', label: 'Demande adressable liée à l\'IA', description: 'Part de la surcouche IA hébergée à Monaco', category: 'Structure', format: 'power', delta: 'relative', higherIsBetter: true, defaultVisible: false, compute: (v) => v.r.addrIa },
  { id: 'captiveShare', label: 'Part du secteur public dans l\'adressable', description: 'Demande adressable du secteur public et de Monaco Telecom / total adressable : socle le plus sûr', category: 'Structure', format: 'pct', delta: 'points', higherIsBetter: null, defaultVisible: false, compute: (v) => (v.r.addressable ? sumCaptive(v.r, 'addressable') / v.r.addressable : 0) },
  { id: 'financeAddr', label: 'Adressable – finance', description: 'Demande adressable du secteur financier', category: 'Structure', format: 'power', delta: 'relative', higherIsBetter: true, defaultVisible: false, compute: (v) => groupBlocks(v.r).find((g) => g.id === 'FIN')!.addressable },
  { id: 'privAddr', label: 'Adressable – privé hors finance', description: 'Demande adressable du privé hors finance', category: 'Structure', format: 'power', delta: 'relative', higherIsBetter: true, defaultVisible: false, compute: (v) => groupBlocks(v.r).find((g) => g.id === 'PRIV')!.addressable },
  { id: 'range', label: 'Amplitude Bas – Haut', description: 'Écart de demande adressable entre les scénarios Haut et Bas', category: 'Incertitude', format: 'power', delta: 'relative', higherIsBetter: null, defaultVisible: false, compute: (v) => v.all[2].addressable - v.all[0].addressable },
]

export const KPI_BY_ID: Record<string, KpiDef> = Object.fromEntries(KPI_DEFS.map((k) => [k.id, k]))
export const defaultKpiOrder = () => KPI_DEFS.map((k) => k.id)
export const defaultKpiVisible = () => KPI_DEFS.filter((k) => k.defaultVisible).map((k) => k.id)

export function kpiValue(def: KpiDef, active: ScenarioResult, all: ScenarioResult[]): number {
  return def.compute({ r: active, all })
}

export interface KpiDelta {
  /** écart brut : fraction pour 'relative', fraction de points pour 'points', unité du KPI pour 'absolute' */
  value: number
  /** écart exprimé dans l'unité du KPI (pour affichage d'une 2ᵉ ligne) */
  abs: number
  direction: 'up' | 'down' | 'flat'
  tone: 'positive' | 'negative' | 'neutral'
}

export function kpiDelta(def: KpiDef, cur: number, ref: number): KpiDelta {
  const abs = cur - ref
  const value = def.delta === 'relative' ? (ref !== 0 ? abs / Math.abs(ref) : 0) : abs
  const flat = Math.abs(abs) < 1e-9
  const direction = flat ? 'flat' : abs > 0 ? 'up' : 'down'
  const tone = flat || def.higherIsBetter === null ? 'neutral' : (abs > 0) === def.higherIsBetter ? 'positive' : 'negative'
  return { value, abs, direction, tone }
}

export const SCENARIO_NAMES = SCENARIOS
