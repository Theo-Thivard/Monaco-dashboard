// Registre des hypothèses : UNIQUE endroit où une hypothèse est définie
// (libellé, catégorie, type de contrôle, bornes, défaut, source).
// Les numéros de ligne renvoient à l'onglet « 1_Inputs&Hyp » de l'Excel.

export type FormatKind = 'power' | 'pct' | 'ratio' | 'pts' | 'int' | 'watt'
export type ControlKind = 'slider' | 'radio' | 'toggle'

export interface HypDef {
  id: string
  label: string
  /** phrase courte expliquant ce que pilote l'hypothèse */
  description: string
  category: string
  control: ControlKind
  /** unité de valeur : pct = fraction (0.05 = 5 %) */
  unit: 'pct' | 'watt' | 'count' | 'ratio' | 'choice'
  /** une seule valeur, commune aux trois scénarios */
  single?: boolean
  min: number
  max: number
  step: number
  /** valeurs par défaut de l'Excel : [bas, central, haut] ou [valeur] */
  def: number[]
  source: string
  /** ligne(s) de l'Excel (renseigné au chargement du classeur) */
  excelRow: string
  /** libellé de la ligne dans l'Excel (colonne D de 1_Inputs&Hyp) : c'est lui qui relie l'hypothèse à sa cellule */
  excelLabel: string
  /** colonnes lues : trois scénarios (Bas / Central / Haut), la colonne « Bas », ou la colonne « Valeur » */
  excelMode: 'scenarios' | 'bas' | 'value'
  /** rôle dans la décomposition des écarts (intensité numérique, surcouche IA) */
  role?: 'intensity' | 'ai'
  options?: { value: number; label: string }[]
  note?: string
}

export const CATEGORIES: { id: string; title: string }[] = [
  { id: 'growth', title: 'Croissance & usages' },
  { id: 'ai', title: 'Intelligence artificielle' },
  { id: 'capture', title: 'Part captable à Monaco' },
  { id: 'public', title: 'Entités publiques (DSP, CHPG)' },
  { id: 'baseline', title: 'Baseline 2026' },
]

// ---------------------------------------------------------------------------------------------------------
// Registre des hypothèses pilotables depuis le dashboard.
// Seule l'INTERFACE est décrite ici (catégorie, contrôle, bornes). La VALEUR par défaut, la source et la ligne
// viennent de l'Excel, lus à chaque lancement : `def`, `source` et `excelRow` sont renseignés par `initHypotheses()`.
// Le lien avec l'Excel se fait par l'intitulé de la ligne (colonne D de « 1_Inputs&Hyp »), pas par son numéro :
// insérer des lignes dans l'Excel ne casse rien tant que les intitulés restent.
// ---------------------------------------------------------------------------------------------------------
type Base = Pick<HypDef, 'id' | 'label' | 'description' | 'category' | 'unit' | 'min' | 'max' | 'step' | 'excelLabel' | 'excelMode'> & Partial<HypDef>
const hyp = (b: Base): HypDef => ({ control: 'slider', def: [], source: '', excelRow: '', single: b.excelMode !== 'scenarios', ...b })

const eff = (id: string, label: string, excelLabel: string, description: string) =>
  hyp({ id, label, description, category: 'growth', unit: 'pct', min: -0.02, max: 0.03, step: 0.001, excelLabel, excelMode: 'scenarios' })
const intens = (id: string, label: string, excelLabel: string) =>
  hyp({ id, label, description: 'Hausse annuelle du besoin IT par utilisateur, hors IA, de 2026 à 2035', category: 'growth', unit: 'pct', min: 0, max: 0.12, step: 0.001, excelLabel, excelMode: 'scenarios', role: 'intensity' })
const ia = (id: string, label: string, excelLabel: string) =>
  hyp({ id, label, description: 'Besoin IT additionnel lié à l\'IA en 2035, en % du besoin hors IA', category: 'ai', unit: 'pct', min: 0, max: 0.8, step: 0.01, excelLabel, excelMode: 'scenarios', role: 'ai' })
const adr = (id: string, label: string, excelLabel: string, description: string) =>
  hyp({ id, label, description, category: 'capture', unit: 'pct', min: 0, max: 1, step: 0.01, excelLabel, excelMode: 'scenarios' })

export const HYPS: HypDef[] = [
  eff('gEffPub', 'Effectifs publics (croissance annuelle)', 'Croissance annuelle effectifs publics', 'Croissance annuelle des effectifs du secteur public'),
  eff('gEffFin', 'Effectifs finance (croissance annuelle)', 'Croissance annuelle effectifs finance', 'Croissance annuelle des effectifs de la finance'),
  eff('gEffPriv', 'Effectifs privé hors finance (croissance annuelle)', 'Croissance annuelle effectifs privé hors finance', 'Croissance annuelle des effectifs du privé hors finance (et de Monaco Telecom)'),
  intens('gIntPub', 'Intensité numérique public (hors IA)', 'Croissance annuelle intensité numérique hors IA – public'),
  intens('gIntFin', 'Intensité numérique finance (hors IA)', 'Croissance annuelle intensité numérique hors IA – finance'),
  intens('gIntPriv', 'Intensité numérique hors finance (hors IA)', 'Croissance annuelle intensité numérique hors IA – hors finance'),
  ia('iaPub', 'Surcouche IA 2035 – public', 'Surcouche IA 2035 – public'),
  ia('iaFin', 'Surcouche IA 2035 – finance', 'Surcouche IA 2035 – finance'),
  ia('iaPriv', 'Surcouche IA 2035 – hors finance', 'Surcouche IA 2035 – hors finance'),
  adr('adrPub', 'Part captable – public, CHPG, DSP, Monaco Telecom', 'Part adressable Monaco – public / CHPG / DSP / MT', 'Part du besoin hors IA hébergée à Monaco pour les entités publiques et Monaco Telecom'),
  adr('adrFin', 'Part captable – finance', 'Part adressable Monaco – finance', 'Part du besoin hors IA de la finance hébergée à Monaco'),
  adr('adrPriv', 'Part captable – privé hors finance', 'Part adressable Monaco – privé hors finance', 'Part du besoin hors IA du privé hors finance hébergée à Monaco'),
  adr('adrIaPub', 'Part captable de l\'IA – public', 'Part adressable Monaco – surcouche IA public', 'Part de la surcouche IA du secteur public hébergée à Monaco'),
  adr('adrIaFin', 'Part captable de l\'IA – finance', 'Part adressable Monaco – surcouche IA finance', 'Part de la surcouche IA de la finance hébergée à Monaco'),
  adr('adrIaPriv', 'Part captable de l\'IA – hors finance', 'Part adressable Monaco – surcouche IA hors finance', 'Part de la surcouche IA du privé hors finance hébergée à Monaco'),
  hyp({ id: 'camBase', label: 'Caméras en 2026', description: 'Parc de caméras DSP en 2026', category: 'public', unit: 'count', min: 500, max: 3000, step: 10, excelLabel: 'Caméras 2026', excelMode: 'value' }),
  hyp({ id: 'camAdd', label: 'Ajout annuel de caméras', description: 'Caméras ajoutées chaque année', category: 'public', unit: 'count', min: 0, max: 200, step: 5, excelLabel: 'Ajout annuel de caméras', excelMode: 'value' }),
  hyp({ id: 'bitrate', label: 'Facteur de débit 8 MP / 2 MP', description: 'Multiplication du débit vidéo par caméra lors du passage de 2 MP à 8 MP (4K)', category: 'public', unit: 'ratio', min: 1, max: 8, step: 0.05, excelLabel: 'Facteur bitrate 8MP / 2MP', excelMode: 'value' }),
  hyp({ id: 'gChpg', label: 'Activité du CHPG (croissance annuelle)', description: 'Croissance annuelle de l\'activité hospitalière', category: 'public', unit: 'pct', min: -0.02, max: 0.04, step: 0.001, excelLabel: 'Croissance annuelle activité CHPG', excelMode: 'scenarios' }),
  hyp({ id: 'santeChpg', label: 'Digitalisation santé du CHPG (2035)', description: 'Surcroît de besoin métier lié à la digitalisation de la santé', category: 'public', unit: 'pct', min: 0, max: 0.3, step: 0.01, excelLabel: 'Surcroît métier santé / digitalisation 2035', excelMode: 'scenarios' }),
  hyp({ id: 'wFin', label: 'Puissance IT par salarié – finance', description: 'Baseline 2026 : watts IT par salarié de la finance', category: 'baseline', unit: 'watt', min: 10, max: 200, step: 1, excelLabel: 'W IT / salarié finance – 2026', excelMode: 'bas', note: 'Baseline 2026 commune aux trois scénarios (colonne « Bas » de l\'Excel).' }),
  hyp({ id: 'wPriv', label: 'Puissance IT par salarié – hors finance', description: 'Baseline 2026 : watts IT par salarié du privé hors finance', category: 'baseline', unit: 'watt', min: 5, max: 100, step: 1, excelLabel: 'W IT / salarié hors finance – 2026', excelMode: 'bas', note: 'Baseline 2026 commune aux trois scénarios.' }),
  hyp({ id: 'wPub', label: 'Puissance IT par agent public (DSP)', description: 'Baseline 2026 : watts IT par agent, socle non-métier de la DSP', category: 'baseline', unit: 'watt', min: 5, max: 100, step: 1, excelLabel: 'W IT / agent public – socle non-métier DSP', excelMode: 'bas', note: 'Baseline 2026 commune aux trois scénarios.' }),
]

/** Valeurs lues dans l'Excel au chargement. */
export interface HypFromExcel { def: number[]; row: string; source: string }

export function initHypotheses(values: Record<string, HypFromExcel>) {
  for (const h of HYPS) {
    const v = values[h.id]
    if (!v) continue
    h.def = v.def
    h.excelRow = v.row
    if (v.source) h.source = v.source
    // une valeur de l'Excel hors de la plage du curseur élargit la plage (jamais de valeur inatteignable)
    const lo = Math.min(...v.def), hi = Math.max(...v.def)
    if (lo < h.min) h.min = Math.floor((lo - Math.abs(lo) * 0.1 - h.step) / h.step) * h.step
    if (hi > h.max) h.max = Math.ceil((hi + Math.abs(hi) * 0.1 + h.step) / h.step) * h.step
  }
}

export const HYP_BY_ID: Record<string, HypDef> = Object.fromEntries(HYPS.map((h) => [h.id, h]))

/** Hypothèses numériques de scénario : tableau [bas, central, haut] ou [valeur]. */
export type Params = Record<string, number[]>

export const defaultParams = (): Params => Object.fromEntries(HYPS.map((h) => [h.id, [...h.def]]))

/** Valeur d'une hypothèse pour un scénario (index 0..2). */
export function hypValue(p: Params, id: string, s: number): number {
  const a = p[id]
  return a.length === 1 ? a[0] : a[s]
}

/** Remplace la valeur du scénario s (ou la valeur unique). */
export function withValue(p: Params, id: string, s: number, v: number): Params {
  const a = p[id]
  return { ...p, [id]: a.length === 1 ? [v] : a.map((x, i) => (i === s ? v : x)) }
}

/** Compare deux jeux d'hypothèses pour un scénario donné. */
export function hypDiffers(a: Params, b: Params, id: string, s: number): boolean {
  return hypValue(a, id, s) !== hypValue(b, id, s)
}

export function hypDefault(id: string, s: number): number {
  const d = HYP_BY_ID[id].def
  return d.length === 1 ? d[0] : d[s]
}
