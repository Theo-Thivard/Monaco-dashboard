// Réécriture TypeScript du modèle Excel « Monaco_Besoins_IT_v2.xlsx »
// (onglets 1_Inputs&Hyp -> 2_Calculs -> 3_Output). Les numéros de lignes
// mentionnés correspondent à l'onglet 1_Inputs&Hyp.

export const SCENARIOS = ['Bas', 'Central', 'Haut'] as const
export type ScenarioIdx = 0 | 1 | 2
export const HORIZON = 9 // 2026 -> 2035

export type Unit = 'pct' | 'w' | 'n' | 'x'

export interface HypDef {
  id: string
  label: string
  group: string
  unit: Unit
  /** true = une seule valeur (pas de déclinaison Bas/Central/Haut) */
  single?: boolean
  min: number
  max: number
  step: number
  def: number[] // [bas, central, haut] ou [valeur]
  note?: string
}

export const HYPS: HypDef[] = [
  // B. Hypothèses hors DSP/CHPG (lignes 34-51)
  { id: 'gEffPub', label: 'Croissance effectifs publics', group: 'eff', unit: 'pct', min: -0.02, max: 0.03, step: 0.001, def: [0, 0.005, 0.01] },
  { id: 'gEffFin', label: 'Croissance effectifs finance', group: 'eff', unit: 'pct', min: -0.02, max: 0.03, step: 0.001, def: [0, 0.005, 0.01] },
  { id: 'gEffPriv', label: 'Croissance effectifs privé hors finance', group: 'eff', unit: 'pct', min: -0.02, max: 0.03, step: 0.001, def: [0, 0.005, 0.01] },
  { id: 'gIntPub', label: 'Intensité numérique hors IA – public', group: 'int', unit: 'pct', min: 0, max: 0.12, step: 0.001, def: [0.02, 0.04, 0.06] },
  { id: 'gIntFin', label: 'Intensité numérique hors IA – finance', group: 'int', unit: 'pct', min: 0, max: 0.12, step: 0.001, def: [0.03, 0.05, 0.07] },
  { id: 'gIntPriv', label: 'Intensité numérique hors IA – hors finance', group: 'int', unit: 'pct', min: 0, max: 0.12, step: 0.001, def: [0.02, 0.04, 0.06] },
  { id: 'iaPub', label: 'Surcouche IA 2035 – public', group: 'ia', unit: 'pct', min: 0, max: 0.8, step: 0.01, def: [0.05, 0.15, 0.3] },
  { id: 'iaFin', label: 'Surcouche IA 2035 – finance', group: 'ia', unit: 'pct', min: 0, max: 0.8, step: 0.01, def: [0.1, 0.25, 0.45] },
  { id: 'iaPriv', label: 'Surcouche IA 2035 – hors finance', group: 'ia', unit: 'pct', min: 0, max: 0.8, step: 0.01, def: [0.05, 0.15, 0.3] },
  { id: 'wFin', label: 'W IT / salarié finance – 2026', group: 'w', unit: 'w', single: true, min: 10, max: 200, step: 1, def: [80], note: 'Baseline 2026 commune aux 3 scénarios (colonne Bas dans l\'Excel)' },
  { id: 'wPriv', label: 'W IT / salarié hors finance – 2026', group: 'w', unit: 'w', single: true, min: 5, max: 100, step: 1, def: [30], note: 'Baseline 2026 commune aux 3 scénarios' },
  { id: 'wPub', label: 'W IT / agent public – socle non-métier DSP', group: 'w', unit: 'w', single: true, min: 5, max: 100, step: 1, def: [30], note: 'Baseline 2026 commune aux 3 scénarios' },
  { id: 'adrPub', label: 'Part adressable – public / CHPG / DSP / MT', group: 'adr', unit: 'pct', min: 0, max: 1, step: 0.01, def: [1, 1, 1] },
  { id: 'adrFin', label: 'Part adressable – finance', group: 'adr', unit: 'pct', min: 0, max: 1, step: 0.01, def: [0.2, 0.35, 0.5] },
  { id: 'adrPriv', label: 'Part adressable – privé hors finance', group: 'adr', unit: 'pct', min: 0, max: 1, step: 0.01, def: [0.1, 0.2, 0.35] },
  { id: 'adrIaPub', label: 'Part adressable surcouche IA – public', group: 'adrIa', unit: 'pct', min: 0, max: 1, step: 0.01, def: [0.25, 0.6, 1] },
  { id: 'adrIaFin', label: 'Part adressable surcouche IA – finance', group: 'adrIa', unit: 'pct', min: 0, max: 1, step: 0.01, def: [0.15, 0.4, 0.75] },
  { id: 'adrIaPriv', label: 'Part adressable surcouche IA – hors finance', group: 'adrIa', unit: 'pct', min: 0, max: 1, step: 0.01, def: [0.1, 0.3, 0.6] },
  // C. DSP – vidéo (lignes 57-62)
  { id: 'camBase', label: 'Caméras 2026', group: 'video', unit: 'n', single: true, min: 500, max: 3000, step: 10, def: [1300] },
  { id: 'camAdd', label: 'Ajout annuel de caméras', group: 'video', unit: 'n', single: true, min: 0, max: 200, step: 5, def: [50] },
  { id: 'bitrate', label: 'Facteur bitrate 8MP / 2MP', group: 'video', unit: 'x', single: true, min: 1, max: 8, step: 0.05, def: [3.953125], note: 'Benchmark Axis H.265' },
  // D. CHPG (lignes 67-68)
  { id: 'gChpg', label: 'Croissance annuelle activité CHPG', group: 'chpg', unit: 'pct', min: -0.02, max: 0.04, step: 0.001, def: [0, 0.005, 0.01] },
  { id: 'santeChpg', label: 'Surcroît métier santé / digitalisation 2035', group: 'chpg', unit: 'pct', min: 0, max: 0.5, step: 0.01, def: [0.05, 0.1, 0.2],
    note: 'Sans effet dans l\'Excel actuel (I63 = H13·H63·G63 avec H13 = 0). Activer « corriger CHPG » dans les options.' },
]

export const HYP_BY_ID: Record<string, HypDef> = Object.fromEntries(HYPS.map((h) => [h.id, h]))

export const GROUPS: { id: string; title: string }[] = [
  { id: 'eff', title: 'Croissance annuelle des effectifs' },
  { id: 'int', title: 'Intensité numérique hors IA (p.a.)' },
  { id: 'ia', title: 'Surcouche IA 2035' },
  { id: 'adr', title: 'Part adressable Monaco – socle' },
  { id: 'adrIa', title: 'Part adressable Monaco – surcouche IA' },
  { id: 'w', title: 'Baseline 2026 – W IT par utilisateur' },
  { id: 'video', title: 'DSP – applications métier (vidéo)' },
  { id: 'chpg', title: 'CHPG' },
]

export type Params = Record<string, number[]>

export const defaultParams = (): Params =>
  Object.fromEntries(HYPS.map((h) => [h.id, [...h.def]]))

export interface Options {
  /** Applique le surcroît santé au besoin métier CHPG (correction proposée) */
  fixChpg: boolean
}
export const defaultOptions: Options = { fixChpg: false }

// ---------------------------------------------------------------- baseline
export type Entity = 'DSP' | 'DENJS' | 'APDP' | 'DITN' | 'CHPG' | 'MT' | 'FIN' | 'PRIV'
export const ENTITIES: Entity[] = ['DSP', 'DENJS', 'APDP', 'DITN', 'CHPG', 'MT', 'FIN', 'PRIV']
export const ENTITY_LABEL: Record<Entity, string> = {
  DSP: 'DSP', DENJS: 'DENJS', APDP: 'APDP', DITN: 'DITN', CHPG: 'CHPG',
  MT: 'Monaco Telecom', FIN: 'Finance', PRIV: 'Privé hors finance',
}

// Constantes d'entrée (section A de 1_Inputs&Hyp, non pilotées par curseur)
const AGENTS_DSP = 628
const BASE_KW = { DSP: 80, DENJS: 10, APDP: 10, DITN: 80, CHPG: 80, MT: 160 }
const SALARIES_FIN = 4534
const SALARIES_PRIV = 55920

const val = (p: Params, id: string, s: number) => {
  const a = p[id]
  return a.length === 1 ? a[0] : a[s]
}

export interface BlockResult {
  id: Entity
  label: string
  base: number // kW baseline 2026
  nonMetier: number
  metier: number
  fAct: number
  fInt: number
  fMetier: number
  need: number // besoin hors IA (kW)
  needAct: number // besoin hors IA sans croissance d'intensité (pour la décomposition)
  ia: number // besoin IA (kW)
  total: number // besoin total (kW)
  adrShare: number
  adrIaShare: number
  addressable: number // demande adressable (kW)
}

export interface ScenarioResult {
  scenario: number
  year: number
  blocks: BlockResult[]
  base: number
  need: number
  ia: number
  total: number
  addressable: number
  rate: number
  growth: number
}

export function baseline(p: Params): Record<Entity, { metier: number; nonMetier: number }> {
  const dspNonMetier = (AGENTS_DSP * val(p, 'wPub', 0)) / 1000
  return {
    DSP: { metier: BASE_KW.DSP - dspNonMetier, nonMetier: dspNonMetier },
    DENJS: { metier: 0, nonMetier: BASE_KW.DENJS },
    APDP: { metier: 0, nonMetier: BASE_KW.APDP },
    DITN: { metier: 0, nonMetier: BASE_KW.DITN },
    CHPG: { metier: BASE_KW.CHPG, nonMetier: 0 },
    MT: { metier: 0, nonMetier: BASE_KW.MT },
    FIN: { metier: 0, nonMetier: (SALARIES_FIN * val(p, 'wFin', 0)) / 1000 },
    PRIV: { metier: 0, nonMetier: (SALARIES_PRIV * val(p, 'wPriv', 0)) / 1000 },
  }
}

/**
 * Calcule un scénario. year = 2026 + t, t ∈ [0, 9]. À t = 9 le résultat est
 * strictement celui de l'Excel ; pour t < 9 on interpole (croissances composées,
 * surcouche IA et facteur vidéo/santé montés linéairement) – ajout du dashboard.
 */
export function computeScenario(p: Params, s: number, t: number = HORIZON, opt: Options = defaultOptions): ScenarioResult {
  const k = t / HORIZON
  const g = (id: string) => Math.pow(1 + val(p, id, s), t)
  const base = baseline(p)
  const camFactor = (val(p, 'camBase', s) + HORIZON * val(p, 'camAdd', s)) / val(p, 'camBase', s)
  const dspVideo = 1 + (camFactor * val(p, 'bitrate', s) - 1) * k
  const chpgSante = Math.pow(1 + val(p, 'santeChpg', s), t)

  const pub = { eff: g('gEffPub'), int: g('gIntPub'), ia: val(p, 'iaPub', s), adr: val(p, 'adrPub', s), adrIa: val(p, 'adrIaPub', s) }
  const fin = { eff: g('gEffFin'), int: g('gIntFin'), ia: val(p, 'iaFin', s), adr: val(p, 'adrFin', s), adrIa: val(p, 'adrIaFin', s) }
  const priv = { eff: g('gEffPriv'), int: g('gIntPriv'), ia: val(p, 'iaPriv', s), adr: val(p, 'adrPriv', s), adrIa: val(p, 'adrIaPriv', s) }
  // Monaco Telecom : croissance effectifs/intensité/IA « hors finance », adressable socle « public »
  const mt = { eff: priv.eff, int: priv.int, ia: priv.ia, adr: pub.adr, adrIa: priv.adrIa }

  const param: Record<Entity, typeof pub> = { DSP: pub, DENJS: pub, APDP: pub, DITN: pub, CHPG: pub, MT: mt, FIN: fin, PRIV: { ...priv, adr: priv.adr } }
  const chpgAct = Math.pow(1 + val(p, 'gChpg', s), t)

  const blocks: BlockResult[] = ENTITIES.map((id) => {
    const b = base[id]
    const q = param[id]
    let fAct = q.eff
    let fMetier = 1
    let need: number
    let needAct: number
    if (id === 'DSP') {
      fMetier = dspVideo
      need = b.nonMetier * q.eff * q.int + b.metier * dspVideo
      needAct = b.nonMetier * q.eff + b.metier * dspVideo
    } else if (id === 'CHPG') {
      fAct = chpgAct
      fMetier = chpgSante
      // Excel : H13·H63·G63 + G13·F63·G63 (avec H13 = 0 -> le surcroît santé n'agit pas)
      const m = opt.fixChpg ? b.metier * chpgSante : b.metier
      need = b.nonMetier * chpgSante * q.int + m * chpgAct * q.int
      needAct = b.nonMetier * chpgSante + m * chpgAct
    } else {
      need = b.nonMetier * q.eff * q.int
      needAct = b.nonMetier * q.eff
    }
    const ia = need * q.ia * k
    return {
      id, label: ENTITY_LABEL[id], base: b.metier + b.nonMetier, nonMetier: b.nonMetier, metier: b.metier,
      fAct, fInt: q.int, fMetier, need, needAct, ia, total: need + ia,
      adrShare: q.adr, adrIaShare: q.adrIa, addressable: need * q.adr + ia * q.adrIa,
    }
  })
  const sum = (f: (b: BlockResult) => number) => blocks.reduce((a, b) => a + f(b), 0)
  const total = sum((b) => b.total)
  const addressable = sum((b) => b.addressable)
  const baseTot = sum((b) => b.base)
  return {
    scenario: s, year: 2026 + t, blocks, base: baseTot, need: sum((b) => b.need), ia: sum((b) => b.ia),
    total, addressable, rate: total ? addressable / total : 0, growth: baseTot ? total / baseTot : 0,
  }
}

export const computeAll = (p: Params, opt: Options = defaultOptions, t: number = HORIZON) =>
  [0, 1, 2].map((s) => computeScenario(p, s, t, opt))

// Regroupement identique à 3_Output (DENJS + APDP + DITN)
export interface GroupDef { id: string; label: string; members: Entity[] }
export const OUTPUT_GROUPS: GroupDef[] = [
  { id: 'DSP', label: 'DSP', members: ['DSP'] },
  { id: 'PUB', label: 'DENJS + APDP + DITN', members: ['DENJS', 'APDP', 'DITN'] },
  { id: 'CHPG', label: 'CHPG', members: ['CHPG'] },
  { id: 'MT', label: 'Monaco Telecom', members: ['MT'] },
  { id: 'FIN', label: 'Finance', members: ['FIN'] },
  { id: 'PRIV', label: 'Privé hors finance', members: ['PRIV'] },
]

export function groupBlocks(r: ScenarioResult) {
  return OUTPUT_GROUPS.map((g) => {
    const bs = r.blocks.filter((b) => g.members.includes(b.id))
    const sum = (f: (b: BlockResult) => number) => bs.reduce((a, b) => a + f(b), 0)
    return { id: g.id, label: g.label, base: sum((b) => b.base), need: sum((b) => b.need), ia: sum((b) => b.ia), total: sum((b) => b.total), addressable: sum((b) => b.addressable) }
  })
}

// ---------------------------------------------------------------- sensibilité
export interface TornadoRow { id: string; label: string; low: number; high: number; lowVal: number; highVal: number }

/** Impact (en kW adressables 2035) de chaque hypothèse sur le scénario s :
 *  on remplace sa valeur par la valeur Bas et par la valeur Haut de l'Excel
 *  (±20 % pour les hypothèses à valeur unique). */
export function tornado(p: Params, s: number, opt: Options = defaultOptions): { rows: TornadoRow[]; center: number } {
  const center = computeScenario(p, s, HORIZON, opt).addressable
  const rows: TornadoRow[] = []
  for (const h of HYPS) {
    const cur = h.single ? p[h.id][0] : p[h.id][s]
    const alt = h.single
      ? [cur * 0.8, cur * 1.2]
      : [Math.min(...p[h.id]), Math.max(...p[h.id])]
    if (alt[0] === alt[1]) continue
    const run = (v: number) => {
      const q: Params = { ...p, [h.id]: h.single ? [v] : p[h.id].map((x, i) => (i === s ? v : x)) }
      return computeScenario(q, s, HORIZON, opt).addressable
    }
    const lo = run(alt[0]) - center
    const hi = run(alt[1]) - center
    if (Math.abs(lo) < 1e-9 && Math.abs(hi) < 1e-9) continue
    rows.push({ id: h.id, label: h.label, low: lo, high: hi, lowVal: alt[0], highVal: alt[1] })
  }
  rows.sort((a, b) => Math.max(Math.abs(b.low), Math.abs(b.high)) - Math.max(Math.abs(a.low), Math.abs(a.high)))
  return { rows, center }
}

export function fmtValue(unit: Unit, v: number): string {
  switch (unit) {
    case 'pct': return (v * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %'
    case 'w': return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' W'
    case 'x': return v.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' x'
    default: return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
  }
}
