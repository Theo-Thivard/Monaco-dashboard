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
  excelRow: string
  options?: { value: number; label: string }[]
  note?: string
}

export const CATEGORIES: { id: string; title: string }[] = [
  { id: 'growth', title: 'Croissance & usages' },
  { id: 'ai', title: 'Intelligence artificielle' },
  { id: 'capture', title: 'Part captable à Monaco' },
  { id: 'public', title: 'Entités publiques (DSP, CHPG)' },
  { id: 'baseline', title: 'Baseline 2026' },
  { id: 'method', title: 'Méthode' },
]

const WT = 'Hypothèse de travail'
const eff = (id: string, label: string, row: string, d: string): HypDef => ({
  id, label, description: d, category: 'growth', control: 'slider', unit: 'pct', min: -0.02, max: 0.03, step: 0.001, def: [0, 0.005, 0.01], source: WT, excelRow: row,
})
const intens = (id: string, label: string, row: string, d: [number, number, number], source: string): HypDef => ({
  id, label, description: 'Hausse annuelle du besoin IT par utilisateur, hors IA, de 2026 à 2035', category: 'growth', control: 'slider', unit: 'pct', min: 0, max: 0.12, step: 0.001, def: d, source, excelRow: row,
})
const ia = (id: string, label: string, row: string, d: [number, number, number]): HypDef => ({
  id, label, description: 'Besoin IT additionnel lié à l\'IA en 2035, en % du besoin hors IA', category: 'ai', control: 'slider', unit: 'pct', min: 0, max: 0.8, step: 0.01, def: d, source: WT, excelRow: row,
})
const adr = (id: string, label: string, row: string, d: [number, number, number], source: string, desc: string, category = 'capture'): HypDef => ({
  id, label, description: desc, category, control: 'slider', unit: 'pct', min: 0, max: 1, step: 0.01, def: d, source, excelRow: row,
})

export const HYPS: HypDef[] = [
  eff('gEffPub', 'Effectifs publics (croissance annuelle)', '34', 'Croissance annuelle des effectifs du secteur public'),
  eff('gEffFin', 'Effectifs finance (croissance annuelle)', '35', 'Croissance annuelle des effectifs de la finance'),
  eff('gEffPriv', 'Effectifs privé hors finance (croissance annuelle)', '36', 'Croissance annuelle des effectifs du privé hors finance (et de Monaco Telecom)'),
  intens('gIntPub', 'Intensité numérique public (hors IA)', '37', [0.02, 0.04, 0.06], 'Hypothèse de travail – besoin IT / utilisateur'),
  intens('gIntFin', 'Intensité numérique finance (hors IA)', '38', [0.03, 0.05, 0.07], 'Hypothèse de travail – finance plus data-intensive'),
  intens('gIntPriv', 'Intensité numérique hors finance (hors IA)', '39', [0.02, 0.04, 0.06], WT),
  ia('iaPub', 'Surcouche IA 2035 – public', '40', [0.05, 0.15, 0.3]),
  ia('iaFin', 'Surcouche IA 2035 – finance', '41', [0.1, 0.25, 0.45]),
  ia('iaPriv', 'Surcouche IA 2035 – hors finance', '42', [0.05, 0.15, 0.3]),
  adr('adrPub', 'Part captable – public, CHPG, DSP, Monaco Telecom', '46', [1, 1, 1], 'Convention projet', 'Part du besoin hors IA hébergée à Monaco pour les entités publiques et Monaco Telecom'),
  adr('adrFin', 'Part captable – finance', '47', [0.2, 0.35, 0.5], WT, 'Part du besoin hors IA de la finance hébergée à Monaco'),
  adr('adrPriv', 'Part captable – privé hors finance', '48', [0.1, 0.2, 0.35], WT, 'Part du besoin hors IA du privé hors finance hébergée à Monaco'),
  adr('adrIaPub', 'Part captable de l\'IA – public', '49', [0.25, 0.6, 1], 'Externalisée / hybride / locale', 'Part de la surcouche IA du secteur public hébergée à Monaco'),
  adr('adrIaFin', 'Part captable de l\'IA – finance', '50', [0.15, 0.4, 0.75], 'Externalisée / hybride / locale', 'Part de la surcouche IA de la finance hébergée à Monaco'),
  adr('adrIaPriv', 'Part captable de l\'IA – hors finance', '51', [0.1, 0.3, 0.6], 'Externalisée / hybride / locale', 'Part de la surcouche IA du privé hors finance hébergée à Monaco'),
  { id: 'camBase', label: 'Caméras en 2026', description: 'Parc de caméras DSP en 2026', category: 'public', control: 'slider', unit: 'count', single: true, min: 500, max: 3000, step: 10, def: [1300], source: 'Donnée équipe projet', excelRow: '57' },
  { id: 'camAdd', label: 'Ajout annuel de caméras', description: 'Caméras ajoutées chaque année (2035 = 2026 + 9 × ajout)', category: 'public', control: 'slider', unit: 'count', single: true, min: 0, max: 200, step: 5, def: [50], source: 'Donnée équipe projet', excelRow: '58' },
  { id: 'bitrate', label: 'Facteur de débit 8 MP / 2 MP', description: 'Multiplication du débit vidéo par caméra lors du passage de 2 MP à 8 MP (4K)', category: 'public', control: 'slider', unit: 'ratio', single: true, min: 1, max: 8, step: 0.05, def: [3.953125], source: 'Benchmark Axis H.265, 24–30 fps : 2,53 / 0,64 Mb/s', excelRow: '62' },
  { id: 'gChpg', label: 'Activité du CHPG (croissance annuelle)', description: 'Croissance annuelle de l\'activité hospitalière', category: 'public', control: 'slider', unit: 'pct', min: -0.02, max: 0.04, step: 0.001, def: [0, 0.005, 0.01], source: 'Non précisé dans l\'Excel', excelRow: '67' },
  { id: 'santeChpg', label: 'Digitalisation santé du CHPG (2035)', description: 'Surcroît de besoin métier lié à la digitalisation de la santé', category: 'public', control: 'slider', unit: 'pct', min: 0, max: 0.5, step: 0.01, def: [0.05, 0.1, 0.2], source: 'Non précisé dans l\'Excel', excelRow: '68',
    note: 'Sans effet dans l\'Excel actuel (I63 = H13·H63·G63 avec H13 = 0). Le choix « Traitement du CHPG » permet de l\'appliquer.' },
  { id: 'wFin', label: 'Puissance IT par salarié – finance', description: 'Baseline 2026 : watts IT par salarié de la finance', category: 'baseline', control: 'slider', unit: 'watt', single: true, min: 10, max: 200, step: 1, def: [80], source: WT, excelRow: '43', note: 'Baseline 2026 commune aux trois scénarios (colonne « Bas » dans l\'Excel).' },
  { id: 'wPriv', label: 'Puissance IT par salarié – hors finance', description: 'Baseline 2026 : watts IT par salarié du privé hors finance', category: 'baseline', control: 'slider', unit: 'watt', single: true, min: 5, max: 100, step: 1, def: [30], source: WT, excelRow: '44', note: 'Baseline 2026 commune aux trois scénarios.' },
  { id: 'wPub', label: 'Puissance IT par agent public (DSP)', description: 'Baseline 2026 : watts IT par agent, socle non-métier de la DSP', category: 'baseline', control: 'slider', unit: 'watt', single: true, min: 5, max: 100, step: 1, def: [30], source: WT, excelRow: '45', note: 'Baseline 2026 commune aux trois scénarios.' },
  { id: 'fixChpg', label: 'Traitement du CHPG', description: 'Choix de méthode sur le surcroît santé du CHPG', category: 'method', control: 'radio', unit: 'choice', single: true, min: 0, max: 1, step: 1, def: [0], source: 'Choix de modélisation', excelRow: '—',
    options: [{ value: 0, label: 'Comme l\'Excel' }, { value: 1, label: 'Surcroît santé appliqué' }] },
]

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
