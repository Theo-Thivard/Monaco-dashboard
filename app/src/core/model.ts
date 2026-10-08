// Modèle de calcul = le classeur Excel lui-même.
// Toutes les valeurs ET toutes les formules sont lues dans l'Excel à chaque lancement ; les hypothèses du dashboard
// sont des valeurs imposées à certaines cellules d'entrée, puis le classeur entier est recalculé par l'évaluateur de formules.
// Le lien entre l'Excel et le dashboard se fait par INTITULÉS (lignes de la colonne D, en-têtes de colonnes), pas par numéros
// de cellules : insérer une ligne ou une colonne dans l'Excel ne casse rien tant que les intitulés restent.

import { HYPS, initHypotheses, type HypDef, type Params } from './hypotheses'
import { discoverHypotheses, type Effects } from './discover'
import { norm } from './text'
import { addr, Run, Workbook, type Sheet } from './xl/workbook'
import { XlError, type Val } from './xl/functions'

export type Entity = 'DSP' | 'AUTRES' | 'POMP' | 'DITN' | 'CHPG' | 'MT' | 'FIN' | 'PRIV'
export const ENTITIES: Entity[] = ['DSP', 'AUTRES', 'POMP', 'DITN', 'CHPG', 'MT', 'FIN', 'PRIV']
const ENTITY_MATCH: Record<Entity, (s: string) => boolean> = {
  DSP: (s) => s === 'dsp', AUTRES: (s) => s.startsWith('autres entites publiques'), POMP: (s) => s.includes('sapeurs pompiers') || s.startsWith('pompiers'), DITN: (s) => s === 'ditn', CHPG: (s) => s === 'chpg',
  MT: (s) => s.startsWith('monaco telecom'), FIN: (s) => s === 'finance', PRIV: (s) => s.startsWith('prive hors finance'),
}

export class ModelError extends Error {}

export interface Diagnostic { level: 'error' | 'warning' | 'info'; message: string; where?: string }

export interface ModelMeta {
  fileName: string
  source: 'github' | 'bundled' | 'file'
  loadedAt: number
  lastModified?: string
}

interface OutCells { base: number; need: number; iaRatio: number; ia: number; total: number; adrShare: number; adrIaShare: number; addressable: number }
interface ScenarioMap { blocks: Record<Entity, OutCells>; totals: Partial<OutCells> | null; title: string }

export interface Model {
  wb: Workbook
  meta: ModelMeta
  /** cellules d'entrée de chaque hypothèse (1 ou 3), identifiants globaux */
  hypCells: Record<string, number[]>
  /** adresses lisibles (F34, G34, H34) */
  hypAddr: Record<string, string[]>
  /** hypothèses pilotables lues dans l'Excel (voir discover.ts) et leurs groupes */
  hypDefs: HypDef[]
  hypCategories: { id: string; title: string }[]
  scenarios: ScenarioMap[]
  diagnostics: Diagnostic[]
  /** valeurs fixes de l'Excel (non pilotables) qui alimentent le résultat : étiquette, valeur, adresse */
  fixedInputs: { label: string; value: number; where: string }[]
  /** formule d'un bloc de sortie (pour affichage) */
  formulaFor: (scenario: number, entity: Entity, col: keyof OutCells) => { formula: string | null; where: string }
}

// ------------------------------------------------------------------ utilitaires
export { norm }

function findSheet(wb: Workbook, re: RegExp, what: string): Sheet {
  const s = wb.sheets.find((x) => re.test(norm(x.name)))
  if (!s) throw new ModelError(`Onglet « ${what} » introuvable dans l'Excel (onglets présents : ${wb.sheets.map((x) => x.name).join(', ')}).`)
  return s
}

/** Texte normalisé de chaque cellule texte d'un onglet. */
function labels(wb: Workbook, sh: Sheet): { row: number; col: number; text: string }[] {
  const out: { row: number; col: number; text: string }[] = []
  for (let r = 0; r < sh.rows; r++) for (let c = 0; c < sh.cols; c++) {
    const v = wb.consts[sh.id(r, c)]
    if (typeof v === 'string' && !wb.isFormula(sh.id(r, c))) out.push({ row: r, col: c, text: norm(v) })
  }
  return out
}

// ------------------------------------------------------------------ tableaux de résultats (2_Calculs)
function mapScenarios(wb: Workbook, calc: Sheet, diag: Diagnostic[]): ScenarioMap[] {
  const out: ScenarioMap[] = []
  const wantTitles = ['bas', 'central', 'haut']
  for (const key of wantTitles) {
    // plusieurs cellules s'appellent « Scénario bas » (en-têtes d'hypothèses, titres de tableaux) : on garde celle
    // dont l'en-tête « Baseline 2026 » suit de quelques lignes.
    let title: { row: number; col: number } | null = null
    let hdr = -1
    for (let r = 0; r < calc.rows && !title; r++) for (let c = 0; c < calc.cols && !title; c++) {
      const v = wb.consts[calc.id(r, c)]
      if (typeof v !== 'string' || wb.isFormula(calc.id(r, c)) || !new RegExp(`^scenario ${key}$`).test(norm(v))) continue
      for (let rr = r + 1; rr < Math.min(calc.rows, r + 6) && hdr < 0; rr++) {
        for (let cc = 0; cc < calc.cols; cc++) { const w = wb.consts[calc.id(rr, cc)]; if (typeof w === 'string' && norm(w).includes('baseline 2026')) { hdr = rr; break } }
      }
      if (hdr >= 0) title = { row: r, col: c }
    }
    if (!title || hdr < 0) throw new ModelError(`Tableau « Scénario ${key} » introuvable dans l'onglet « ${calc.name} » (titre « Scénario ${key} » suivi d'un en-tête avec « Baseline 2026 »).`)
    const col = (test: (t: string) => boolean, what: string): number => {
      for (let c = 0; c < calc.cols; c++) { const v = wb.consts[calc.id(hdr, c)]; if (typeof v === 'string' && test(norm(v))) return c }
      throw new ModelError(`Colonne « ${what} » introuvable dans le tableau « Scénario ${key} » de l'onglet « ${calc.name} ».`)
    }
    const C = {
      base: col((t) => t.includes('baseline 2026'), 'Baseline 2026'),
      need: col((t) => t.includes('besoin hors ia'), 'Besoin hors IA 2035'),
      iaRatio: col((t) => t === 'surcouche ia', 'Surcouche IA'),
      ia: col((t) => t === 'besoin ia', 'Besoin IA'),
      total: col((t) => t.includes('besoin total'), 'Besoin total 2035'),
      adrShare: col((t) => t.includes('adressable socle'), 'Adressable socle [%]'),
      adrIaShare: col((t) => t.includes('adressable ia'), 'Adressable IA [%]'),
      addressable: col((t) => t.includes('demande adressable') && t.includes('kw'), 'Demande adressable 2035 [kW IT]'),
    }
    const blocks = {} as Record<Entity, OutCells>
    let totalRow = -1
    for (let r = hdr + 1; r < Math.min(calc.rows, hdr + 14); r++) {
      const t = norm(wb.text(calc, r, title.col))
      if (t.startsWith('total')) { totalRow = r; break }
      const ent = ENTITIES.find((e) => ENTITY_MATCH[e](t))
      if (ent) blocks[ent] = Object.fromEntries(Object.entries(C).map(([k, c]) => [k, calc.id(r, c)])) as unknown as OutCells
    }
    const lacking = ENTITIES.filter((e) => !blocks[e])
    if (lacking.length) throw new ModelError(`Blocs introuvables dans le tableau « Scénario ${key} » : ${lacking.join(', ')} (intitulés attendus dans la colonne « ${addr(0, title.col).replace(/\d+/, '')} »).`)
    let totals: Partial<OutCells> | null = null
    if (totalRow >= 0) totals = { base: calc.id(totalRow, C.base), need: calc.id(totalRow, C.need), ia: calc.id(totalRow, C.ia), total: calc.id(totalRow, C.total), addressable: calc.id(totalRow, C.addressable) }
    else diag.push({ level: 'warning', message: `Ligne « TOTAL » introuvable pour « Scénario ${key} » : les totaux sont recalculés comme somme des blocs.` })
    out.push({ blocks, totals, title: key })
  }
  return out
}

// ------------------------------------------------------------------ construction du modèle
export function buildModel(buf: ArrayBuffer | Uint8Array, meta: ModelMeta): Model {
  const wb = Workbook.fromBuffer(buf)
  const diagnostics: Diagnostic[] = []
  const inputs = findSheet(wb, /inputs/, '1_Inputs&Hyp')
  const calc = findSheet(wb, /calcul/, '2_Calculs')
  const scenarios = mapScenarios(wb, calc, diagnostics)

  // valeurs par défaut = valeurs lues dans l'Excel (les hypothèses sont recalculées si l'Excel les définit par formule)
  const base = wb.evaluate()

  // sorties lisibles ?
  const outputIds = scenarios.flatMap((s) => [...Object.values(s.blocks).flatMap((b) => Object.values(b)), ...Object.values(s.totals ?? {})])
  // formules illisibles / fonctions inconnues : bloquant seulement si le résultat en dépend (onglets de slides, notes… sans conséquence)
  const needed = wb.dependencies(outputIds)
  let explained = false
  const ignored: string[] = []
  for (const p of wb.problems) {
    const where = p.cell >= 0 ? wb.where(p.cell) : p.where
    if (needed.has(p.cell)) { explained = true; diagnostics.push({ level: 'error', message: `${p.message} — cette cellule est nécessaire au calcul des résultats.`, where }) }
    else ignored.push(where)
  }
  if (ignored.length) {
    const sheets = [...new Set(ignored.map((w) => w.split('!')[0]))]
    diagnostics.push({ level: 'warning', message: `${ignored.length} formule(s) non prises en charge par le dashboard ont été ignorées car elles ne servent pas au calcul (onglet(s) : ${sheets.join(', ')}). Exemples : ${ignored.slice(0, 3).join(', ')}.` })
  }

  for (const g of outputIds) {
    const v = base.get(g)
    if (typeof v !== 'number' && !explained) {
      const sh = wb.sheets.find((x) => g >= x.offset && g < x.offset + x.rows * x.cols)!
      const k = g - sh.offset
      diagnostics.push({ level: 'error', message: `Résultat illisible : ${v instanceof XlError ? 'erreur Excel ' + v.code : 'valeur non numérique'}.`, where: `${sh.name}!${addr(Math.floor(k / sh.cols), k % sh.cols)}` })
      break
    }
  }

  // cellules dont dépend le résultat : lesquelles sont pilotables, lesquelles sont des valeurs fixes de l'Excel
  const live = wb.liveInputs(outputIds)

  // hypothèses : lues automatiquement dans la structure de l'onglet des hypothèses
  const col = (k: keyof OutCells) => scenarios.flatMap((s) => ENTITIES.map((e) => s.blocks[e][k]))
  const watch = { need: col('need'), ia: col('ia'), total: col('total'), addressable: col('addressable') }
  const moved = (run: Run, ids: number[]) => ids.some((g) => { const a = base.get(g), b = run.get(g); return typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) > 1e-9 * Math.max(1, Math.abs(a)) : a !== b })
  const moves = (cells: number[]): Effects => {
    const ov = new Map<number, Val>()
    for (const g of cells) { const v = base.get(g); ov.set(g, typeof v === 'number' ? v * 1.37 + 0.011 : v) }
    const run = wb.evaluate(ov)
    return { need: moved(run, watch.need), ia: moved(run, watch.ia), total: moved(run, watch.total), addressable: moved(run, watch.addressable) }
  }
  const found = discoverHypotheses(wb, inputs, live, base, moves, diagnostics)
  const hypCells = found.cells, hypAddr = found.addr
  if (!found.defs.length) diagnostics.push({ level: 'error', message: `Aucune hypothèse pilotable trouvée dans l'onglet « ${inputs.name} » : il faut un tableau dont l'en-tête contient « Hypothèse » et « Scénario Bas / Central / Haut » (ou « Valeur »), avec des valeurs saisies qui alimentent le calcul.` })

  const controlled = new Set(Object.values(hypCells).flat())
  const fixedInputs: Model['fixedInputs'] = []
  const inLabelCol = (sh: Sheet, row: number) => {
    // intitulé = premier texte non vide à gauche de la cellule
    for (let c = 0; c < sh.cols; c++) { const v = wb.consts[sh.id(row, c)]; if (typeof v === 'string' && v.trim() && c > 0 && c < 8) return v }
    return ''
  }
  for (const g of live) {
    if (controlled.has(g) || wb.isFormula(g)) continue
    const v = wb.consts[g]
    if (typeof v !== 'number') continue
    const sh = wb.sheets.find((x) => g >= x.offset && g < x.offset + x.rows * x.cols)!
    const k = g - sh.offset
    const row = Math.floor(k / sh.cols), col = k % sh.cols
    if (sh !== inputs) continue
    fixedInputs.push({ label: inLabelCol(sh, row) || addr(row, col), value: v, where: `${sh.name}!${addr(row, col)}` })
  }
  fixedInputs.sort((a, b) => a.where.localeCompare(b.where, 'fr', { numeric: true }))

  // contrôles : valeurs enregistrées par Excel vs recalcul ; totaux vs somme des blocs ; onglet « Output »
  let drift = 0
  const firstDrift: string[] = []
  for (const sh of wb.sheets) for (let r = 0; r < sh.rows; r++) for (let c = 0; c < sh.cols; c++) {
    const g = sh.id(r, c)
    if (!wb.isFormula(g)) continue
    const cached = wb.consts[g]
    const now = base.get(g)
    if (typeof cached === 'number' && typeof now === 'number' && Math.abs(cached - now) > 1e-7 * Math.max(1, Math.abs(cached))) { drift++; if (firstDrift.length < 3) firstDrift.push(`${sh.name}!${addr(r, c)}`) }
  }
  if (drift) diagnostics.push({ level: 'warning', message: `${drift} formule(s) donnent un résultat différent de la valeur enregistrée dans le fichier (le fichier a peut-être été modifié sans recalcul dans Excel). Le dashboard utilise le résultat recalculé. Exemples : ${firstDrift.join(', ')}.` })
  scenarios.forEach((s, i) => {
    if (!s.totals) return
    for (const k of ['base', 'need', 'ia', 'total', 'addressable'] as const) {
      const t = base.get(s.totals[k]!)
      const sum = ENTITIES.reduce((a, e) => a + Number(base.get(s.blocks[e][k])), 0)
      if (typeof t === 'number' && Math.abs(t - sum) > 1e-6 * Math.max(1, Math.abs(t))) diagnostics.push({ level: 'warning', message: `Le total « ${k} » du scénario ${['Bas', 'Central', 'Haut'][i]} (${t.toFixed(3)}) diffère de la somme des blocs (${sum.toFixed(3)}) : le total de l'Excel est utilisé.` })
    }
  })
  try {
    const out = wb.sheets.find((x) => /output/.test(norm(x.name)))
    if (out) {
      const labs = labels(wb, out)
      const row = (re: RegExp) => labs.find((l) => l.col <= 2 && re.test(l.text))
      const hdr = labs.find((l) => l.text === 'bas')
      const need = row(/besoin it total genere 2035/), adr = row(/demande adressable monaco 2035/)
      if (hdr && need && adr) {
        const cols = [0, 1, 2].map((i) => hdr.col + i)
        scenarios.forEach((s, i) => {
          const o = base.cell(out, adr.row, cols[i]), n = base.cell(out, need.row, cols[i])
          const ours = Number(base.get(s.totals?.addressable ?? s.blocks.DSP.addressable)) / 1000
          if (typeof o === 'number' && s.totals && Math.abs(o - ours) > 1e-6) diagnostics.push({ level: 'warning', message: `Onglet « ${out.name} » : demande adressable ${['Bas', 'Central', 'Haut'][i]} = ${o.toFixed(4)} MW, différent du tableau de calcul (${ours.toFixed(4)} MW).` })
          void n
        })
      }
    }
  } catch { /* contrôle facultatif */ }

  const formulaFor: Model['formulaFor'] = (scenario, entity, col) => {
    const g = scenarios[scenario].blocks[entity][col]
    const sh = wb.sheets.find((x) => g >= x.offset && g < x.offset + x.rows * x.cols)!
    const k = g - sh.offset
    const row = Math.floor(k / sh.cols), cc = k % sh.cols
    return { formula: wb.formulaOf(sh, row, cc), where: `${sh.name}!${addr(row, cc)}` }
  }

  const model: Model = { wb, meta, hypCells, hypAddr, hypDefs: found.defs, hypCategories: found.categories, scenarios, diagnostics, fixedInputs, formulaFor }
  if (diagnostics.some((d) => d.level === 'error')) throw Object.assign(new ModelError('Le classeur Excel n\'a pas pu être relié au dashboard.'), { diagnostics, model })
  return model
}

// ------------------------------------------------------------------ singleton
let current: Model | null = null
export function setModel(m: Model) { current = m; initHypotheses(m.hypDefs, m.hypCategories) }
export function getModel(): Model {
  if (!current) throw new ModelError('Modèle Excel non chargé.')
  return current
}

// ------------------------------------------------------------------ évaluation d'un jeu d'hypothèses
/** Valeurs à imposer aux cellules d'entrée pour un jeu d'hypothèses. */
export function overridesFor(m: Model, p: Params): Map<number, Val> {
  const ov = new Map<number, Val>()
  for (const [id, cells] of Object.entries(m.hypCells)) {
    const a = p[id]
    if (!a) continue
    cells.forEach((g, i) => ov.set(g, a.length === 1 ? a[0] : a[i]))
  }
  return ov
}

/** Idem, avec les hypothèses d'un rôle (intensité / IA) forcées à zéro : sert à décomposer les écarts. */
export function zeroed(m: Model, p: Params, role: 'intensity' | 'ai'): Map<number, Val> {
  const ov = overridesFor(m, p)
  for (const h of HYPS) if (h.role === role) for (const g of m.hypCells[h.id] ?? []) ov.set(g, 0)
  return ov
}

export function numberAt(run: Run, g: number, m: Model): number {
  const v = run.get(g)
  if (typeof v === 'number') return v
  const sh = m.wb.sheets.find((x) => g >= x.offset && g < x.offset + x.rows * x.cols)!
  const k = g - sh.offset
  throw new ModelError(`Résultat illisible (${v instanceof XlError ? v.code : 'non numérique'}) en ${sh.name}!${addr(Math.floor(k / sh.cols), k % sh.cols)}.`)
}
export type { OutCells, ScenarioMap }
