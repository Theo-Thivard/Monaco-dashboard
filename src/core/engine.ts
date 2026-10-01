// Réécriture TypeScript du modèle Excel « Monaco_Besoins_IT_v2.xlsx »
// (onglets 1_Inputs&Hyp -> 2_Calculs -> 3_Output). Les numéros de lignes
// mentionnés correspondent à l'onglet 1_Inputs&Hyp.

import { hypValue, type Params } from './hypotheses'

export const SCENARIOS = ['Bas', 'Central', 'Haut'] as const
export const HORIZON = 9 // 2026 -> 2035

export type ScenarioIdx = 0 | 1 | 2

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

const val = hypValue

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
  addressable: number // demande adressable (kW) = addrBase + addrIa
  addrBase: number // part adressable du besoin hors IA (kW)
  addrIa: number // part adressable de la surcouche IA (kW)
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
  addressable: number
  addrBase: number
  addrIa: number
  dAct: number
  dInt: number
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
export function computeScenario(p: Params, s: number, t: number = HORIZON): ScenarioResult {
  const fixChpg = val(p, 'fixChpg', s) === 1
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
      const m = fixChpg ? b.metier * chpgSante : b.metier
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
      adrShare: q.adr, adrIaShare: q.adrIa, addrBase: need * q.adr, addrIa: ia * q.adrIa, addressable: need * q.adr + ia * q.adrIa,
      dAct: needAct - (b.metier + b.nonMetier), dInt: need - needAct,
    }
  })
  const sum = (f: (b: BlockResult) => number) => blocks.reduce((a, b) => a + f(b), 0)
  const total = sum((b) => b.total)
  const addressable = sum((b) => b.addressable)
  const baseTot = sum((b) => b.base)
  return {
    scenario: s, year: 2026 + t, blocks, base: baseTot, need: sum((b) => b.need), ia: sum((b) => b.ia),
    total, addressable, addrBase: sum((b) => b.addrBase), addrIa: sum((b) => b.addrIa), dAct: sum((b) => b.dAct), dInt: sum((b) => b.dInt), rate: total ? addressable / total : 0, growth: baseTot ? total / baseTot : 0,
  }
}

export const computeAll = (p: Params, t: number = HORIZON) => [0, 1, 2].map((s) => computeScenario(p, s, t))

// Regroupement identique à 3_Output (DENJS + APDP + DITN)
export interface GroupDef { id: string; label: string; members: Entity[]; /** besoin porté par le secteur public / l'opérateur (part captable conventionnelle) */ captive: boolean }
export const OUTPUT_GROUPS: GroupDef[] = [
  { id: 'DSP', label: 'DSP', members: ['DSP'], captive: true },
  { id: 'PUB', label: 'DENJS + APDP + DITN', members: ['DENJS', 'APDP', 'DITN'], captive: true },
  { id: 'CHPG', label: 'CHPG', members: ['CHPG'], captive: true },
  { id: 'MT', label: 'Monaco Telecom', members: ['MT'], captive: true },
  { id: 'FIN', label: 'Finance', members: ['FIN'], captive: false },
  { id: 'PRIV', label: 'Privé hors finance', members: ['PRIV'], captive: false },
]

export interface GroupResult {
  id: string; label: string; captive: boolean
  base: number; need: number; ia: number; total: number
  addressable: number; addrBase: number; addrIa: number; dAct: number; dInt: number
}

export function groupBlocks(r: ScenarioResult): GroupResult[] {
  return OUTPUT_GROUPS.map((g) => {
    const bs = r.blocks.filter((b) => g.members.includes(b.id))
    const sum = (f: (b: BlockResult) => number) => bs.reduce((a, b) => a + f(b), 0)
    return {
      id: g.id, label: g.label, captive: g.captive,
      base: sum((b) => b.base), need: sum((b) => b.need), ia: sum((b) => b.ia), total: sum((b) => b.total),
      addressable: sum((b) => b.addressable), addrBase: sum((b) => b.addrBase), addrIa: sum((b) => b.addrIa),
      dAct: sum((b) => b.dAct), dInt: sum((b) => b.dInt),
    }
  })
}
