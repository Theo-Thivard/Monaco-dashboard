// Registre des KPI : chaque indicateur est défini une seule fois ici.

import type { FormatKind } from './hypotheses'
import type { Lens } from './lens'
import { groupBlocks, HORIZON, type BlockResult, type ScenarioResult } from './engine'

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
  /** lentilles dans lesquelles l'indicateur est proposé */
  lenses: Lens[]
  defaultVisible: boolean
  compute: (v: KpiView) => number
}

const sumCaptive = (r: ScenarioResult, key: 'addressable') =>
  groupBlocks(r).filter((g) => g.captive).reduce((a, g) => a + g[key], 0)

export const KPI_DEFS: KpiDef[] = [
  // légende « [date] » : la valeur de 2026 vient toujours avant celles de 2035 ; l'unité est dans la cellule (modifiable)
  { id: 'base', label: 'Besoin IT [2026]', description: 'Puissance IT générée en 2026 (baseline)', category: 'Demande', format: 'power', lenses: ['need', 'addressable'], defaultVisible: true, compute: (v) => v.r.base },
  { id: 'need', label: 'Besoin IT [2035]', description: 'Puissance IT générée par l\'économie monégasque en 2035, avant part captable', category: 'Demande', format: 'power', lenses: ['need', 'addressable'], defaultVisible: true, compute: (v) => v.r.total },
  { id: 'addressable', label: 'Demande adressable [2035]', description: 'Puissance IT hébergeable à Monaco en 2035 (socle + IA)', category: 'Demande', format: 'power', lenses: ['addressable'], defaultVisible: true, compute: (v) => v.r.addressable },
  { id: 'rate', label: 'Taux adressable [2035]', description: 'Demande adressable en % du besoin total 2035', category: 'Structure', format: 'pct', lenses: ['addressable'], defaultVisible: true, compute: (v) => v.r.rate },
  { id: 'cagr', label: 'TCAM du besoin [2026-2035]', description: 'Taux de croissance annuel moyen (TCAM) du besoin total, de 2026 à 2035', category: 'Demande', format: 'pct', lenses: ['need'], defaultVisible: true, compute: (v) => Math.pow(v.r.growth, 1 / HORIZON) - 1 },
  { id: 'growth', label: 'Multiplicateur du besoin [2026-2035]', description: 'Besoin 2035 / besoin 2026', category: 'Demande', format: 'ratio', lenses: ['need'], defaultVisible: false, compute: (v) => v.r.growth },
  { id: 'aiNeed', label: 'Surcouche IA du besoin [2035]', description: 'Besoin IT additionnel lié à l\'IA en 2035', category: 'Demande', format: 'power', lenses: ['need'], defaultVisible: false, compute: (v) => v.r.ia },
  { id: 'aiShare', label: 'Part de l\'IA dans le besoin [2035]', description: 'Surcouche IA / besoin total 2035', category: 'Structure', format: 'pct', lenses: ['need'], defaultVisible: false, compute: (v) => (v.r.total ? v.r.ia / v.r.total : 0) },
  { id: 'aiAddressable', label: 'Demande adressable liée à l\'IA [2035]', description: 'Part de la surcouche IA hébergée à Monaco', category: 'Structure', format: 'power', lenses: ['addressable'], defaultVisible: false, compute: (v) => v.r.addrIa },
  { id: 'captiveShare', label: 'Part du secteur public dans l\'adressable [2035]', description: 'Demande adressable du secteur public et de Monaco Telecom / total adressable : socle le plus sûr', category: 'Structure', format: 'pct', lenses: ['addressable'], defaultVisible: false, compute: (v) => (v.r.addressable ? sumCaptive(v.r, 'addressable') / v.r.addressable : 0) },
  { id: 'financeAddr', label: 'Adressable finance [2035]', description: 'Demande adressable du secteur financier', category: 'Structure', format: 'power', lenses: ['addressable'], defaultVisible: false, compute: (v) => groupBlocks(v.r).find((g) => g.id === 'FIN')!.addressable },
  { id: 'privAddr', label: 'Adressable privé hors finance [2035]', description: 'Demande adressable du privé hors finance', category: 'Structure', format: 'power', lenses: ['addressable'], defaultVisible: false, compute: (v) => groupBlocks(v.r).find((g) => g.id === 'PRIV')!.addressable },
  { id: 'rangeNeed', label: 'Amplitude Bas – Haut [2035]', description: 'Écart de besoin IT 2035 entre les scénarios Haut et Bas', category: 'Incertitude', format: 'power', lenses: ['need'], defaultVisible: false, compute: (v) => v.all[2].total - v.all[0].total },
  { id: 'range', label: 'Amplitude Bas – Haut, adressable [2035]', description: 'Écart de demande adressable entre les scénarios Haut et Bas', category: 'Incertitude', format: 'power', lenses: ['addressable'], defaultVisible: false, compute: (v) => v.all[2].addressable - v.all[0].addressable },
]

export const KPI_BY_ID: Record<string, KpiDef> = Object.fromEntries(KPI_DEFS.map((k) => [k.id, k]))
export const defaultKpiOrder = () => KPI_DEFS.map((k) => k.id)
export const defaultKpiVisible = () => KPI_DEFS.filter((k) => k.defaultVisible).map((k) => k.id)

export function kpiValue(def: KpiDef, active: ScenarioResult, all: ScenarioResult[]): number {
  return def.compute({ r: active, all })
}

export const kpisForLens = (ids: string[], lens: Lens) => ids.filter((id) => KPI_BY_ID[id]?.lenses.includes(lens))

// ------------------------------------------------------------------ KPI d'un acteur
export interface ActorKpiDef {
  id: string
  label: string
  description: string
  format: FormatKind
  lenses: Lens[]
  compute: (v: { b: BlockResult; r: ScenarioResult }) => number
}

export const ACTOR_KPI_DEFS: ActorKpiDef[] = [
  { id: 'base', label: 'Besoin [2026]', description: 'Puissance IT de l\'acteur en 2026 (baseline)', format: 'power', lenses: ['need', 'addressable'], compute: (v) => v.b.base },
  { id: 'need', label: 'Besoin [2035]', description: 'Puissance IT générée par l\'acteur en 2035', format: 'power', lenses: ['need', 'addressable'], compute: (v) => v.b.total },
  { id: 'addressable', label: 'Demande adressable [2035]', description: 'Puissance IT de l\'acteur hébergeable à Monaco en 2035 (socle + IA)', format: 'power', lenses: ['addressable'], compute: (v) => v.b.addressable },
  { id: 'rate', label: 'Part captable [2035]', description: 'Demande adressable / besoin 2035 de l\'acteur', format: 'pct', lenses: ['addressable'], compute: (v) => (v.b.total ? v.b.addressable / v.b.total : 0) },
  { id: 'weight', label: 'Poids dans l\'adressable Monaco [2035]', description: 'Part de l\'acteur dans la demande adressable totale', format: 'pct', lenses: ['addressable'], compute: (v) => (v.r.addressable ? v.b.addressable / v.r.addressable : 0) },
  { id: 'weightNeed', label: 'Poids dans le besoin Monaco [2035]', description: 'Part de l\'acteur dans le besoin IT total 2035', format: 'pct', lenses: ['need'], compute: (v) => (v.r.total ? v.b.total / v.r.total : 0) },
  { id: 'growth', label: 'Multiplicateur [2026-2035]', description: 'Besoin 2035 / besoin 2026', format: 'ratio', lenses: ['need'], compute: (v) => (v.b.base ? v.b.total / v.b.base : 0) },
]
