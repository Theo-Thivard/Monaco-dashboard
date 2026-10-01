// Design tokens : toute couleur / dimension de l'interface vient d'ici.
// Les composants ne contiennent aucune couleur en dur ; ils lisent les
// variables CSS (--c-*, --m-*) ou, pour les graphiques, l'objet Tokens.

export interface Tokens {
  bg: string; surface: string; surfaceAlt: string
  text: string; textMuted: string; heading: string
  border: string; grid: string; axis: string
  primary: string; accent: string
  positive: string; negative: string; neutral: string; warning: string
  scen0: string; scen1: string; scen2: string
  p1: string; p2: string; p3: string; p4: string; p5: string; p6: string
}

export interface Metrics {
  gap: number
  pad: number
  radius: number
  rowHeight: number
  maxWidth: number
  fontScale: number
}

export type PresetId = 'cabinet' | 'sombre'

export const PRESETS: Record<PresetId, { label: string; tokens: Tokens }> = {
  cabinet: {
    label: 'Cabinet (clair)',
    tokens: {
      bg: '#F3F4F6', surface: '#FFFFFF', surfaceAlt: '#F7F8FA',
      text: '#1E2733', textMuted: '#6B7685', heading: '#0B2545',
      border: '#E1E5EA', grid: '#EDF0F3', axis: '#8A94A3',
      primary: '#0B2545', accent: '#1F7A8C',
      positive: '#2E7D5B', negative: '#B5483E', neutral: '#6B7685', warning: '#B7791F',
      scen0: '#8A94A3', scen1: '#0B2545', scen2: '#1F7A8C',
      p1: '#0B2545', p2: '#1F7A8C', p3: '#8DA9C4', p4: '#B8923A', p5: '#6B7685', p6: '#A65E5E',
    },
  },
  sombre: {
    label: 'Sombre',
    tokens: {
      bg: '#0D141D', surface: '#151F2B', surfaceAlt: '#1B2735',
      text: '#E4E8EE', textMuted: '#93A0B2', heading: '#F2F5F9',
      border: '#26333F', grid: '#212D3A', axis: '#7C8898',
      primary: '#7FB0E6', accent: '#4FB6C6',
      positive: '#5CC19A', negative: '#E1766B', neutral: '#93A0B2', warning: '#D9A441',
      scen0: '#7C8898', scen1: '#7FB0E6', scen2: '#4FB6C6',
      p1: '#7FB0E6', p2: '#4FB6C6', p3: '#A9BFD6', p4: '#D9A441', p5: '#93A0B2', p6: '#D08A8A',
    },
  },
}

export const defaultMetrics = (): Metrics => ({ gap: 16, pad: 18, radius: 6, rowHeight: 24, maxWidth: 1680, fontScale: 1 })

export const TOKEN_GROUPS: { title: string; keys: { key: keyof Tokens; label: string }[] }[] = [
  { title: 'Surfaces', keys: [{ key: 'bg', label: 'Fond de page' }, { key: 'surface', label: 'Cartes' }, { key: 'surfaceAlt', label: 'Zones secondaires' }, { key: 'border', label: 'Bordures' }] },
  { title: 'Textes', keys: [{ key: 'heading', label: 'Titres' }, { key: 'text', label: 'Texte' }, { key: 'textMuted', label: 'Sous-titres & légendes' }] },
  { title: 'Marque', keys: [{ key: 'primary', label: 'Couleur principale' }, { key: 'accent', label: 'Accent' }] },
  { title: 'États', keys: [{ key: 'positive', label: 'Positif' }, { key: 'negative', label: 'Négatif' }, { key: 'neutral', label: 'Neutre' }, { key: 'warning', label: 'Alerte' }] },
  { title: 'Scénarios', keys: [{ key: 'scen0', label: 'Bas' }, { key: 'scen1', label: 'Central' }, { key: 'scen2', label: 'Haut' }] },
  { title: 'Graphiques', keys: [{ key: 'grid', label: 'Quadrillage' }, { key: 'axis', label: 'Axes' }] },
  { title: 'Palette des séries', keys: [{ key: 'p1', label: 'Série 1' }, { key: 'p2', label: 'Série 2' }, { key: 'p3', label: 'Série 3' }, { key: 'p4', label: 'Série 4' }, { key: 'p5', label: 'Série 5' }, { key: 'p6', label: 'Série 6' }] },
]

export const palette = (t: Tokens) => [t.p1, t.p2, t.p3, t.p4, t.p5, t.p6]

/** Couleur sémantique d'une série (clé `tone` des jeux de données). */
export function toneColor(tone: string | undefined, t: Tokens): string | undefined {
  switch (tone) {
    case 'scen0': return t.scen0
    case 'scen1': return t.scen1
    case 'scen2': return t.scen2
    case 'muted': return t.axis
    case 'primary': return t.primary
    case 'accent': return t.accent
    case 'positive': return t.positive
    case 'negative': return t.negative
    default: return undefined
  }
}

export function resolveTokens(preset: PresetId, overrides: Partial<Tokens>): Tokens {
  return { ...PRESETS[preset].tokens, ...overrides }
}

/** Applique tokens + dimensions comme variables CSS sur la racine. */
export function applyTheme(t: Tokens, m: Metrics) {
  const r = document.documentElement.style
  for (const [k, v] of Object.entries(t)) r.setProperty(`--c-${k}`, v)
  r.setProperty('--m-gap', `${m.gap}px`)
  r.setProperty('--m-pad', `${m.pad}px`)
  r.setProperty('--m-radius', `${m.radius}px`)
  r.setProperty('--m-maxw', `${m.maxWidth}px`)
  r.setProperty('--m-font', `${m.fontScale}`)
}
