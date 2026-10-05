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
  // libellés = titres de cellule (« Besoin IT en 2026 ») : la valeur de 2026 vient toujours avant celles de 2035 ; l'unité est dans la cellule (modifiable)
  { id: 'base', label: 'Besoin IT en 2026', description: 'Puissance IT générée par l\'économie monégasque en 2026, point de départ de toutes les projections', category: 'Demande', format: 'power', lenses: ['need', 'addressable'], defaultVisible: true, compute: (v) => v.r.base },
  { id: 'need', label: 'Besoin IT en 2035', description: 'Puissance IT générée par l\'économie monégasque en 2035, avant application des parts hébergeables à Monaco', category: 'Demande', format: 'power', lenses: ['need', 'addressable'], defaultVisible: true, compute: (v) => v.r.total },
  { id: 'addressable', label: 'Demande adressable en 2035', description: 'Puissance IT qui sera réellement hébergée à Monaco en 2035 (besoin classique + IA)', category: 'Demande', format: 'power', lenses: ['addressable'], defaultVisible: true, compute: (v) => v.r.addressable },
  { id: 'rate', label: 'Taux adressable en 2035', description: 'Part du besoin 2035 hébergée à Monaco : demande adressable ÷ besoin total', category: 'Structure', format: 'pct', lenses: ['addressable'], defaultVisible: true, compute: (v) => v.r.rate },
  { id: 'cagr', label: 'Taux de croissance annuel moyen du besoin de 2026 à 2035', description: 'Croissance moyenne du besoin total par an entre 2026 et 2035', category: 'Demande', format: 'pct', lenses: ['need'], defaultVisible: true, compute: (v) => Math.pow(v.r.growth, 1 / HORIZON) - 1 },
  { id: 'growth', label: 'Multiplicateur du besoin de 2026 à 2035', description: 'Besoin 2035 ÷ besoin 2026 : combien de fois le besoin est multiplié sur la période', category: 'Demande', format: 'ratio', lenses: ['need'], defaultVisible: false, compute: (v) => v.r.growth },
  { id: 'aiNeed', label: 'Surcouche IA du besoin en 2035', description: 'Puissance IT supplémentaire due à l\'IA en 2035, en plus du besoin classique', category: 'Demande', format: 'power', lenses: ['need'], defaultVisible: false, compute: (v) => v.r.ia },
  { id: 'aiShare', label: 'Part de l\'IA dans le besoin en 2035', description: 'Surcouche IA ÷ besoin total en 2035', category: 'Structure', format: 'pct', lenses: ['need'], defaultVisible: false, compute: (v) => (v.r.total ? v.r.ia / v.r.total : 0) },
  { id: 'aiAddressable', label: 'Demande adressable liée à l\'IA en 2035', description: 'Part de la surcouche IA qui sera hébergée à Monaco en 2035', category: 'Structure', format: 'power', lenses: ['addressable'], defaultVisible: false, compute: (v) => v.r.addrIa },
  { id: 'captiveShare', label: 'Part du secteur public dans l\'adressable en 2035', description: 'Demande adressable du secteur public et de Monaco Telecom ÷ demande adressable totale : la part la plus sûre', category: 'Structure', format: 'pct', lenses: ['addressable'], defaultVisible: false, compute: (v) => (v.r.addressable ? sumCaptive(v.r, 'addressable') / v.r.addressable : 0) },
  { id: 'financeAddr', label: 'Adressable finance en 2035', description: 'Demande adressable du secteur financier', category: 'Structure', format: 'power', lenses: ['addressable'], defaultVisible: false, compute: (v) => groupBlocks(v.r).find((g) => g.id === 'FIN')!.addressable },
  { id: 'privAddr', label: 'Adressable privé hors finance en 2035', description: 'Demande adressable du privé hors finance', category: 'Structure', format: 'power', lenses: ['addressable'], defaultVisible: false, compute: (v) => groupBlocks(v.r).find((g) => g.id === 'PRIV')!.addressable },
  { id: 'rangeNeed', label: 'Amplitude Bas – Haut en 2035', description: 'Besoin IT 2035 du scénario Haut moins celui du scénario Bas', category: 'Incertitude', format: 'power', lenses: ['need'], defaultVisible: false, compute: (v) => v.all[2].total - v.all[0].total },
  { id: 'range', label: 'Amplitude Bas – Haut, adressable en 2035', description: 'Demande adressable 2035 du scénario Haut moins celle du scénario Bas', category: 'Incertitude', format: 'power', lenses: ['addressable'], defaultVisible: false, compute: (v) => v.all[2].addressable - v.all[0].addressable },
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
  { id: 'base', label: 'Besoin en 2026', description: 'Puissance IT de l\'acteur en 2026, point de départ des projections', format: 'power', lenses: ['need', 'addressable'], compute: (v) => v.b.base },
  { id: 'need', label: 'Besoin en 2035', description: 'Puissance IT générée par l\'acteur en 2035, avant part hébergeable à Monaco', format: 'power', lenses: ['need', 'addressable'], compute: (v) => v.b.total },
  { id: 'addressable', label: 'Demande adressable en 2035', description: 'Puissance IT de l\'acteur hébergée à Monaco en 2035 (besoin classique + IA)', format: 'power', lenses: ['addressable'], compute: (v) => v.b.addressable },
  { id: 'rate', label: 'Part captable en 2035', description: 'Demande adressable ÷ besoin 2035 de l\'acteur', format: 'pct', lenses: ['addressable'], compute: (v) => (v.b.total ? v.b.addressable / v.b.total : 0) },
  { id: 'weight', label: 'Poids dans l\'adressable Monaco en 2035', description: 'Part de l\'acteur dans la demande adressable totale', format: 'pct', lenses: ['addressable'], compute: (v) => (v.r.addressable ? v.b.addressable / v.r.addressable : 0) },
  { id: 'weightNeed', label: 'Poids dans le besoin Monaco en 2035', description: 'Part de l\'acteur dans le besoin IT total 2035', format: 'pct', lenses: ['need'], compute: (v) => (v.r.total ? v.b.total / v.r.total : 0) },
  { id: 'growth', label: 'Multiplicateur de 2026 à 2035', description: 'Besoin 2035 ÷ besoin 2026 : combien de fois le besoin est multiplié sur la période', format: 'ratio', lenses: ['need'], compute: (v) => (v.b.base ? v.b.total / v.b.base : 0) },
]

export const ACTOR_KPI_BY_ID: Record<string, ActorKpiDef> = Object.fromEntries(ACTOR_KPI_DEFS.map((k) => [k.id, k]))
export const defaultActorKpiOrder = () => ACTOR_KPI_DEFS.map((k) => k.id)
/** Par défaut tous les indicateurs sont cochés : chaque lecture (besoins générés / adressables) n'en montre que ceux qui la concernent. */
export const defaultActorKpiVisible = () => ACTOR_KPI_DEFS.map((k) => k.id)
export const actorKpisForLens = (ids: string[], lens: Lens) => ids.filter((id) => ACTOR_KPI_BY_ID[id]?.lenses.includes(lens))
