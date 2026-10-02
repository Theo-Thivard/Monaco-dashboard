// Analyseur de formules Excel : texte -> arbre syntaxique.
// Couvre : nombres, %, textes, booléens, références (A1, $A$1, Feuille!A1, 'Feuille x'!A1:B2, colonnes/lignes entières),
// opérateurs + - * / ^ & = <> < > <= >= et la négation, appels de fonctions, noms définis.
// Précédence d'Excel : négation > % > ^ > * / > + - > & > comparaisons ; ^ est associatif à gauche.

export type Node =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'err'; v: string }
  | { t: 'ref'; sheet?: string; r1: number; c1: number; r2: number; c2: number; whole?: 'col' | 'row' }
  | { t: 'name'; name: string }
  | { t: 'call'; fn: string; args: (Node | null)[] }
  | { t: 'un'; op: '-' | '+'; x: Node }
  | { t: 'pct'; x: Node }
  | { t: 'bin'; op: string; a: Node; b: Node }

type Tok = { k: 'num' | 'str' | 'id' | 'op' | 'ref' | 'err' | 'eof'; v: string; n?: number }

export const colToIndex = (s: string): number => {
  let n = 0
  for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

const CELL = /^\$?([A-Za-z]{1,3})\$?(\d+)$/

function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  const n = src.length
  while (i < n) {
    const ch = src[i]
    if (/\s/.test(ch)) { i++; continue }
    // lignes entières (1:3) : seulement en début d'opérande
    const prev = out[out.length - 1]
    if (/[0-9\$]/.test(ch) && (!prev || (prev.k === 'op' && ['(', ',', ';'].includes(prev.v)))) {
      const rows = /^(\$?\d+):(\$?\d+)(?![\d.])/.exec(src.slice(i))
      if (rows) { out.push({ k: 'ref', v: rows[0] }); i += rows[0].length; continue }
    }
    // nombre
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i))!
      out.push({ k: 'num', v: m[0], n: Number(m[0]) })
      i += m[0].length
      continue
    }
    // texte
    if (ch === '"') {
      let s = ''
      i++
      while (i < n) {
        if (src[i] === '"') { if (src[i + 1] === '"') { s += '"'; i += 2; continue } i++; break }
        s += src[i++]
      }
      out.push({ k: 'str', v: s })
      continue
    }
    // erreur littérale (#N/A, #REF!, …)
    if (ch === '#') {
      const m = /^#[A-Z0-9\/]+[!?]?/.exec(src.slice(i))
      if (m) { out.push({ k: 'err', v: m[0] }); i += m[0].length; continue }
    }
    // nom de feuille entre apostrophes : 'Ma feuille'!A1
    if (ch === "'") {
      let name = ''
      i++
      while (i < n) {
        if (src[i] === "'") { if (src[i + 1] === "'") { name += "'"; i += 2; continue } i++; break }
        name += src[i++]
      }
      if (src[i] !== '!') throw new Error(`Nom de feuille mal formé dans « ${src} »`)
      i++
      const m = /^(\$?[A-Za-z]{1,3}\$?\d+(:\$?[A-Za-z]{1,3}\$?\d+)?|\$?[A-Za-z]{1,3}:\$?[A-Za-z]{1,3}|\$?\d+:\$?\d+)/.exec(src.slice(i))
      if (!m) throw new Error(`Référence attendue après « '${name}'! » dans « ${src} »`)
      out.push({ k: 'ref', v: `${name}\u0000${m[0]}` })
      i += m[0].length
      continue
    }
    // identifiant : fonction, nom, référence (éventuellement Feuille!A1)
    if (/[A-Za-z_\$]/.test(ch)) {
      const m = /^[A-Za-z_\$][A-Za-z0-9_\.\$]*(![\$A-Za-z0-9:]+)?/.exec(src.slice(i))!
      let word = m[0]
      // Feuille!A1:B2
      if (word.includes('!')) {
        const [sheet, rest] = word.split('!')
        out.push({ k: 'ref', v: `${sheet}\u0000${rest}` })
        i += word.length
        continue
      }
      // référence simple, éventuellement plage A1:B2 / A:A
      const rng = /^(\$?[A-Za-z]{1,3}\$?\d+)(:\$?[A-Za-z]{1,3}\$?\d+)?/.exec(src.slice(i))
      const col = /^(\$?[A-Za-z]{1,3}):(\$?[A-Za-z]{1,3})(?![A-Za-z0-9_\(])/.exec(src.slice(i))
      const nextChar = src[i + word.length]
      if (nextChar !== '(' && rng && CELL.test(rng[1]) && rng[0].length >= word.length) {
        out.push({ k: 'ref', v: rng[0] })
        i += rng[0].length
        continue
      }
      if (nextChar !== '(' && col) { out.push({ k: 'ref', v: col[0] }); i += col[0].length; continue }
      out.push({ k: 'id', v: word })
      i += word.length
      continue
    }
    // lignes entières 1:3
    const rows = /^(\$?\d+):(\$?\d+)/.exec(src.slice(i))
    if (rows) { out.push({ k: 'ref', v: rows[0] }); i += rows[0].length; continue }
    // opérateurs
    const two = src.slice(i, i + 2)
    if (['<>', '<=', '>='].includes(two)) { out.push({ k: 'op', v: two }); i += 2; continue }
    if ('+-*/^&=<>(),%:;{}'.includes(ch)) { out.push({ k: 'op', v: ch }); i++; continue }
    throw new Error(`Caractère inattendu « ${ch} » dans « ${src} »`)
  }
  out.push({ k: 'eof', v: '' })
  return out
}

function parseRef(text: string): Node {
  let sheet: string | undefined
  let body = text
  if (text.includes('\u0000')) [sheet, body] = text.split('\u0000')
  const [a, b] = body.split(':')
  const clean = (s: string) => s.replace(/\$/g, '')
  const ca = CELL.exec(a)
  if (ca) {
    const cb = b ? CELL.exec(b) : ca
    if (!cb) throw new Error(`Plage invalide « ${text} »`)
    const r1 = Number(ca[2]) - 1, c1 = colToIndex(ca[1]), r2 = Number(cb[2]) - 1, c2 = colToIndex(cb[1])
    return { t: 'ref', sheet, r1: Math.min(r1, r2), c1: Math.min(c1, c2), r2: Math.max(r1, r2), c2: Math.max(c1, c2) }
  }
  if (b && /^[A-Za-z]+$/.test(clean(a))) {
    const c1 = colToIndex(clean(a)), c2 = colToIndex(clean(b))
    return { t: 'ref', sheet, r1: 0, r2: Infinity, c1: Math.min(c1, c2), c2: Math.max(c1, c2), whole: 'col' }
  }
  if (b && /^\d+$/.test(clean(a))) {
    const r1 = Number(clean(a)) - 1, r2 = Number(clean(b)) - 1
    return { t: 'ref', sheet, r1: Math.min(r1, r2), r2: Math.max(r1, r2), c1: 0, c2: Infinity, whole: 'row' }
  }
  throw new Error(`Référence invalide « ${text} »`)
}

export function parseFormula(src: string): Node {
  const toks = tokenize(src.startsWith('=') ? src.slice(1) : src)
  let p = 0
  const peek = () => toks[p]
  const next = () => toks[p++]
  const isOp = (v: string) => peek().k === 'op' && peek().v === v
  const expect = (v: string) => {
    if (!isOp(v)) throw new Error(`« ${v} » attendu dans « ${src} »`)
    p++
  }

  const comparison = (): Node => {
    let a = concat()
    while (peek().k === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(peek().v)) { const op = next().v; a = { t: 'bin', op, a, b: concat() } }
    return a
  }
  const concat = (): Node => {
    let a = additive()
    while (isOp('&')) { next(); a = { t: 'bin', op: '&', a, b: additive() } }
    return a
  }
  const additive = (): Node => {
    let a = mult()
    while (isOp('+') || isOp('-')) { const op = next().v; a = { t: 'bin', op, a, b: mult() } }
    return a
  }
  const mult = (): Node => {
    let a = power()
    while (isOp('*') || isOp('/')) { const op = next().v; a = { t: 'bin', op, a, b: power() } }
    return a
  }
  const power = (): Node => {
    let a = unary()
    while (isOp('^')) { next(); a = { t: 'bin', op: '^', a, b: unary() } }
    return a
  }
  const unary = (): Node => {
    if (isOp('-') || isOp('+')) { const op = next().v as '-' | '+'; return { t: 'un', op, x: unary() } }
    return postfix()
  }
  const postfix = (): Node => {
    let a = primary()
    while (isOp('%')) { next(); a = { t: 'pct', x: a } }
    return a
  }
  const primary = (): Node => {
    const t = next()
    switch (t.k) {
      case 'num': return { t: 'num', v: t.n! }
      case 'str': return { t: 'str', v: t.v }
      case 'err': return { t: 'err', v: t.v }
      case 'ref': return parseRef(t.v)
      case 'op':
        if (t.v === '(') { const e = comparison(); expect(')'); return e }
        throw new Error(`Symbole « ${t.v} » inattendu dans « ${src} »`)
      case 'id': {
        const up = t.v.toUpperCase()
        if (isOp('(')) {
          next()
          const args: (Node | null)[] = []
          if (isOp(')')) { next(); return { t: 'call', fn: normFn(t.v), args } }
          for (;;) {
            if (isOp(',') || isOp(')')) args.push(null) // argument omis
            else args.push(comparison())
            if (isOp(',')) { next(); continue }
            expect(')')
            break
          }
          return { t: 'call', fn: normFn(t.v), args }
        }
        if (up === 'TRUE') return { t: 'bool', v: true }
        if (up === 'FALSE') return { t: 'bool', v: false }
        return { t: 'name', name: t.v }
      }
      default: throw new Error(`Fin de formule inattendue dans « ${src} »`)
    }
  }

  const ast = comparison()
  if (peek().k !== 'eof') throw new Error(`Texte inattendu « ${peek().v} » dans « ${src} »`)
  return ast
}

/** `_xlfn.XLOOKUP` -> `XLOOKUP` */
export const normFn = (s: string) => s.replace(/^_xlfn\.(_xlws\.)?/i, '').toUpperCase()
