// Formatage central. Règle : AUCUN arrondi dans le calcul ; on n'arrondit
// qu'ici, à l'affichage. Les valeurs de puissance sont stockées en kW.

import type { FormatKind } from './hypotheses'

export interface FormatSettings {
  powerUnit: 'MW' | 'kW'
  powerDecimals: number
  pctDecimals: number
  ratioDecimals: number
  /** texte ajouté à l'unité de puissance, p. ex. « IT » -> « MW IT » */
  unitSuffix: string
}

export const defaultFormat = (): FormatSettings => ({ powerUnit: 'MW', powerDecimals: 2, pctDecimals: 1, ratioDecimals: 2, unitSuffix: 'IT' })

export interface FmtOptions {
  /** force le signe (+/−) */
  sign?: boolean
  /** ajoute l'unité */
  unit?: boolean
  /** nombre de décimales imposé */
  decimals?: number
}

const MINUS = '−'

/** Convertit une valeur brute (kW pour 'power') dans l'unité d'affichage. */
export function toDisplay(kind: FormatKind, v: number, f: FormatSettings): number {
  switch (kind) {
    case 'power': return f.powerUnit === 'MW' ? v / 1000 : v
    case 'pct':
    case 'pts': return v * 100
    default: return v
  }
}

export function unitLabel(kind: FormatKind, f: FormatSettings): string {
  switch (kind) {
    case 'power': return f.unitSuffix ? `${f.powerUnit} ${f.unitSuffix}` : f.powerUnit
    case 'pct': return '%'
    case 'pts': return 'pts'
    case 'ratio': return '×'
    case 'watt': return 'W'
    default: return ''
  }
}

function decimalsFor(kind: FormatKind, f: FormatSettings, o?: FmtOptions): number {
  if (o?.decimals !== undefined) return o.decimals
  switch (kind) {
    case 'power': return f.powerUnit === 'kW' ? Math.max(0, f.powerDecimals - 2) : f.powerDecimals
    case 'pct':
    case 'pts': return f.pctDecimals
    case 'ratio': return f.ratioDecimals
    default: return 0
  }
}

const nf = new Map<number, Intl.NumberFormat>()
function numberFormat(d: number) {
  let x = nf.get(d)
  if (!x) { x = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }); nf.set(d, x) }
  return x
}

export function fmt(kind: FormatKind, v: number, f: FormatSettings, o: FmtOptions = {}): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '–'
  const d = decimalsFor(kind, f, o)
  const x = toDisplay(kind, v, f)
  // le signe est déterminé APRÈS arrondi pour ne jamais afficher « −0,00 »
  const str = numberFormat(d).format(Math.abs(x))
  const isZero = Number(str.replace(/\s/g, '').replace(',', '.')) === 0
  const sign = isZero ? '' : x < 0 ? MINUS : o.sign ? '+' : ''
  let u = ''
  if (o.unit !== false) {
    const l = unitLabel(kind, f)
    u = l ? (kind === 'pct' || kind === 'pts' ? ' ' + l : ' ' + l) : ''
    if (kind === 'ratio') u = ' ×'
  }
  return `${sign}${str}${u}`
}

/** Valeur numérique telle qu'affichée (pour les tests de cohérence). */
export const displayedNumber = (kind: FormatKind, v: number, f: FormatSettings, o: FmtOptions = {}) =>
  Number(fmt(kind, v, f, { ...o, unit: false, sign: false }).replace(MINUS, '-').replace(/\s/g, '').replace(',', '.'))

/** Formatage d'une valeur d'hypothèse selon son unité. */
export function fmtHyp(unit: 'pct' | 'watt' | 'count' | 'ratio' | 'choice', v: number, f: FormatSettings, o: FmtOptions = {}): string {
  switch (unit) {
    case 'pct': return fmt('pct', v, f, { decimals: 1, ...o })
    case 'watt': return fmt('watt', v, f, o)
    case 'ratio': return fmt('ratio', v, f, o)
    case 'count': return numberFormat(0).format(v)
    default: return String(v)
  }
}
