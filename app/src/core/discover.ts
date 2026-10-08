// Lecture AUTOMATIQUE des hypothèses : le registre du dashboard (curseurs, groupes, bornes, valeurs par défaut) est construit à partir
// de la structure de l'onglet « 1_Inputs&Hyp », sans liste codée en dur.
//
// Conventions de l'Excel (à respecter) :
//  - un tableau d'hypothèses commence par une ligne d'en-tête contenant « Hypothèse » (nom de la ligne), et soit « Scénario Bas / Central / Haut »,
//    soit « Valeur » ; les colonnes « Unité » et « Source… » sont lues si elles existent ; « Min », « Max », « Pas » (facultatives) fixent la plage du curseur ;
//  - le titre du bloc (texte juste au-dessus de l'en-tête, même colonne que « Hypothèse ») donne son nom au groupe ;
//  - une ligne est pilotable si sa (ou ses) cellule(s) de valeur est une constante numérique dont dépend le résultat ; une cellule en formule,
//    ou une constante qui ne sert à rien, n'est pas proposée ;
//  - le tableau s'arrête à la deuxième ligne vide consécutive (ou à l'en-tête suivant).
// Le nom affiché est l'intitulé de l'Excel, tel quel.

import { LEGACY_HYPS } from './legacyHyps'
import type { HypDef } from './hypotheses'
import { norm, similarity, slug, tokens } from './text'
import type { Run, Sheet, Workbook } from './xl/workbook'
import { addr } from './xl/workbook'

export interface Effects { need: boolean; ia: boolean; total: boolean; addressable: boolean }
export interface Discovered {
  defs: HypDef[]
  categories: { id: string; title: string }[]
  cells: Record<string, number[]>
  addr: Record<string, string[]>
}
export interface DiscoverDiag { level: 'warning' | 'info' | 'error'; message: string; where?: string }

interface Row { label: string; row: number; cells: number[]; cols: number[]; single: boolean; unit: string; source: string; hints: { min?: number; max?: number; step?: number }; section: string; table: number; scenHeader?: string }

const SCEN_RE = /^(scenario )?(bas|central|haut)$/

/** Tableaux d'hypothèses et leurs lignes pilotables. */
function scanRows(wb: Workbook, sh: Sheet, live: Set<number>, diag: DiscoverDiag[]): Row[] {
  const out: Row[] = []
  const unused: string[] = []
  const str = (r: number, c: number) => { const v = wb.consts[sh.id(r, c)]; return typeof v === 'string' ? v : '' }
  const num = (r: number, c: number): boolean => { const g = sh.id(r, c); return typeof wb.consts[g] === 'number' && !wb.isFormula(g) }
  let table = 0
  for (let r = 0; r < sh.rows; r++) {
    let lc = -1
    for (let c = 0; c < sh.cols; c++) if (norm(str(r, c)) === 'hypothese') { lc = c; break }
    if (lc < 0) continue
    const scen: Record<string, number> = {}
    let valueCol = -1, unitCol = -1, srcCol = -1
    const hint: Record<string, number> = {}
    for (let c = 0; c < sh.cols; c++) {
      const t = norm(str(r, c))
      const m = SCEN_RE.exec(t)
      if (m) scen[m[2]] = c
      else if (t === 'valeur') valueCol = c
      else if (t.startsWith('unite')) unitCol = c
      else if (t.startsWith('source')) srcCol = c
      else if (t === 'min' || t === 'max' || t === 'pas') hint[t] = c
    }
    const scenarios = scen.bas !== undefined && scen.central !== undefined && scen.haut !== undefined
    if (!scenarios && valueCol < 0) continue
    let section = ''
    for (let rr = r - 1; rr >= Math.max(0, r - 8) && !section; rr--) section = str(rr, lc).trim()
    section ||= 'Hypothèses'
    table++
    const cols = scenarios ? [scen.bas, scen.central, scen.haut] : [valueCol]
    let blanks = 0
    for (let rr = r + 1; rr < sh.rows; rr++) {
      const label = str(rr, lc).trim()
      if (norm(label) === 'hypothese') break
      if (!label) { if (++blanks >= 2) break; continue }
      blanks = 0
      const where = `${sh.name}!${addr(rr, lc)}`
      const usable = cols.filter((c) => num(rr, c) && live.has(sh.id(rr, c)))
      if (!usable.length) { if (cols.some((c) => num(rr, c))) unused.push(`« ${label} » (ligne ${rr + 1})`); continue }
      let use = usable
      if (scenarios && usable.length > 1) {
        if (usable.length < 3 || cols.some((c) => !num(rr, c))) { diag.push({ level: 'warning', message: `« ${label} » : toutes les valeurs Bas / Central / Haut ne sont pas des nombres saisis (formule ou texte) : ligne non pilotable.`, where }); continue }
        use = cols
      }
      const hv = (k: string) => { const c = hint[k]; if (c === undefined) return undefined; const v = wb.consts[sh.id(rr, c)]; return typeof v === 'number' ? v : undefined }
      out.push({
        label, row: rr, cells: use.map((c) => sh.id(rr, c)), cols: use, single: use.length === 1, table, section,
        scenHeader: scenarios && use.length === 1 ? str(r, use[0]).trim() : undefined,
        unit: unitCol >= 0 ? str(rr, unitCol).trim() : '', source: srcCol >= 0 ? str(rr, srcCol).trim() : '',
        hints: { min: hv('min'), max: hv('max'), step: hv('pas') },
      })
    }
  }
  if (unused.length) diag.push({ level: 'info', message: `Lignes d'hypothèses de l'Excel qui n'alimentent aucun résultat (non proposées comme curseurs) : ${unused.join(' ; ')}.` })
  return out
}

// ------------------------------------------------------------------ identifiants stables (réglages enregistrés)
function assignIds(rows: Row[], diag: DiscoverDiag[]): string[] {
  const ids: (string | null)[] = rows.map(() => null)
  const taken = new Set<string>()
  const legacy = LEGACY_HYPS.map((l) => ({ ...l, tk: l.labels.map((x) => tokens(x)), nl: l.labels.map(norm) }))
  const sectionOk = (l: { section?: string }, r: Row) => !l.section || norm(r.section).startsWith(norm(l.section))
  // 1) intitulé identique (ou ancien intitulé connu)
  rows.forEach((r, i) => {
    const hit = legacy.find((l) => !taken.has(l.id) && sectionOk(l, r) && l.nl.includes(norm(r.label)))
    if (hit) { ids[i] = hit.id; taken.add(hit.id) }
  })
  // 2) intitulé légèrement modifié : mots en commun, jamais un identifiant déjà pris
  rows.forEach((r, i) => {
    if (ids[i]) return
    const want = tokens(r.label)
    const scored = legacy.filter((l) => !taken.has(l.id) && sectionOk(l, r))
      .map((l) => ({ l, s: Math.max(...l.tk.map((t) => similarity(want, t))) })).filter((x) => x.s >= 0.6).sort((a, b) => b.s - a.s)
    if (scored.length && (scored.length === 1 || scored[0].s - scored[1].s >= 0.15)) {
      ids[i] = scored[0].l.id; taken.add(scored[0].l.id)
      diag.push({ level: 'info', message: `« ${r.label} » correspond à l'ancienne hypothèse « ${scored[0].l.labels[0]} » : vos réglages enregistrés sont conservés.`, where: `ligne ${r.row + 1}` })
    }
  })
  // 3) nouvelle hypothèse : identifiant tiré de l'intitulé
  rows.forEach((r, i) => {
    if (ids[i]) return
    let id = slug(r.label) || `h${r.row + 1}`
    if (taken.has(id) || legacy.some((l) => l.id === id)) id = `${id}-${slug(r.section)}`.slice(0, 80)
    while (taken.has(id)) id += '-2'
    ids[i] = id; taken.add(id)
  })
  return ids as string[]
}

// ------------------------------------------------------------------ groupes
const CONNECTORS = new Set(['-', '/', '–', 'de', 'des', 'du', 'la', 'le', 'les', 'l', 'd', 'a', 'au', 'aux', 'en', 'et', 'par', 'pour', 'sur'])
function commonPrefix(labels: string[]): string {
  const ws = labels.map((l) => l.split(/\s+/))
  const out: string[] = []
  for (let i = 0; i < ws[0].length; i++) {
    if (ws.every((w) => w[i] !== undefined && norm(w[i]) === norm(ws[0][i]))) out.push(ws[0][i]); else break
  }
  while (out.length && CONNECTORS.has(norm(out[out.length - 1]))) out.pop()
  return out.join(' ')
}

/** Groupe de chaque ligne : au sein d'un tableau, suites de lignes consécutives qui commencent par le même mot ; sinon titre du bloc. */
function groupTitles(rows: Row[]): string[] {
  const titles = rows.map((r) => r.section)
  const byTable = new Map<number, number[]>()
  rows.forEach((r, i) => byTable.set(r.table, [...(byTable.get(r.table) ?? []), i]))
  for (const idx of byTable.values()) {
    const runs: number[][] = []
    for (const i of idx) {
      const last = runs[runs.length - 1]
      if (last && norm(rows[last[0]].label).split(' ')[0] === norm(rows[i].label).split(' ')[0]) last.push(i)
      else runs.push([i])
    }
    if (runs.length < 2) continue
    for (const run of runs) {
      if (run.length < 2) continue
      const p = commonPrefix(run.map((i) => rows[i].label))
      if (p) for (const i of run) titles[i] = p
    }
  }
  return titles
}

// ------------------------------------------------------------------ unité et bornes
const niceCeil = (x: number, to: number) => Math.ceil(x / to - 1e-9) * to
const niceStep = (x: number) => { const p = Math.pow(10, Math.floor(Math.log10(x))); const m = x / p; return p * (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) }
const round = (x: number) => Math.round(x * 1e9) / 1e9

function unitKind(unit: string, vals: number[]): HypDef['unit'] {
  const u = norm(unit)
  if (u.includes('%')) return 'pct'
  if (/^w(\s|$|\/)/.test(u) || u === 'watt' || u === 'watts') return 'watt'
  if (u === 'x' || u === '×' || u.includes('ratio') || u.includes('facteur')) return 'ratio'
  void vals
  return 'count'
}

function bounds(kind: HypDef['unit'], unit: string, vals: number[], hints: Row['hints']): { min: number; max: number; step: number } {
  const lo0 = Math.min(...vals), hi0 = Math.max(...vals)
  let min: number, max: number, step: number
  if (kind === 'pct') {
    const perYear = /p\.?\s?a\.?|\ban\b/.test(norm(unit))
    step = Math.max(Math.abs(lo0), Math.abs(hi0)) <= 0.3 ? 0.001 : 0.01
    min = lo0 < 0 ? Math.floor((lo0 * 2) / step) * step : perYear ? -0.02 : 0
    max = perYear ? Math.max(0.1, niceCeil(hi0 * 2, 0.05)) : hi0 <= 1 ? 1 : niceCeil(hi0 * 1.5, 0.5)
  } else {
    const top = Math.max(Math.abs(hi0), Math.abs(lo0))
    step = top > 0 ? niceStep(top / 100) : 1
    if (kind === 'count' || kind === 'watt') step = Math.max(1, step)
    min = lo0 < 0 ? -niceCeil(top * 2, step) : kind === 'ratio' ? Math.min(1, lo0) : 0
    max = top > 0 ? niceCeil(top * 5, step) : 1
  }
  if (hints.min !== undefined) min = hints.min
  if (hints.max !== undefined) max = hints.max
  if (hints.step !== undefined && hints.step > 0) step = hints.step
  // jamais de valeur de l'Excel hors du curseur
  if (lo0 < min) min = lo0
  if (hi0 > max) max = hi0
  return { min: round(min), max: round(max), step: round(step) }
}

// ------------------------------------------------------------------ construction
export function discoverHypotheses(wb: Workbook, inputs: Sheet, live: Set<number>, base: Run, moves: (cells: number[]) => Effects, diag: DiscoverDiag[]): Discovered {
  const rows = scanRows(wb, inputs, live, diag)
  const ids = assignIds(rows, diag)
  const titles = groupTitles(rows)
  const categories: Discovered['categories'] = []
  const defs: HypDef[] = []
  const cells: Discovered['cells'] = {}
  const addrs: Discovered['addr'] = {}
  rows.forEach((r, i) => {
    const id = ids[i]
    const def = r.cells.map((g) => { const v = base.get(g); return typeof v === 'number' ? v : NaN })
    if (def.some(Number.isNaN)) { diag.push({ level: 'warning', message: `« ${r.label} » : valeur non numérique, hypothèse ignorée.`, where: `${inputs.name}!${addr(r.row, r.cols[0])}` }); return }
    const catId = slug(titles[i]) || 'hypotheses'
    if (!categories.some((c) => c.id === catId)) categories.push({ id: catId, title: titles[i] })
    const kind = unitKind(r.unit, def)
    const e = moves(r.cells)
    const role: HypDef['role'] = e.addressable && !e.total ? 'capture' : e.ia && !e.need ? 'ai' : e.need && /\b(besoins?|intensite)\b/.test(norm(r.label)) ? 'intensity' : undefined
    const b = bounds(kind, r.unit, def, r.hints)
    defs.push({
      id, label: r.label, excelLabel: r.label, description: [r.section, r.unit].filter(Boolean).join(' · '), category: catId, control: 'slider', unit: kind,
      single: r.single, ...b, def, source: r.source, excelRow: String(r.row + 1), role,
      note: r.scenHeader ? `Valeur unique, commune aux trois scénarios (seule la colonne « ${r.scenHeader} » de l'Excel est utilisée).` : undefined,
    })
    cells[id] = r.cells
    addrs[id] = r.cols.map((c) => addr(r.row, c))
  })
  return { defs, categories, cells, addr: addrs }
}
