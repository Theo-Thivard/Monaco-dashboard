// Bibliothèque de fonctions Excel. Une fonction inconnue lève #NAME? et est signalée dans le diagnostic du modèle.

export class XlError extends Error {
  constructor(public code: string) { super(code) }
}
export type Val = number | string | boolean | XlError | null
export type Matrix = Val[][]
export type Any = Val | Matrix

export const isMatrix = (x: Any): x is Matrix => Array.isArray(x)

/** Valeur scalaire (propage les erreurs, intersection implicite pour les plages 1×1). */
export function scalar(x: Any): Exclude<Val, XlError> {
  if (isMatrix(x)) {
    if (x.length === 1 && x[0].length === 1) return scalar(x[0][0])
    throw new XlError('#VALUE!')
  }
  if (x instanceof XlError) throw x
  return x
}

export function toNum(x: Any): number {
  const v = scalar(x)
  if (v === null) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  const s = v.trim()
  if (s === '') throw new XlError('#VALUE!')
  const pct = s.endsWith('%') ? Number(s.slice(0, -1)) / 100 : Number(s.replace(',', '.'))
  if (Number.isNaN(pct)) throw new XlError('#VALUE!')
  return pct
}
export function toStr(x: Any): string {
  const v = scalar(x)
  if (v === null) return ''
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return String(v)
}
export function toBool(x: Any): boolean {
  const v = scalar(x)
  if (v === null) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  const u = v.toUpperCase()
  if (u === 'TRUE') return true
  if (u === 'FALSE') return false
  throw new XlError('#VALUE!')
}

/** Valeurs d'une plage / d'un scalaire, à plat, dans l'ordre des lignes. */
export function flat(x: Any): Val[] {
  if (!isMatrix(x)) return [x]
  const out: Val[] = []
  for (const r of x) for (const v of r) out.push(v)
  return out
}
const matrix = (x: Any): Matrix => (isMatrix(x) ? x : [[x]])

/** Nombres d'une liste d'arguments (SUM, MIN, …) : on ignore texte / vide dans les plages, on propage les erreurs. */
function numbers(args: Any[]): number[] {
  const out: number[] = []
  for (const a of args) {
    if (isMatrix(a)) {
      for (const v of flat(a)) {
        if (v instanceof XlError) throw v
        if (typeof v === 'number') out.push(v)
      }
    } else {
      const v = scalar(a)
      if (v === null) continue
      out.push(toNum(v))
    }
  }
  return out
}

// ---------------------------------------------------------------- comparaison
function rank(v: Val): number { return typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : -1 }
export function compare(a: Val, b: Val): number {
  if (a === null) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0
  if (b === null) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0
  if (a instanceof XlError) throw a
  if (b instanceof XlError) throw b
  const ra = rank(a), rb = rank(b)
  if (ra !== rb) return ra - rb
  if (typeof a === 'string') { const x = a.toLowerCase(), y = (b as string).toLowerCase(); return x < y ? -1 : x > y ? 1 : 0 }
  const x = Number(a), y = Number(b)
  return x < y ? -1 : x > y ? 1 : 0
}
export const eqLoose = (a: Val, b: Val) => {
  if (a instanceof XlError || b instanceof XlError) return false
  try { return compare(a, b) === 0 } catch { return false }
}

function wildcard(pattern: string): RegExp {
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
  return new RegExp('^' + esc + '$', 'i')
}

// ---------------------------------------------------------------- recherche
function vector(m: Matrix): Val[] {
  if (m.length === 1) return m[0]
  if (m.every((r) => r.length === 1)) return m.map((r) => r[0])
  throw new XlError('#VALUE!')
}

export function xlookup(look: Any, arr: Any, ret: Any, notFound?: Any, matchMode: Any = 0, searchMode: Any = 1): Any {
  const key = scalar(look)
  const A = matrix(arr)
  const R = matrix(ret)
  const keys = vector(A)
  const mm = toNum(matchMode)
  const sm = toNum(searchMode)
  const idxs = keys.map((_, i) => i)
  if (sm === -1) idxs.reverse()
  let found = -1
  if (mm === 0 || mm === 2) {
    const re = mm === 2 && typeof key === 'string' ? wildcard(key) : null
    for (const i of idxs) {
      const k = keys[i]
      if (re ? typeof k === 'string' && re.test(k) : eqLoose(k, key)) { found = i; break }
    }
  } else {
    // -1 : égal sinon plus petit voisin ; 1 : égal sinon plus grand voisin
    let best = -1
    for (const i of idxs) {
      const k = keys[i]
      if (k instanceof XlError || rank(k) !== rank(key)) continue
      const c = compare(k, key)
      if (c === 0) { found = i; break }
      if (mm === -1 && c < 0 && (best < 0 || compare(k, keys[best]) > 0)) best = i
      if (mm === 1 && c > 0 && (best < 0 || compare(k, keys[best]) < 0)) best = i
    }
    if (found < 0) found = best
  }
  if (found < 0) {
    if (notFound !== undefined && notFound !== null) return notFound
    throw new XlError('#N/A')
  }
  if (A.length === 1) return R.length === 1 ? R[0][found] ?? null : R.map((r) => r[found] ?? null).length === 1 ? R[0][found] : R.map((r) => [r[found] ?? null])
  return R[found] ? (R[found].length === 1 ? R[found][0] : [R[found]]) : null
}

function match(look: Any, arr: Any, type: Any = 1): number {
  const key = scalar(look)
  const keys = vector(matrix(arr))
  const t = toNum(type)
  if (t === 0) {
    const re = typeof key === 'string' && /[*?]/.test(key) ? wildcard(key) : null
    const i = keys.findIndex((k) => (re ? typeof k === 'string' && re.test(k) : eqLoose(k, key)))
    if (i < 0) throw new XlError('#N/A')
    return i + 1
  }
  let best = -1
  keys.forEach((k, i) => {
    if (k instanceof XlError || k === null || rank(k) !== rank(key)) return
    const c = compare(k, key)
    if (t > 0 ? c <= 0 : c >= 0) best = i
  })
  if (best < 0) throw new XlError('#N/A')
  return best + 1
}

function index(arr: Any, row: Any, col?: Any): Any {
  const M = matrix(arr)
  const r = toNum(row)
  const c = col === undefined || col === null ? 0 : toNum(col)
  if (M.length === 1 && col === undefined) { const v = M[0][r - 1]; if (v === undefined) throw new XlError('#REF!'); return v }
  if (r === 0 && c > 0) return M.map((x) => [x[c - 1] ?? null])
  if (c === 0 && r > 0) return M[r - 1] ? [M[r - 1]] : (() => { throw new XlError('#REF!') })()
  const v = M[r - 1]?.[c - 1]
  if (v === undefined) throw new XlError('#REF!')
  return v
}

function roundTo(x: number, d: number, mode: 'round' | 'up' | 'down'): number {
  const f = Math.pow(10, d)
  const y = x * f
  const r = mode === 'round' ? Math.sign(y) * Math.round(Math.abs(y)) : mode === 'up' ? Math.sign(y) * Math.ceil(Math.abs(y)) : Math.sign(y) * Math.floor(Math.abs(y))
  return r / f
}

// ---------------------------------------------------------------- table des fonctions (arguments déjà évalués)
type Fn = (...a: Any[]) => Any
export const FUNCTIONS: Record<string, Fn> = {
  SUM: (...a) => numbers(a).reduce((x, y) => x + y, 0),
  PRODUCT: (...a) => numbers(a).reduce((x, y) => x * y, 1),
  MIN: (...a) => { const n = numbers(a); return n.length ? Math.min(...n) : 0 },
  MAX: (...a) => { const n = numbers(a); return n.length ? Math.max(...n) : 0 },
  AVERAGE: (...a) => { const n = numbers(a); if (!n.length) throw new XlError('#DIV/0!'); return n.reduce((x, y) => x + y, 0) / n.length },
  COUNT: (...a) => a.flatMap((x) => flat(x)).filter((v) => typeof v === 'number').length,
  COUNTA: (...a) => a.flatMap((x) => flat(x)).filter((v) => v !== null).length,
  ABS: (x) => Math.abs(toNum(x)),
  SIGN: (x) => Math.sign(toNum(x)),
  SQRT: (x) => { const n = toNum(x); if (n < 0) throw new XlError('#NUM!'); return Math.sqrt(n) },
  EXP: (x) => Math.exp(toNum(x)),
  LN: (x) => { const n = toNum(x); if (n <= 0) throw new XlError('#NUM!'); return Math.log(n) },
  LOG10: (x) => { const n = toNum(x); if (n <= 0) throw new XlError('#NUM!'); return Math.log10(n) },
  LOG: (x, b) => { const n = toNum(x); if (n <= 0) throw new XlError('#NUM!'); return Math.log(n) / Math.log(b === undefined ? 10 : toNum(b)) },
  POWER: (x, y) => Math.pow(toNum(x), toNum(y)),
  MOD: (x, y) => { const d = toNum(y); if (d === 0) throw new XlError('#DIV/0!'); const n = toNum(x); return n - d * Math.floor(n / d) },
  INT: (x) => Math.floor(toNum(x)),
  ROUND: (x, d) => roundTo(toNum(x), toNum(d), 'round'),
  ROUNDUP: (x, d) => roundTo(toNum(x), toNum(d), 'up'),
  ROUNDDOWN: (x, d) => roundTo(toNum(x), toNum(d), 'down'),
  PI: () => Math.PI,
  NOT: (x) => !toBool(x),
  AND: (...a) => a.flatMap((x) => flat(x)).filter((v) => v !== null).every((v) => toBool(v)),
  OR: (...a) => a.flatMap((x) => flat(x)).filter((v) => v !== null).some((v) => toBool(v)),
  TRUE: () => true,
  FALSE: () => false,
  ISNUMBER: (x) => { try { return typeof scalar(x) === 'number' } catch { return false } },
  ISTEXT: (x) => { try { return typeof scalar(x) === 'string' } catch { return false } },
  ISBLANK: (x) => { try { return scalar(x) === null } catch { return false } },
  ISERROR: (x) => { try { scalar(x); return false } catch { return true } },
  N: (x) => { const v = scalar(x); return typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : 0 },
  VALUE: (x) => toNum(x),
  LEN: (x) => toStr(x).length,
  UPPER: (x) => toStr(x).toUpperCase(),
  LOWER: (x) => toStr(x).toLowerCase(),
  TRIM: (x) => toStr(x).trim().replace(/\s+/g, ' '),
  LEFT: (x, n) => toStr(x).slice(0, n === undefined ? 1 : toNum(n)),
  RIGHT: (x, n) => { const s = toStr(x); const k = n === undefined ? 1 : toNum(n); return k === 0 ? '' : s.slice(-k) },
  MID: (x, s, n) => toStr(x).substr(toNum(s) - 1, toNum(n)),
  CONCAT: (...a) => a.flatMap((x) => flat(x)).map((v) => toStr(v)).join(''),
  CONCATENATE: (...a) => a.map((x) => toStr(x)).join(''),
  XLOOKUP: xlookup,
  MATCH: match,
  INDEX: index,
  VLOOKUP: (look, tbl, col, approx) => {
    const T = matrix(tbl)
    const c = toNum(col)
    const exact = approx !== undefined && !toBool(approx)
    const keys = T.map((r) => r[0])
    const i = exact ? match(look, [keys.map((k) => k)].length ? keys.map((k) => [k]) : [], 0) : match(look, keys.map((k) => [k]), 1)
    const v = T[i - 1]?.[c - 1]
    if (v === undefined) throw new XlError('#REF!')
    return v
  },
  HLOOKUP: (look, tbl, row, approx) => {
    const T = matrix(tbl)
    const r = toNum(row)
    const exact = approx !== undefined && !toBool(approx)
    const i = match(look, [T[0]], exact ? 0 : 1)
    const v = T[r - 1]?.[i - 1]
    if (v === undefined) throw new XlError('#REF!')
    return v
  },
  SUMPRODUCT: (...a) => {
    const arrs = a.map((x) => flat(x))
    const n = arrs[0].length
    if (arrs.some((x) => x.length !== n)) throw new XlError('#VALUE!')
    let s = 0
    for (let i = 0; i < n; i++) {
      let p = 1
      for (const x of arrs) { const v = x[i]; if (v instanceof XlError) throw v; p *= typeof v === 'number' ? v : 0 }
      s += p
    }
    return s
  },
  SUMIF: (rng, crit, sumRng) => {
    const R = flat(rng)
    const S = sumRng === undefined ? R : flat(sumRng)
    const c = scalar(crit)
    let test: (v: Val) => boolean
    if (typeof c === 'string') {
      const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(c)!
      const op = m[1] ?? '='
      const rhs: Val = m[2] !== '' && !Number.isNaN(Number(m[2])) ? Number(m[2]) : m[2]
      test = (v) => { if (v === null || v instanceof XlError) return false; if (rank(v) !== rank(rhs)) return false; const k = compare(v, rhs); return op === '=' ? k === 0 : op === '<>' ? k !== 0 : op === '<' ? k < 0 : op === '>' ? k > 0 : op === '<=' ? k <= 0 : k >= 0 }
    } else test = (v) => eqLoose(v, c)
    return R.reduce<number>((s, v, i) => (test(v) && typeof S[i] === 'number' ? s + (S[i] as number) : s), 0)
  },
}

/** Fonctions à évaluation paresseuse : reçoivent des thunks. */
export type Thunk = () => Any
export const LAZY: Record<string, (a: (Thunk | null)[]) => Any> = {
  IF: (a) => {
    const cond = toBool(a[0]!())
    const pick = cond ? a[1] : a[2]
    if (!pick) return cond ? true : false
    return pick()
  },
  IFERROR: (a) => { try { const v = a[0]!(); scalarCheck(v); return v } catch (e) { if (e instanceof XlError) return a[1]!(); throw e } },
  IFNA: (a) => { try { const v = a[0]!(); scalarCheck(v); return v } catch (e) { if (e instanceof XlError && e.code === '#N/A') return a[1]!(); throw e } },
  IFS: (a) => { for (let i = 0; i + 1 < a.length; i += 2) if (toBool(a[i]!())) return a[i + 1]!(); throw new XlError('#N/A') },
  CHOOSE: (a) => { const i = toNum(a[0]!()); const t = a[i]; if (!t || i < 1) throw new XlError('#VALUE!'); return t() },
  XLOOKUP: (a) => FUNCTIONS.XLOOKUP(...a.map((t) => (t ? t() : undefined as unknown as Any))),
}
function scalarCheck(v: Any) { if (!isMatrix(v) && v instanceof XlError) throw v }
delete (LAZY as Record<string, unknown>).XLOOKUP // XLOOKUP reste évaluée normalement (arguments optionnels omis -> undefined)
