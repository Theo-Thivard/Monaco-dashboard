// Configuration par défaut = vue client recommandée pour une présentation.
// Livrable 2 (besoins générés à Monaco) : trajectoire et chiffres des trois scénarios d'abord ;
// pages Scénario / Acteur : hypothèses à gauche, cascade et trajectoire à droite.

import type { Layout } from 'react-grid-layout'
import { defaultActorKpiOrder, defaultActorKpiVisible, defaultKpiOrder, defaultKpiVisible } from '../core/kpis'
import { defaultFormat } from '../core/format'
import { defaultMetrics } from './theme'
import { defaultTypography } from './typography'
import type { DashboardConfig, PageConfig, WidgetConfig } from './types'

const METHOD_TEXT = `Le modèle de calcul est le classeur Excel lui-même. Le tableau de bord lit ses valeurs et ses formules à chaque lancement, puis les recalcule avec les hypothèses que vous réglez. Toute modification de l'Excel est donc reprise automatiquement.

Pour chaque acteur (DSP, autres entités publiques, Sapeurs Pompiers, DITN, CHPG, Monaco Telecom, finance, privé hors finance), l'Excel part du besoin IT de 2026, applique la croissance des effectifs et de l'intensité numérique, puis ajoute une surcouche IA : cela donne le besoin 2035. La demande adressable en est la part hébergée à Monaco, calculée séparément pour le besoin classique et pour l'IA.

Chacun des trois scénarios (de base, d'accélération, de rupture) a ses propres hypothèses. Le scénario actif pilote les indicateurs et les graphiques qui n'en montrent qu'un.`

const NOTES_TEXT = `- Source du modèle : fichier Excel, origine et contrôles détaillés dans « Source du modèle ».
- Une hypothèse marquée « sans effet » ne change plus aucun résultat de l'Excel actuel (sa formule a été modifiée).
- Seul 2035 est calculé par l'Excel. Les années intermédiaires sont interpolées : croissance composée pour le besoin, montée linéaire pour l'IA.
- Sources des hypothèses : colonne « Source / rationnel » de l'Excel (IMSEE 2024, benchmarks Axis, entretiens).`

const w = (c: WidgetConfig): WidgetConfig => c

/** Empile des rangées de widgets : y = somme des hauteurs précédentes (positions déjà compactes). */
function stack(rows: [id: string, x: number, w: number, h: number, dy?: number][][]): Layout[] {
  const out: Layout[] = []
  let y = 0
  for (const row of rows) {
    for (const [i, x, w, h, dy = 0] of row) out.push({ i, x, y: y + dy, w, h })
    y += Math.max(...row.map((r) => (r[4] ?? 0) + r[3]))
  }
  return out
}

export const scenarioWidgets = (): WidgetConfig[] => [
  w({ id: 'headline', kind: 'headline', tier: 'client', visible: true, headline: { title: 'Le besoin IT à Monaco atteint **{actif}** en 2035, soit **{hausse}** de plus qu\'en 2026 ({2026}).', hideBullets: true },
    entityText: Object.fromEntries([0, 1, 2].map((i) => [`scenario:${i}`, { headline: { title: 'Le besoin à Monaco atteint **{actif}** en 2035, soit **{hausse}** de plus qu\'en 2026 ({2026}).' } }])) }),
  w({ id: 'kpis', kind: 'kpis', tier: 'client', visible: true }),

  w({ id: 'sec-levers', kind: 'section', tier: 'client', visible: false, title: 'Cascade et trajectoire', subtitle: 'Réglez les hypothèses dans le panneau de gauche : les résultats se recalculent immédiatement' }),
  w({ id: 'ch-bridge', kind: 'chart', tier: 'client', visible: true, datasetId: 'bridge', chartType: 'waterfall', legend: false }),
  w({ id: 'ch-trajectory', kind: 'chart', tier: 'client', visible: true, datasetId: 'trajectory', chartType: 'line', legend: true, showInitial: true, lensOverrides: { need: { axisMin: 1, axisMax: 10, chartType: 'area' } } }),

  w({ id: 'sec-why', kind: 'section', tier: 'client', visible: true, title: 'Comprendre le résultat', subtitle: 'Qui porte la demande, pour le scénario affiché' }),
  w({ id: 'ch-addrByBlock', kind: 'chart', tier: 'client', visible: true, datasetId: 'addrByBlock', chartType: 'hbar', legend: false, showInitial: true }),
  w({ id: 'ch-scenarios', kind: 'chart', tier: 'client', visible: false, datasetId: 'scenarios', chartType: 'bar', legend: true }),

  w({ id: 'sec-detail', kind: 'section', tier: 'client', visible: true, collapse: 'detail', title: 'Analyse détaillée', subtitle: 'Tableaux et graphiques complémentaires' }),
  w({ id: 'tb-detail', kind: 'chart', tier: 'detail', visible: true, datasetId: 'detailTable', chartType: 'table' }),
  w({ id: 'ch-trajectoryBlocks', kind: 'chart', tier: 'detail', visible: true, datasetId: 'trajectoryBlocks', chartType: 'stackedArea', legend: true }),
  w({ id: 'ch-addrByBlockScenario', kind: 'chart', tier: 'detail', visible: true, datasetId: 'addrByBlockScenario', chartType: 'stackedBar', legend: true, showInitial: true }),
  w({ id: 'ch-rateByBlock', kind: 'chart', tier: 'detail', visible: true, datasetId: 'rateByBlock', chartType: 'hbar', legend: false }),
  w({ id: 'ch-socleAi', kind: 'chart', tier: 'detail', visible: true, datasetId: 'socleAi', chartType: 'stackedBar', legend: true }),
  w({ id: 'ch-blockOverview', kind: 'chart', tier: 'detail', visible: true, datasetId: 'blockOverview', chartType: 'bar', legend: true }),

  w({ id: 'sec-method', kind: 'section', tier: 'client', visible: true, collapse: 'method', title: 'Hypothèses & méthodologie', subtitle: 'Hypothèses du modèle, sources et points d\'attention' }),
  w({ id: 'tx-method', kind: 'text', tier: 'method', visible: false, title: 'Méthodologie', text: METHOD_TEXT }),
  w({ id: 'tb-assumptions', kind: 'assumptionsTable', tier: 'method', visible: true, title: 'Registre des hypothèses' }),
  w({ id: 'tx-notes', kind: 'text', tier: 'method', visible: false, title: 'Points d\'attention', text: NOTES_TEXT }),
]

// Grille de 24 colonnes ; positions déjà compactées (le compactage vertical de la grille ne les modifie pas).
export const scenarioLayout = (): Layout[] => stack([
  // l'essentiel tient sur un écran : message clé, indicateurs (2026 d'abord), cascade et trajectoire ; le reste se découvre en faisant défiler
  [['headline', 0, 24, 2.5]],
  [['kpis', 0, 24, 2.5]],
  [['sec-levers', 0, 24, 2]],
  [['ch-bridge', 0, 12, 14], ['ch-trajectory', 12, 12, 14]],
  [['sec-why', 0, 24, 2]],
  [['ch-addrByBlock', 0, 24, 10], ['ch-scenarios', 0, 12, 11]],
  [['sec-detail', 0, 24, 2]],
  [['ch-trajectoryBlocks', 0, 12, 12], ['ch-addrByBlockScenario', 12, 12, 12]],
  [['ch-rateByBlock', 0, 8, 11], ['ch-socleAi', 8, 8, 11], ['ch-blockOverview', 16, 8, 11]],
  [['tb-detail', 0, 24, 10]],
  [['sec-method', 0, 24, 2]],
  [['tb-assumptions', 0, 24, 22], ['tx-method', 0, 9, 12], ['tx-notes', 9, 15, 10]],
])

const GLOBAL_METHOD = `Une seule source de calcul alimente toutes les pages : le classeur Excel, lu à chaque lancement. Les scénarios de base, d'accélération et de rupture utilisent exactement les mêmes formules avec des jeux d'hypothèses différents, et chaque acteur est un bloc du même modèle.\n\nSi une valeur ou une formule change dans l'Excel, le tableau de bord s'adapte automatiquement : aucun calcul n'est écrit dans le tableau de bord.`

export const globalWidgets = (): WidgetConfig[] => [
  // par défaut : chiffres clés, puis l'évolution du besoin seule, puis « Décomposition de la demande » (qui porte la demande + répartition par bloc)
  w({ id: 'g-cards', kind: 'scenarioCards', tier: 'client', visible: true }),
  w({ id: 'g-headline', kind: 'headline', tier: 'client', visible: true, headline: { kicker: ' ', title: 'Besoin à Monaco en 2026 : **{2026}**', hideBullets: true } }),
  w({ id: 'g-trajectory', kind: 'chart', tier: 'client', visible: true, datasetId: 'trajectory', chartType: 'area', legend: true, subtitle: '', axisMin: 2, axisMax: 10, showInitial: true, lensOverrides: { addressable: { axisMin: 0, axisMax: 8 } } }),
  w({ id: 'g-sec-actors', kind: 'section', tier: 'client', visible: true, title: 'Décomposition de la demande', subtitle: 'Par acteur, puis par bloc : les trois scénarios comparés à 2026' }),
  w({ id: 'g-actors', kind: 'chart', tier: 'client', visible: true, datasetId: 'actorsAddr', chartType: 'hbar', legend: true }),
  w({ id: 'g-blocks', kind: 'chart', tier: 'client', visible: true, datasetId: 'addrByBlockScenario', chartType: 'stackedBar', legend: true, showInitial: true }),
  w({ id: 'g-sec-detail', kind: 'section', tier: 'client', visible: true, collapse: 'detail', title: 'Analyse détaillée', subtitle: '' }),
  w({ id: 'g-socle', kind: 'chart', tier: 'detail', visible: true, datasetId: 'socleAi', chartType: 'stackedBar', legend: true }),
  w({ id: 'g-spread', kind: 'chart', tier: 'detail', visible: true, datasetId: 'spreadByActor', chartType: 'hbar', legend: false }),
  w({ id: 'g-detail', kind: 'chart', tier: 'detail', visible: true, datasetId: 'detailTable', chartType: 'table' }),
  w({ id: 'g-scenarios', kind: 'chart', tier: 'detail', visible: false, datasetId: 'scenarios', chartType: 'bar', legend: true }),
  w({ id: 'g-sec-method', kind: 'section', tier: 'client', visible: false, collapse: 'method', title: 'Méthodologie', subtitle: 'Comment le modèle passe des hypothèses aux résultats' }),
  w({ id: 'g-method', kind: 'text', tier: 'method', visible: false, title: 'Principe', text: GLOBAL_METHOD }),
  w({ id: 'g-notes', kind: 'text', tier: 'method', visible: false, title: 'Points d\'attention', text: NOTES_TEXT }),
  w({ id: 'g-model', kind: 'modelInfo', tier: 'method', visible: false, title: 'Source du modèle', subtitle: 'Fichier Excel relu à chaque lancement' }),
]
export const globalLayout = (): Layout[] => stack([
  [['g-cards', 0, 16, 4], ['g-headline', 16, 8, 4]],
  [['g-trajectory', 0, 24, 14.5]],
  [['g-sec-actors', 0, 24, 2]],
  [['g-actors', 0, 12, 12], ['g-blocks', 12, 12, 12]],
  [['g-sec-detail', 0, 24, 1.5]],
  [['g-socle', 0, 12, 9], ['g-spread', 12, 12, 9]],
  [['g-detail', 0, 24, 10], ['g-scenarios', 0, 12, 12]],
  [['g-sec-method', 0, 24, 2]],
  [['g-method', 0, 12, 10], ['g-notes', 12, 12, 10]],
  [['g-model', 0, 24, 16]],
])

export const actorWidgets = (): WidgetConfig[] => [
  w({ id: 'a-headline', kind: 'headline', tier: 'client', visible: true, headline: { hideBullets: true, title: '**{acteur}** : **{actif}** de besoin en 2035, soit **{poids}** du besoin total.' } }),
  w({ id: 'a-kpis', kind: 'actorKpis', tier: 'client', visible: true }),
  w({ id: 'a-sec-levers', kind: 'section', tier: 'client', visible: false, title: 'Cascade et trajectoire de l\'acteur', subtitle: 'Le panneau de gauche ne montre que les hypothèses qui jouent sur cet acteur' }),
  w({ id: 'a-bridge', kind: 'chart', tier: 'client', visible: true, datasetId: 'actorBridge', chartType: 'waterfall', legend: false }),
  w({ id: 'a-trajectory', kind: 'chart', tier: 'client', visible: true, datasetId: 'actorTrajectory', chartType: 'line', legend: true, showInitial: true, lensOverrides: { need: { chartType: 'area' } } }),
  // « Selon les scénarios » (besoin par scénario) retiré de l'affichage par défaut
  w({ id: 'a-sec-scen', kind: 'section', tier: 'client', visible: false, title: 'Selon les scénarios', subtitle: 'La même analyse pour les scénarios de base, d\'accélération et de rupture' }),
  w({ id: 'a-scenarios', kind: 'chart', tier: 'client', visible: false, datasetId: 'actorScenarios', chartType: 'bar', legend: true }),
  w({ id: 'a-sec-detail', kind: 'section', tier: 'client', visible: true, collapse: 'detail', title: 'Détail du calcul', subtitle: 'De 2026 à 2035, étape par étape' }),
  w({ id: 'a-table', kind: 'chart', tier: 'detail', visible: true, datasetId: 'actorTable', chartType: 'table' }),
  w({ id: 'a-note', kind: 'actorNote', tier: 'detail', visible: false, title: 'Méthode de calcul' }),
]
export const actorLayout = (): Layout[] => stack([
  [['a-headline', 0, 24, 2.5]],
  [['a-kpis', 0, 24, 3]],
  [['a-sec-levers', 0, 24, 2]],
  [['a-bridge', 0, 12, 13.5], ['a-trajectory', 12, 12, 13.5]],
  [['a-sec-scen', 0, 24, 2]],
  [['a-scenarios', 0, 24, 12]],
  [['a-sec-detail', 0, 24, 2]],
  [['a-table', 0, 14, 7.5], ['a-note', 14, 10, 12]],
])

export const PAGE_DEFAULTS: Record<'global' | 'scenario' | 'actor', () => PageConfig> = {
  global: () => ({ widgets: globalWidgets(), layout: globalLayout() }),
  scenario: () => ({ widgets: scenarioWidgets(), layout: scenarioLayout() }),
  actor: () => ({ widgets: actorWidgets(), layout: actorLayout() }),
}

export const createDefaultConfig = (): DashboardConfig => ({
  version: 4,
  brand: 'Monaco · Besoins IT 2035',
  footnote: 'Sources : IMSEE 2024 · hypothèses de travail. Puissances exprimées en puissance IT. Les totaux peuvent différer légèrement de la somme des éléments affichés (arrondis d\'affichage uniquement ; les calculs sont réalisés en pleine précision).',
  theme: { preset: 'cabinet', tokens: {}, metrics: defaultMetrics(), typo: defaultTypography() },
  format: defaultFormat(),
  labels: Object.fromEntries([0, 1, 2].map((i) => [`scenpanel:sub:${i}`, '**{hausse}** d\'ici 2035'])),
  kpis: { order: defaultKpiOrder(), visible: defaultKpiVisible() },
  titlesLinked: false,
  actorKpis: { order: defaultActorKpiOrder(), visible: defaultActorKpiVisible() },
  actors: { order: null, hidden: [] },
  hyps: { sets: {}, notes: {} },
  units: {},
  pages: { global: PAGE_DEFAULTS.global(), scenario: PAGE_DEFAULTS.scenario(), actor: PAGE_DEFAULTS.actor() },
})
