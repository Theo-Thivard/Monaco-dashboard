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
  /** barre de navigation */
  navBg: string; navText: string; navActive: string; navAccent: string
}

export interface Metrics {
  gap: number
  pad: number
  radius: number
  rowHeight: number
  maxWidth: number
  fontScale: number
}

export type PresetId = 'cabinet' | 'minimal' | 'executive' | 'financial' | 'modern' | 'warm' | 'sombre'

export const PRESETS: Record<PresetId, { label: string; tokens: Tokens }> = {
  cabinet: {
    label: 'Marine conseil',
    tokens: {
      bg: '#F3F4F6', surface: '#FFFFFF', surfaceAlt: '#F7F8FA',
      text: '#1E2733', textMuted: '#6B7685', heading: '#0B2545',
      border: '#E1E5EA', grid: '#EDF0F3', axis: '#8A94A3',
      primary: '#0B2545', accent: '#1F7A8C',
      positive: '#2E7D5B', negative: '#B5483E', neutral: '#6B7685', warning: '#B7791F',
      scen0: '#8A94A3', scen1: '#0B2545', scen2: '#1F7A8C',
      p1: '#0B2545', p2: '#1F7A8C', p3: '#8DA9C4', p4: '#B8923A', p5: '#6B7685', p6: '#A65E5E',
      navBg: '#FFFFFF', navText: '#5B6677', navActive: '#0B2545', navAccent: '#0B2545',
    },
  },
  minimal: {
    label: 'Épuré',
    tokens: {
      bg: '#FAFAFA', surface: '#FFFFFF', surfaceAlt: '#F5F5F5',
      text: '#222222', textMuted: '#767676', heading: '#111111',
      border: '#E6E6E6', grid: '#F0F0F0', axis: '#9A9A9A',
      primary: '#111111', accent: '#555555',
      positive: '#2F7D4F', negative: '#B3402F', neutral: '#767676', warning: '#A8741A',
      scen0: '#B0B0B0', scen1: '#111111', scen2: '#6B6B6B',
      p1: '#111111', p2: '#6B6B6B', p3: '#B0B0B0', p4: '#8C6D3F', p5: '#4A6B8A', p6: '#A15C52',
      navBg: '#FFFFFF', navText: '#767676', navActive: '#111111', navAccent: '#111111',
    },
  },
  executive: {
    label: 'Direction',
    tokens: {
      bg: '#F2F1EE', surface: '#FFFFFF', surfaceAlt: '#F8F7F4',
      text: '#25272B', textMuted: '#6E7075', heading: '#16181C',
      border: '#E2E0DA', grid: '#EDEBE6', axis: '#8E8F93',
      primary: '#2A2D33', accent: '#A67C2E',
      positive: '#3A7D5A', negative: '#B04A3E', neutral: '#6E7075', warning: '#A67C2E',
      scen0: '#9A9CA1', scen1: '#2A2D33', scen2: '#A67C2E',
      p1: '#2A2D33', p2: '#A67C2E', p3: '#9A9CA1', p4: '#5B7A8C', p5: '#7A6A58', p6: '#A65E5E',
      navBg: '#1F2227', navText: '#B5B7BC', navActive: '#FFFFFF', navAccent: '#C9A24B',
    },
  },
  financial: {
    label: 'Finance',
    tokens: {
      bg: '#F4F6F5', surface: '#FFFFFF', surfaceAlt: '#F7F9F8',
      text: '#1D2B26', textMuted: '#62736C', heading: '#0F3D2E',
      border: '#DDE5E1', grid: '#EAF0ED', axis: '#85958E',
      primary: '#0F3D2E', accent: '#B4872F',
      positive: '#2E7D5B', negative: '#B5483E', neutral: '#62736C', warning: '#B4872F',
      scen0: '#85958E', scen1: '#0F3D2E', scen2: '#B4872F',
      p1: '#0F3D2E', p2: '#B4872F', p3: '#7FA394', p4: '#3F6F8F', p5: '#62736C', p6: '#A65E5E',
      navBg: '#0F3D2E', navText: '#A9C2B8', navActive: '#FFFFFF', navAccent: '#D9B15A',
    },
  },
  modern: {
    label: 'Moderne',
    tokens: {
      bg: '#F5F6FA', surface: '#FFFFFF', surfaceAlt: '#F8F9FC',
      text: '#1F2433', textMuted: '#6A7186', heading: '#1B1F3B',
      border: '#E3E6F0', grid: '#EEF0F6', axis: '#8B91A5',
      primary: '#3B3F9E', accent: '#0E8F8F',
      positive: '#2A8A5C', negative: '#C0473F', neutral: '#6A7186', warning: '#B7791F',
      scen0: '#8B91A5', scen1: '#3B3F9E', scen2: '#0E8F8F',
      p1: '#3B3F9E', p2: '#0E8F8F', p3: '#9AA3E0', p4: '#D08A2E', p5: '#6A7186', p6: '#C0627A',
      navBg: '#FFFFFF', navText: '#6A7186', navActive: '#3B3F9E', navAccent: '#3B3F9E',
    },
  },
  warm: {
    label: 'Chaleureux',
    tokens: {
      bg: '#F7F3EE', surface: '#FFFDFA', surfaceAlt: '#FBF7F2',
      text: '#2E2823', textMuted: '#7B7066', heading: '#4A2C20',
      border: '#E9E0D6', grid: '#F1EAE2', axis: '#A09386',
      primary: '#8A3B22', accent: '#3F7C85',
      positive: '#4C7F4A', negative: '#B04A3A', neutral: '#7B7066', warning: '#B7791F',
      scen0: '#A09386', scen1: '#8A3B22', scen2: '#3F7C85',
      p1: '#8A3B22', p2: '#3F7C85', p3: '#C9A98A', p4: '#B7791F', p5: '#7B7066', p6: '#7A5A8A',
      navBg: '#FFFDFA', navText: '#7B7066', navActive: '#8A3B22', navAccent: '#8A3B22',
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
      navBg: '#101923', navText: '#93A0B2', navActive: '#F2F5F9', navAccent: '#7FB0E6',
    },
  },
}

export const defaultMetrics = (): Metrics => ({ gap: 16, pad: 18, radius: 6, rowHeight: 24, maxWidth: 1680, fontScale: 1 })

export const TOKEN_GROUPS: { title: string; keys: { key: keyof Tokens; label: string }[] }[] = [
  { title: 'Surfaces', keys: [{ key: 'bg', label: 'Fond de page' }, { key: 'surface', label: 'Cartes' }, { key: 'surfaceAlt', label: 'Zones secondaires' }, { key: 'border', label: 'Bordures' }] },
  { title: 'Textes', keys: [{ key: 'heading', label: 'Titres' }, { key: 'text', label: 'Texte' }, { key: 'textMuted', label: 'Sous-titres & légendes' }] },
  { title: 'Marque', keys: [{ key: 'primary', label: 'Couleur principale' }, { key: 'accent', label: 'Accent' }] },
  { title: 'États', keys: [{ key: 'positive', label: 'Positif' }, { key: 'negative', label: 'Négatif' }, { key: 'neutral', label: 'Neutre' }, { key: 'warning', label: 'Alerte' }] },
  { title: 'Navigation', keys: [{ key: 'navBg', label: 'Fond de la barre' }, { key: 'navText', label: 'Texte' }, { key: 'navActive', label: 'Élément actif' }, { key: 'navAccent', label: 'Indicateur actif' }] },
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
