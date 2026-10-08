// Registre des hypothèses pilotables depuis le dashboard.
// Il n'est PAS écrit à la main : il est construit à chaque chargement de l'Excel par `discoverHypotheses()` (voir discover.ts)
// à partir de la structure de l'onglet « 1_Inputs&Hyp ». Nom, valeurs par défaut, unité, source, groupe et bornes viennent de l'Excel ;
// `setModel()` recopie ici le résultat. Les tableaux ci-dessous sont modifiés sur place pour que tous les modules voient le registre courant.

export type FormatKind = 'power' | 'pct' | 'ratio' | 'pts' | 'int' | 'watt'
export type ControlKind = 'slider' | 'radio' | 'toggle'

export interface HypDef {
  id: string
  /** intitulé de la ligne dans l'Excel (colonne « Hypothèse » de 1_Inputs&Hyp), tel quel */
  label: string
  /** phrase courte : bloc de l'Excel et unité */
  description: string
  /** groupe d'affichage (voir CATEGORIES) : déduit des blocs et des intitulés de l'Excel */
  category: string
  control: ControlKind
  /** unité de valeur : pct = fraction (0.05 = 5 %) */
  unit: 'pct' | 'watt' | 'count' | 'ratio' | 'choice'
  /** une seule valeur, commune aux trois scénarios */
  single?: boolean
  min: number
  max: number
  step: number
  /** valeurs de l'Excel : [bas, central, haut] ou [valeur] */
  def: number[]
  source: string
  /** ligne de l'Excel */
  excelRow: string
  /** même chose que `label` (conservé pour les messages) */
  excelLabel: string
  /**
   * rôle déduit du comportement du modèle : « intensity » (croissance du besoin hors IA), « ai » (surcouche IA),
   * « capture » (part adressable : ne change que la demande adressable)
   */
  role?: 'intensity' | 'ai' | 'capture'
  options?: { value: number; label: string }[]
  note?: string
}

export const CATEGORIES: { id: string; title: string }[] = []
export const HYPS: HypDef[] = []
export const HYP_BY_ID: Record<string, HypDef> = {}

/** Remplace le registre par celui du classeur chargé (modification sur place). */
export function initHypotheses(defs: HypDef[], categories: { id: string; title: string }[]) {
  HYPS.length = 0
  HYPS.push(...defs)
  CATEGORIES.length = 0
  CATEGORIES.push(...categories)
  for (const k of Object.keys(HYP_BY_ID)) delete HYP_BY_ID[k]
  for (const h of HYPS) HYP_BY_ID[h.id] = h
}

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
