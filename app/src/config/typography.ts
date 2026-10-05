// Typographie réglable : taille (multiplicateur) et gras par catégorie de texte.
// Les composants lisent les variables CSS --ts-<catégorie> (taille) et --tw-<catégorie> (graisse) ;
// les graphiques, dessinés en pixels, reçoivent les mêmes multiplicateurs via `chartTypo`.

export type TypeCat = 'titles' | 'subtitles' | 'figures' | 'labels' | 'body'

export interface CatStyle { size: number; bold: boolean }
export type Typography = Record<TypeCat, CatStyle>

export const TYPE_CATS: { id: TypeCat; label: string; hint: string }[] = [
  { id: 'titles', label: 'Titres', hint: 'Titres des blocs et des parties, message clé' },
  { id: 'subtitles', label: 'Sous-titres', hint: 'Sous-titres des blocs, descriptions' },
  { id: 'figures', label: 'Chiffres clés', hint: 'Grands chiffres et valeurs sur les graphiques' },
  { id: 'labels', label: 'Légendes', hint: 'Légendes, axes, notes, intitulés des indicateurs' },
  { id: 'body', label: 'Texte courant', hint: 'Textes, tableaux, noms des hypothèses' },
]

export const TYPE_MIN = 0.7
export const TYPE_MAX = 2
export const TYPE_STEP = 0.05

export const defaultTypography = (): Typography => ({
  titles: { size: 1, bold: false }, subtitles: { size: 1, bold: false }, figures: { size: 1, bold: false },
  labels: { size: 1, bold: false }, body: { size: 1, bold: false },
})

const clamp = (n: number) => Math.min(TYPE_MAX, Math.max(TYPE_MIN, Math.round(n / TYPE_STEP) * TYPE_STEP))

/** Fusionne une typographie enregistrée / importée avec le défaut (tolérant aux valeurs absentes ou invalides). */
export function sanitizeTypography(x: unknown): Typography {
  const d = defaultTypography()
  if (!x || typeof x !== 'object') return d
  for (const { id } of TYPE_CATS) {
    const c = (x as Record<string, Partial<CatStyle> | undefined>)[id]
    if (!c) continue
    if (typeof c.size === 'number' && Number.isFinite(c.size)) d[id].size = clamp(c.size)
    if (typeof c.bold === 'boolean') d[id].bold = c.bold
  }
  return d
}

/** Taille et graisse de chaque catégorie → variables CSS de la racine (graisse : absente = style d'origine). */
export function applyTypography(t: Typography) {
  const r = document.documentElement.style
  for (const { id } of TYPE_CATS) {
    r.setProperty(`--ts-${id}`, String(t[id].size))
    if (t[id].bold) r.setProperty(`--tw-${id}`, '700')
    else r.removeProperty(`--tw-${id}`)
  }
}

/** Réglages pour les graphiques (pixels) : le zoom global s'applique en plus de celui de la catégorie. */
export interface ChartTypo { labels: number; figures: number; labelsBold: boolean; figuresBold: boolean }
export const chartTypo = (t: Typography, globalScale: number): ChartTypo => ({
  labels: t.labels.size * globalScale, figures: t.figures.size * globalScale, labelsBold: t.labels.bold, figuresBold: t.figures.bold,
})

/** Nombre de catégories dont la taille ou la graisse diffère du défaut. */
export const typographyChanges = (t: Typography): number => {
  const d = defaultTypography()
  return TYPE_CATS.filter(({ id }) => t[id].size !== d[id].size || t[id].bold !== d[id].bold).length
}
