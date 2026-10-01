// Configuration par défaut = vue client recommandée pour une présentation.
// Hiérarchie : 1 synthèse · 2 leviers · 3 résultat · 4 pourquoi · (détail) · (méthodologie).

import type { Layout } from 'react-grid-layout'
import { defaultKpiOrder, defaultKpiVisible } from '../core/kpis'
import { defaultFormat } from '../core/format'
import { defaultMetrics } from './theme'
import type { DashboardConfig, PageConfig, WidgetConfig } from './types'

/** Six leviers qui pèsent le plus sur la demande adressable (classement par sensibilité, scénarios Bas/Central/Haut). */
export const DEFAULT_DRIVERS = ['adrPriv', 'adrFin', 'gIntPriv', 'iaPriv', 'adrIaPriv', 'wPriv']

const METHOD_TEXT = `Le modèle projette la puissance IT nécessaire à Monaco en 2035 pour huit blocs d'entités (DSP, DENJS, APDP, DITN, CHPG, Monaco Telecom, finance, privé hors finance).

Besoin 2035 = baseline 2026 × croissance des effectifs × croissance de l'intensité numérique (hors IA), augmenté d'une surcouche IA.

La demande adressable applique ensuite la part hébergeable à Monaco, séparément pour le socle et pour l'IA.

Trois scénarios (Bas, Central, Haut) portent chacun leurs hypothèses ; le scénario actif pilote les indicateurs et les graphiques à scénario unique.`

const NOTES_TEXT = `- Le surcroît « santé » du CHPG n'a aucun effet dans l'Excel d'origine ; l'option « Traitement du CHPG » permet de l'appliquer.
- La baseline 2026 utilise les valeurs « Bas » des puissances IT par utilisateur : elles sont communes aux trois scénarios.
- La trajectoire annuelle 2026 → 2035 est interpolée ; seul le point 2035 est calculé par l'Excel.
- Sources : IMSEE 2024 (effectifs), benchmarks Axis (débits vidéo), hypothèses d'entretiens.`

const w = (c: WidgetConfig): WidgetConfig => c

export const scenarioWidgets = (): WidgetConfig[] => [
  w({ id: 'headline', kind: 'headline', tier: 'client', visible: true }),
  w({ id: 'kpis', kind: 'kpis', tier: 'client', visible: true }),

  w({ id: 'sec-levers', kind: 'section', tier: 'client', visible: true, title: 'Principaux leviers', subtitle: 'Modifiez une hypothèse : les résultats se mettent à jour en direct' }),
  w({ id: 'drivers', kind: 'drivers', tier: 'client', visible: true, title: 'Hypothèses clés' }),
  w({ id: 'ch-sensitivity', kind: 'chart', tier: 'client', visible: true, datasetId: 'sensitivity', chartType: 'tornado', legend: false }),
  w({ id: 'ch-whatChanged', kind: 'chart', tier: 'client', visible: true, datasetId: 'whatChanged', chartType: 'waterfall', legend: false }),

  w({ id: 'sec-result', kind: 'section', tier: 'client', visible: true, title: 'Résultat principal', subtitle: 'Demande adressable à Monaco à l\'horizon 2035' }),
  w({ id: 'ch-trajectory', kind: 'chart', tier: 'client', visible: true, datasetId: 'trajectory', chartType: 'line', legend: true }),
  w({ id: 'ch-scenarios', kind: 'chart', tier: 'client', visible: true, datasetId: 'scenarios', chartType: 'bar', legend: true }),

  w({ id: 'sec-why', kind: 'section', tier: 'client', visible: true, title: 'Comprendre le résultat', subtitle: 'D\'où vient la demande, et ce qui la fait varier' }),
  w({ id: 'ch-bridge', kind: 'chart', tier: 'client', visible: true, datasetId: 'bridge', chartType: 'waterfall', legend: false }),
  w({ id: 'ch-addrByBlock', kind: 'chart', tier: 'client', visible: true, datasetId: 'addrByBlock', chartType: 'hbar', legend: false }),

  w({ id: 'sec-detail', kind: 'section', tier: 'client', visible: true, collapse: 'detail', title: 'Analyse détaillée', subtitle: 'Tableaux et vues complémentaires' }),
  w({ id: 'tb-detail', kind: 'chart', tier: 'detail', visible: true, datasetId: 'detailTable', chartType: 'table' }),
  w({ id: 'ch-trajectoryBlocks', kind: 'chart', tier: 'detail', visible: true, datasetId: 'trajectoryBlocks', chartType: 'stackedArea', legend: true }),
  w({ id: 'ch-addrByBlockScenario', kind: 'chart', tier: 'detail', visible: true, datasetId: 'addrByBlockScenario', chartType: 'stackedBar', legend: true }),
  w({ id: 'ch-rateByBlock', kind: 'chart', tier: 'detail', visible: true, datasetId: 'rateByBlock', chartType: 'hbar', legend: false }),
  w({ id: 'ch-socleAi', kind: 'chart', tier: 'detail', visible: true, datasetId: 'socleAi', chartType: 'stackedBar', legend: true }),
  w({ id: 'ch-blockOverview', kind: 'chart', tier: 'detail', visible: true, datasetId: 'blockOverview', chartType: 'bar', legend: true }),

  w({ id: 'sec-method', kind: 'section', tier: 'client', visible: true, collapse: 'method', title: 'Hypothèses & méthodologie', subtitle: 'Toutes les hypothèses du modèle, leurs sources et les points d\'attention' }),
  w({ id: 'tx-method', kind: 'text', tier: 'method', visible: true, title: 'Méthodologie', text: METHOD_TEXT }),
  w({ id: 'tb-assumptions', kind: 'assumptionsTable', tier: 'method', visible: true, title: 'Registre des hypothèses' }),
  w({ id: 'tx-notes', kind: 'text', tier: 'method', visible: true, title: 'Points d\'attention', text: NOTES_TEXT }),
]

// Grille de 24 colonnes ; positions déjà compactées (le compactage vertical de la grille ne les modifie pas).
export const scenarioLayout = (): Layout[] => [
  { i: 'headline', x: 0, y: 0, w: 24, h: 5 },
  { i: 'kpis', x: 0, y: 5, w: 24, h: 4 },
  { i: 'sec-levers', x: 0, y: 9, w: 24, h: 2 },
  { i: 'drivers', x: 0, y: 11, w: 9, h: 17 },
  { i: 'ch-sensitivity', x: 9, y: 11, w: 15, h: 9 },
  { i: 'ch-whatChanged', x: 9, y: 20, w: 15, h: 8 },
  { i: 'sec-result', x: 0, y: 28, w: 24, h: 2 },
  { i: 'ch-trajectory', x: 0, y: 30, w: 14, h: 13 },
  { i: 'ch-scenarios', x: 14, y: 30, w: 10, h: 13 },
  { i: 'sec-why', x: 0, y: 43, w: 24, h: 2 },
  { i: 'ch-bridge', x: 0, y: 45, w: 12, h: 13 },
  { i: 'ch-addrByBlock', x: 12, y: 45, w: 12, h: 13 },
  { i: 'sec-detail', x: 0, y: 58, w: 24, h: 2 },
  { i: 'tb-detail', x: 0, y: 60, w: 24, h: 12 },
  { i: 'ch-trajectoryBlocks', x: 0, y: 72, w: 12, h: 12 },
  { i: 'ch-addrByBlockScenario', x: 12, y: 72, w: 12, h: 12 },
  { i: 'ch-rateByBlock', x: 0, y: 84, w: 8, h: 11 },
  { i: 'ch-socleAi', x: 8, y: 84, w: 8, h: 11 },
  { i: 'ch-blockOverview', x: 16, y: 84, w: 8, h: 11 },
  { i: 'sec-method', x: 0, y: 95, w: 24, h: 2 },
  { i: 'tx-method', x: 0, y: 97, w: 9, h: 12 },
  { i: 'tb-assumptions', x: 9, y: 97, w: 15, h: 22 },
  { i: 'tx-notes', x: 0, y: 109, w: 9, h: 10 },
]

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

const GLOBAL_METHOD = `Une seule source de calcul alimente toutes les pages : les scénarios Bas, Central et Haut utilisent exactement les mêmes formules avec des jeux d'hypothèses différents, et chaque acteur est un bloc du même modèle.

Besoin 2035 = baseline 2026 × croissance des effectifs × croissance de l'intensité numérique (hors IA), augmenté d'une surcouche IA. La demande adressable applique ensuite la part hébergeable à Monaco, séparément pour le socle et pour l'IA.`

export const globalWidgets = (): WidgetConfig[] => [
  w({ id: 'g-headline', kind: 'headline', tier: 'client', visible: true }),
  w({ id: 'g-cards', kind: 'scenarioCards', tier: 'client', visible: true }),
  w({ id: 'g-sec-compare', kind: 'section', tier: 'client', visible: true, title: 'Comparer les scénarios', subtitle: 'Un même modèle, trois jeux d\'hypothèses' }),
  w({ id: 'g-trajectory', kind: 'chart', tier: 'client', visible: true, datasetId: 'trajectory', chartType: 'line', legend: true }),
  w({ id: 'g-scenarios', kind: 'chart', tier: 'client', visible: true, datasetId: 'scenarios', chartType: 'bar', legend: true }),
  w({ id: 'g-sec-actors', kind: 'section', tier: 'client', visible: true, title: 'Qui porte la demande ?', subtitle: 'Contribution de chaque acteur à la demande adressable' }),
  w({ id: 'g-actors', kind: 'chart', tier: 'client', visible: true, datasetId: 'actorsAddr', chartType: 'hbar', legend: true }),
  w({ id: 'g-spread', kind: 'chart', tier: 'client', visible: true, datasetId: 'spreadByActor', chartType: 'hbar', legend: false }),
  w({ id: 'g-sec-detail', kind: 'section', tier: 'client', visible: true, collapse: 'detail', title: 'Analyse détaillée', subtitle: 'Tableau de synthèse et vues complémentaires' }),
  w({ id: 'g-detail', kind: 'chart', tier: 'detail', visible: true, datasetId: 'detailTable', chartType: 'table' }),
  w({ id: 'g-blocks', kind: 'chart', tier: 'detail', visible: true, datasetId: 'addrByBlockScenario', chartType: 'stackedBar', legend: true }),
  w({ id: 'g-socle', kind: 'chart', tier: 'detail', visible: true, datasetId: 'socleAi', chartType: 'stackedBar', legend: true }),
  w({ id: 'g-sec-method', kind: 'section', tier: 'client', visible: true, collapse: 'method', title: 'Méthodologie', subtitle: 'Comment le modèle relie hypothèses, scénarios et acteurs' }),
  w({ id: 'g-method', kind: 'text', tier: 'method', visible: true, title: 'Principe', text: GLOBAL_METHOD }),
  w({ id: 'g-notes', kind: 'text', tier: 'method', visible: true, title: 'Points d\'attention', text: NOTES_TEXT }),
]
export const globalLayout = (): Layout[] => stack([
  [['g-headline', 0, 24, 5]],
  [['g-cards', 0, 24, 6]],
  [['g-sec-compare', 0, 24, 2]],
  [['g-trajectory', 0, 14, 13], ['g-scenarios', 14, 10, 13]],
  [['g-sec-actors', 0, 24, 2]],
  [['g-actors', 0, 14, 15], ['g-spread', 14, 10, 15]],
  [['g-sec-detail', 0, 24, 2]],
  [['g-detail', 0, 24, 12]],
  [['g-blocks', 0, 12, 12], ['g-socle', 12, 12, 12]],
  [['g-sec-method', 0, 24, 2]],
  [['g-method', 0, 12, 10], ['g-notes', 12, 12, 10]],
])

export const actorWidgets = (): WidgetConfig[] => [
  w({ id: 'a-headline', kind: 'headline', tier: 'client', visible: true }),
  w({ id: 'a-kpis', kind: 'actorKpis', tier: 'client', visible: true }),
  w({ id: 'a-sec-levers', kind: 'section', tier: 'client', visible: true, title: 'Leviers de l\'acteur', subtitle: 'Les hypothèses qui font réellement varier cet acteur' }),
  w({ id: 'a-drivers', kind: 'drivers', tier: 'client', visible: true, title: 'Hypothèses de l\'acteur', hypSource: 'actor' }),
  w({ id: 'a-bridge', kind: 'chart', tier: 'client', visible: true, datasetId: 'actorBridge', chartType: 'waterfall', legend: false }),
  w({ id: 'a-sens', kind: 'chart', tier: 'client', visible: true, datasetId: 'actorSensitivity', chartType: 'tornado', legend: false }),
  w({ id: 'a-sec-scen', kind: 'section', tier: 'client', visible: true, title: 'Selon les scénarios', subtitle: 'La même analyse pour Bas, Central et Haut' }),
  w({ id: 'a-scenarios', kind: 'chart', tier: 'client', visible: true, datasetId: 'actorScenarios', chartType: 'bar', legend: true }),
  w({ id: 'a-trajectory', kind: 'chart', tier: 'client', visible: true, datasetId: 'actorTrajectory', chartType: 'line', legend: true }),
  w({ id: 'a-sec-detail', kind: 'section', tier: 'client', visible: true, collapse: 'detail', title: 'Détail du calcul', subtitle: 'De la baseline 2026 à la demande adressable 2035' }),
  w({ id: 'a-table', kind: 'chart', tier: 'detail', visible: true, datasetId: 'actorTable', chartType: 'table' }),
  w({ id: 'a-note', kind: 'actorNote', tier: 'detail', visible: true, title: 'Méthode de calcul' }),
]
export const actorLayout = (): Layout[] => stack([
  [['a-headline', 0, 24, 5]],
  [['a-kpis', 0, 24, 4]],
  [['a-sec-levers', 0, 24, 2]],
  [['a-drivers', 0, 9, 18], ['a-bridge', 9, 15, 9], ['a-sens', 9, 15, 9, 9]],
  [['a-sec-scen', 0, 24, 2]],
  [['a-scenarios', 0, 10, 13], ['a-trajectory', 10, 14, 13]],
  [['a-sec-detail', 0, 24, 2]],
  [['a-table', 0, 12, 12], ['a-note', 12, 12, 12]],
])

export const PAGE_DEFAULTS: Record<'global' | 'scenario' | 'actor', () => PageConfig> = {
  global: () => ({ widgets: globalWidgets(), layout: globalLayout() }),
  scenario: () => ({ widgets: scenarioWidgets(), layout: scenarioLayout() }),
  actor: () => ({ widgets: actorWidgets(), layout: actorLayout() }),
}

export const createDefaultConfig = (): DashboardConfig => ({
  version: 3,
  brand: 'Monaco · Besoins IT 2035',
  footnote: 'Source : modèle Monaco_Besoins_IT_v2 · IMSEE 2024 · hypothèses de travail. Puissances exprimées en puissance IT. Les totaux peuvent différer légèrement de la somme des éléments affichés (arrondis d\'affichage uniquement ; les calculs sont réalisés en pleine précision).',
  theme: { preset: 'cabinet', tokens: {}, metrics: defaultMetrics() },
  format: defaultFormat(),
  labels: {},
  kpis: { order: defaultKpiOrder(), visible: defaultKpiVisible() },
  hyps: { visible: [...DEFAULT_DRIVERS], notes: {} },
  pages: { global: PAGE_DEFAULTS.global(), scenario: PAGE_DEFAULTS.scenario(), actor: PAGE_DEFAULTS.actor() },
})
