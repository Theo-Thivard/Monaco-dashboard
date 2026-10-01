import type { Layout } from 'react-grid-layout'
import type { WidgetCfg } from './store'

export interface CatalogItem {
  type: string
  title: string
  w: number
  h: number
  group?: string
  desc: string
  /** le widget dépend du scénario choisi (global ou propre au widget) */
  scenario?: boolean
  kind: 'curseurs' | 'graphique' | 'tableau'
}

// Grille de 24 colonnes
export const CATALOG: Record<string, CatalogItem> = {
  'sliders-eff': { type: 'sliders', group: 'eff', title: 'Croissance des effectifs', w: 6, h: 10, kind: 'curseurs', desc: 'Curseurs – effectifs publics / finance / privé' },
  'sliders-int': { type: 'sliders', group: 'int', title: 'Intensité numérique', w: 6, h: 10, kind: 'curseurs', desc: 'Curseurs – intensité numérique hors IA' },
  'sliders-ia': { type: 'sliders', group: 'ia', title: 'Surcouche IA 2035', w: 6, h: 10, kind: 'curseurs', desc: 'Curseurs – surcouche IA' },
  'sliders-adr': { type: 'sliders', group: 'adr', title: 'Part adressable – socle', w: 6, h: 10, kind: 'curseurs', desc: 'Curseurs – part adressable hors IA' },
  'sliders-adrIa': { type: 'sliders', group: 'adrIa', title: 'Part adressable – IA', w: 6, h: 10, kind: 'curseurs', desc: 'Curseurs – part adressable de la surcouche IA' },
  'sliders-w': { type: 'sliders', group: 'w', title: 'Baseline 2026 (W IT / utilisateur)', w: 6, h: 7, kind: 'curseurs', desc: 'Curseurs – W IT par utilisateur 2026' },
  'sliders-video': { type: 'sliders', group: 'video', title: 'DSP – vidéo', w: 6, h: 7, kind: 'curseurs', desc: 'Curseurs – caméras, bitrate' },
  'sliders-chpg': { type: 'sliders', group: 'chpg', title: 'CHPG', w: 6, h: 7, kind: 'curseurs', desc: 'Curseurs – croissance et digitalisation CHPG' },

  hyps: { type: 'hyps', title: 'Hypothèses sélectionnées', w: 6, h: 14, kind: 'curseurs', desc: 'Curseurs des hypothèses cochées dans le menu « Hypothèses »' },

  kpi: { type: 'kpi', title: 'Indicateurs clés 2035', w: 18, h: 6, kind: 'graphique', desc: 'Cartes : besoin, demande adressable, taux, croissance (vs Excel)' },
  compare: { type: 'compare', title: 'Scénarios : 2026 vs 2035', w: 9, h: 11, kind: 'graphique', desc: 'Barres : baseline 2026, besoin 2035, demande adressable' },
  trajectory: { type: 'trajectory', title: 'Trajectoire 2026 → 2035', w: 9, h: 11, kind: 'graphique', desc: 'Courbes annuelles de la demande adressable (3 scénarios)' },
  stacked: { type: 'stacked', title: 'Demande adressable par bloc', w: 9, h: 11, kind: 'graphique', desc: 'Barres empilées par bloc d\'entités et scénario' },
  waterfall: { type: 'waterfall', title: 'Du besoin 2026 à la demande adressable', w: 9, h: 11, kind: 'graphique', scenario: true, desc: 'Cascade : effectifs, intensité, IA, non adressable' },
  tornado: { type: 'tornado', title: 'Sensibilité (tornade)', w: 9, h: 11, kind: 'graphique', scenario: true, desc: 'Impact de chaque hypothèse sur la demande adressable' },
  donut: { type: 'donut', title: 'Répartition de la demande adressable', w: 9, h: 11, kind: 'graphique', scenario: true, desc: 'Camembert par bloc' },
  blockBase: { type: 'blockBase', title: 'Par bloc : 2026 → 2035', w: 9, h: 11, kind: 'graphique', scenario: true, desc: 'Barres : baseline, besoin 2035, adressable par bloc' },
  rate: { type: 'rate', title: 'Taux adressable par bloc', w: 9, h: 11, kind: 'graphique', scenario: true, desc: 'Part du besoin 2035 captable à Monaco' },
  socleIA: { type: 'socleIA', title: 'Socle vs surcouche IA', w: 6, h: 11, kind: 'graphique', desc: 'Demande adressable : socle hors IA vs IA' },
  areaBlocks: { type: 'areaBlocks', title: 'Trajectoire par bloc', w: 18, h: 11, kind: 'graphique', scenario: true, desc: 'Aires empilées de la demande adressable par bloc' },
  table: { type: 'table', title: 'Tableau détaillé (MW IT)', w: 12, h: 11, kind: 'tableau', desc: 'Valeurs par bloc et par scénario' },
}


const POS: Record<string, [number, number]> = {
  'sliders-eff': [0, 0], 'sliders-int': [0, 10], 'sliders-ia': [0, 20], 'sliders-adr': [0, 30],
  'sliders-adrIa': [0, 40], 'sliders-w': [0, 50], 'sliders-video': [0, 57], 'sliders-chpg': [0, 64],
  kpi: [6, 0], compare: [6, 6], trajectory: [15, 6], stacked: [6, 17], waterfall: [15, 17],
  tornado: [6, 28], donut: [15, 28], blockBase: [6, 39], rate: [15, 39],
  socleIA: [6, 50], table: [12, 50], areaBlocks: [6, 61],
}

export const defaultWidgets = (): WidgetCfg[] =>
  Object.entries(CATALOG).filter(([key]) => key !== 'hyps').map(([key, c]) => ({ id: key, type: c.type, title: c.title, group: c.group, scenario: 'global', legend: true }))

export const defaultLayout = (): Layout[] =>
  Object.entries(CATALOG).filter(([key]) => key !== 'hyps').map(([key, c]) => ({ i: key, x: POS[key][0], y: POS[key][1], w: c.w, h: c.h }))
