// Classeur Excel chargé en mémoire : toutes les cellules (valeurs ET formules) sont lues ; chaque formule est analysée puis
// compilée en fonction JavaScript. `evaluate()` recalcule le classeur entier (avec d'éventuelles valeurs imposées).

import * as XLSX from 'xlsx'
import { FUNCTIONS, isMatrix, LAZY, scalar, toNum, toStr, XlError, compare, eqLoose as looseEq, type Any, type Matrix, type Val } from './functions'
import { colToIndex, parseFormula, type Node } from './parser'

export interface CellRef { sheet: number; row: number; col: number }

interface Compiled { fn: (run: Run) => Any; refs: number[]; src: string }

export const colName = (c: number): string => { let s = ''; for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s }
export const addr = (row: number, col: number) => `${colName(col)}${row + 1}`

export class Sheet {
  constructor(public name: string, public index: number, public rows: number, public cols: number, public offset: number) {}
  id(row: number, col: number) { return this.offset + row * this.cols + col }
  inside(row: number, col: number) { return row >= 0 && col >= 0 && row < this.rows && col < this.cols }
}

export class Run {
  vals: Val[]
  state: Uint8Array
  constructor(public wb: Workbook, overrides?: Map<number, Val>) {
    this.vals = wb.consts.slice()
    this.state = new Uint8Array(wb.consts.length)
    if (overrides) for (const [k, v] of overrides) { this.vals[k] = v; this.state[k] = 2 }
  }
  /** Valeur d'une cellule (calcule la formule au besoin). Peut renvoyer un XlError. */
  get(g: number): Val {
    const st = this.state[g]
    if (st === 2) return this.vals[g]
    const f = this.wb.formulas[g]
    if (!f) return this.vals[g]
    if (st === 1) { const e = new XlError('#CIRC!'); this.vals[g] = e; return e }
    this.state[g] = 1
    let out: Val
    try {
      const r = f.fn(this)
      out = isMatrix(r) ? (r.length === 1 && r[0].length === 1 ? r[0][0] : new XlError('#VALUE!')) : r
    } catch (e) {
      if (e instanceof XlError) out = e
      else throw e
    }
    this.vals[g] = out
    this.state[g] = 2
    return out
  }
  cell(sheet: Sheet, row: number, col: number): Val {
    if (!sheet.inside(row, col)) return null
    return this.get(sheet.id(row, col))
  }
  range(sheet: Sheet, r1: number, c1: number, r2: number, c2: number): Matrix {
    const out: Matrix = []
    for (let r = r1; r <= Math.min(r2, sheet.rows - 1); r++) {
      const row: Val[] = []
      for (let c = c1; c <= Math.min(c2, sheet.cols - 1); c++) row.push(this.get(sheet.id(r, c)))
      out.push(row)
    }
    return out
  }
  /** Valeur d'une cellule désignée par son adresse. */
  at(sheetName: string, a: string): Val {
    const s = this.wb.sheet(sheetName)
    const m = /^([A-Za-z]+)(\d+)$/.exec(a)!
    return this.cell(s, Number(m[2]) - 1, colToIndex(m[1]))
  }
}

export class Workbook {
  sheets: Sheet[] = []
  consts: Val[] = []
  formulas: (Compiled | null)[] = []
  /** problèmes rencontrés à la lecture (formule illisible, fonction inconnue…) */
  problems: { where: string; message: string }[] = []
  private byName = new Map<string, Sheet>()

  static fromBuffer(buf: ArrayBuffer | Uint8Array): Workbook {
    const wb = new Workbook()
    const x = XLSX.read(buf, { type: 'array', cellFormula: true, cellNF: false, cellStyles: false, cellDates: false, sheetStubs: true })
    // 1) dimensions
    const dims = x.SheetNames.map((name) => {
      const ws = x.Sheets[name]
      const ref = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }
      return { name, ws, rows: ref.e.r + 1, cols: ref.e.c + 1 }
    })
    let offset = 0
    for (const [i, d] of dims.entries()) {
      const sh = new Sheet(d.name, i, d.rows, d.cols, offset)
      wb.sheets.push(sh)
      wb.byName.set(d.name.toLowerCase(), sh)
      offset += d.rows * d.cols
    }
    wb.consts = new Array(offset).fill(null)
    wb.formulas = new Array(offset).fill(null)
    // 2) cellules
    const pending: { sheet: Sheet; row: number; col: number; src: string }[] = []
    for (const [i, d] of dims.entries()) {
      const sh = wb.sheets[i]
      for (const key of Object.keys(d.ws)) {
        if (key[0] === '!') continue
        const cell = d.ws[key] as XLSX.CellObject
        const rc = XLSX.utils.decode_cell(key)
        const g = sh.id(rc.r, rc.c)
        if (cell.t === 'z') wb.consts[g] = null // formule sans valeur enregistrée (fichier écrit par un outil qui ne calcule pas)
        else if (cell.t === 'e') wb.consts[g] = new XlError(String(cell.w ?? '#VALUE!'))
        else if (cell.t === 'n') wb.consts[g] = cell.v as number
        else if (cell.t === 'b') wb.consts[g] = !!cell.v
        else if (cell.t === 's') wb.consts[g] = String(cell.v)
        else if (cell.t === 'd') wb.consts[g] = cell.v instanceof Date ? cell.v.getTime() / 86400000 + 25569 : null
        else wb.consts[g] = cell.v === undefined ? null : (cell.v as Val)
        if (cell.f) pending.push({ sheet: sh, row: rc.r, col: rc.c, src: cell.f })
      }
    }
    // 3) formules : analyse + compilation
    for (const p of pending) {
      const where = `${p.sheet.name}!${addr(p.row, p.col)}`
      try {
        const ast = parseFormula(p.src)
        wb.formulas[p.sheet.id(p.row, p.col)] = wb.compile(ast, p.sheet, p.src)
      } catch (e) {
        wb.problems.push({ where, message: `Formule illisible « =${p.src} » : ${(e as Error).message}` })
        wb.consts[p.sheet.id(p.row, p.col)] = new XlError('#NAME?')
      }
    }
    return wb
  }

  sheet(name: string): Sheet {
    const s = this.byName.get(name.toLowerCase())
    if (!s) throw new XlError('#REF!')
    return s
  }
  hasSheet(name: string) { return this.byName.has(name.toLowerCase()) }

  /** Texte d'une cellule constante (étiquettes) */
  text(sheet: Sheet, row: number, col: number): string {
    const v = this.consts[sheet.id(row, col)]
    return typeof v === 'string' ? v : ''
  }
  formulaOf(sheet: Sheet, row: number, col: number): string | null { return this.formulas[sheet.id(row, col)]?.src ?? null }
  isFormula(g: number) { return this.formulas[g] !== null }
  get formulaCount() { return this.formulas.reduce((n, f) => n + (f ? 1 : 0), 0) }

  evaluate(overrides?: Map<number, Val>): Run { return new Run(this, overrides) }

  /** Cellules constantes dont dépend (directement ou non) au moins une des cellules `targets`. */
  liveInputs(targets: number[]): Set<number> {
    const seen = new Set<number>()
    const live = new Set<number>()
    const stack = [...targets]
    while (stack.length) {
      const g = stack.pop()!
      if (seen.has(g)) continue
      seen.add(g)
      const f = this.formulas[g]
      if (!f) { live.add(g); continue }
      for (const r of f.refs) stack.push(r)
    }
    return live
  }

  // ------------------------------------------------------------ compilation
  private compile(root: Node, home: Sheet, src: string): Compiled {
    const refs: number[] = []
    const wb = this
    const sheetOf = (n: { sheet?: string }) => (n.sheet ? wb.sheet(n.sheet) : home)

    const comp = (n: Node): ((run: Run) => Any) => {
      switch (n.t) {
        case 'num': { const v = n.v; return () => v }
        case 'str': { const v = n.v; return () => v }
        case 'bool': { const v = n.v; return () => v }
        case 'err': { const code = n.v; return () => { throw new XlError(code) } }
        case 'name': return () => { throw new XlError('#NAME?') }
        case 'ref': {
          const sh = sheetOf(n)
          const r2 = Math.min(n.r2, sh.rows - 1), c2 = Math.min(n.c2, sh.cols - 1)
          for (let r = n.r1; r <= r2; r++) for (let c = n.c1; c <= c2; c++) refs.push(sh.id(r, c))
          if (n.r1 === n.r2 && n.c1 === n.c2) { const r = n.r1, c = n.c1; return (run) => run.cell(sh, r, c) }
          return (run) => run.range(sh, n.r1, n.c1, n.r2, n.c2)
        }
        case 'un': {
          const x = comp(n.x)
          return n.op === '-' ? (run) => -toNum(x(run)) : (run) => scalar(x(run))
        }
        case 'pct': { const x = comp(n.x); return (run) => toNum(x(run)) / 100 }
        case 'bin': {
          const a = comp(n.a), b = comp(n.b)
          switch (n.op) {
            case '+': return (run) => toNum(a(run)) + toNum(b(run))
            case '-': return (run) => toNum(a(run)) - toNum(b(run))
            case '*': return (run) => toNum(a(run)) * toNum(b(run))
            case '/': return (run) => { const d = toNum(b(run)); if (d === 0) throw new XlError('#DIV/0!'); return toNum(a(run)) / d }
            case '^': return (run) => {
              const x = toNum(a(run)), y = toNum(b(run))
              const r = Math.pow(x, y)
              if (Number.isNaN(r)) throw new XlError('#NUM!')
              return r
            }
            case '&': return (run) => toStr(a(run)) + toStr(b(run))
            default: {
              const op = n.op
              return (run) => {
                const c = compare(scalar(a(run)), scalar(b(run)))
                return op === '=' ? c === 0 : op === '<>' ? c !== 0 : op === '<' ? c < 0 : op === '>' ? c > 0 : op === '<=' ? c <= 0 : c >= 0
              }
            }
          }
        }
        case 'call': {
          const lazy = LAZY[n.fn]
          if (lazy) {
            const thunks = n.args.map((x) => (x ? comp(x) : null))
            return (run) => lazy(thunks.map((t) => (t ? () => t(run) : null)))
          }
          // chemin rapide pour XLOOKUP(valeur ; plage_vecteur ; plage_vecteur de même taille) : aucune allocation
          if (n.fn === 'XLOOKUP' && (n.args.length === 3 || n.args.length === 4) && n.args[0] && n.args[1]?.t === 'ref' && n.args[2]?.t === 'ref') {
            const a = n.args[1], b = n.args[2]
            const sa = sheetOf(a), sb = sheetOf(b)
            const len = (x: typeof a, sh: Sheet) => (Math.min(x.r2, sh.rows - 1) - x.r1 + 1) * (Math.min(x.c2, sh.cols - 1) - x.c1 + 1)
            const vec = (x: typeof a, sh: Sheet) => Math.min(x.r2, sh.rows - 1) === x.r1 || Math.min(x.c2, sh.cols - 1) === x.c1
            if (!a.whole && !b.whole && vec(a, sa) && vec(b, sb) && len(a, sa) === len(b, sb)) {
              const ids = (x: typeof a, sh: Sheet) => { const o: number[] = []; for (let r = x.r1; r <= Math.min(x.r2, sh.rows - 1); r++) for (let c = x.c1; c <= Math.min(x.c2, sh.cols - 1); c++) o.push(sh.id(r, c)); return o }
              const ka = ids(a, sa), kb = ids(b, sb)
              const key = comp(n.args[0]!)
              const nf = n.args[3] ? comp(n.args[3]) : null
              for (const g of [...ka, ...kb]) refs.push(g)
              return (run) => {
                const k = scalar(key(run))
                for (let i = 0; i < ka.length; i++) if (looseEq(run.get(ka[i]), k)) return run.get(kb[i])
                if (nf) return nf(run)
                throw new XlError('#N/A')
              }
            }
          }
          const f = FUNCTIONS[n.fn]
          if (!f) {
            wb.problems.push({ where: `${home.name} (${src.slice(0, 60)})`, message: `Fonction Excel non prise en charge : ${n.fn}` })
            return () => { throw new XlError('#NAME?') }
          }
          const args = n.args.map((x) => (x ? comp(x) : null))
          return (run) => f(...args.map((a) => (a ? a(run) : (undefined as unknown as Any))))
        }
      }
    }
    return { fn: comp(root), refs, src }
  }
}
