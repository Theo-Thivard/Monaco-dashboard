// Comparaison tolérante d'intitulés Excel (accents, casse, tirets, ponctuation, mots outils).

export const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[–—−]/g, '-').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'a', 'au', 'aux', 'en', 'et', 'par', 'pour', 'sur', 'liees', 'liee', 'lie', 'annuelle', 'annuel'])
/** Mots significatifs d'un intitulé (sans ponctuation, articles ni mots outils). */
export const tokens = (s: string): Set<string> => new Set(norm(s).replace(/[^a-z0-9]+/g, ' ').split(' ').filter((w) => w && !STOP.has(w)))

/** Part de mots en commun (0..1) : |A ∩ B| / |A ∪ B|. */
export function similarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const w of a) if (b.has(w)) inter++
  return inter / (a.size + b.size - inter)
}

export const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
