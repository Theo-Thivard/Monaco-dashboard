// Configuration par défaut = vue client recommandée pour une présentation.
// Livrable 2 (besoins générés à Monaco) : trajectoire et chiffres des trois scénarios d'abord ;
// pages Scénario / Acteur : hypothèses à gauche, cascade et trajectoire à droite.

import type { Layout } from 'react-grid-layout'
import { defaultKpiOrder, defaultKpiVisible } from '../core/kpis'
import { defaultFormat } from '../core/format'
import { defaultMetrics } from './theme'
import type { DashboardConfig, PageConfig, WidgetConfig } from './types'

/** Six leviers qui pèsent le plus sur la demande adressable (classement par sensibilité, scénarios Bas/Central/Haut). */
export const DEFAULT_DRIVERS = ['adrPriv', 'adrFin', 'gIntPriv', 'iaPriv', 'adrIaPriv', 'wPriv']

const METHOD_TEXT = `Le modèle de calcul est le classeur Excel lui-même : valeurs et formules sont lues à chaque lancement du tableau de bord, puis recalculées avec les hypothèses que vous modifiez ici. Modifier une valeur ou une formule dans l'Excel est donc repris automatiquement.

Pour chaque acteur (DSP, DENJS, APDP, DITN, CHPG, Monaco Telecom, finance, privé hors finance), l'Excel projette le besoin IT 2035 à partir de la baseline 2026, de la croissance des effectifs et de l'intensité numérique, puis d'une surcouche IA ; la demande adressable applique ensuite la part hébergeable à Monaco, séparément pour le socle et pour l'IA.

Trois scénarios (Bas, Central, Haut) portent chacun leurs hypothèses ; le scénario actif pilote les indicateurs et les graphiques à scénario unique.`

const NOTES_TEXT = `- Source du modèle : voir « Source du modèle » ci-dessous (fichier Excel, origine, contrôles).
- Une hypothèse signalée « sans effet » n'intervient plus dans les résultats de l'Excel actuel (formule modifiée).
- La trajectoire annuelle 2026 → 2035 est interpolée (croissance composée, montée linéaire de l'IA) ; seul 2035 est calculé par l'Excel.
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
  w({ id: 'headline', kind: 'headline', tier: 'client', visible: true }),
  w({ id: 'kpis', kind: 'kpis', tier: 'client', visible: true }),

  w({ id: 'sec-levers', kind: 'section', tier: 'client', visible: true, title: 'Cascade et trajectoire', subtitle: 'Modifiez les hypothèses dans le panneau de gauche : tout se met à jour en direct' }),
  w({ id: 'ch-bridge', kind: 'chart', tier: 'client', visible: true, datasetId: 'bridge', chartType: 'waterfall', legend: false }),
  w({ id: 'ch-trajectory', kind: 'chart', tier: 'client', visible: true, datasetId: 'trajectory', chartType: 'line', legend: true }),

  w({ id: 'sec-why', kind: 'section', tier: 'client', visible: true, title: 'Comprendre le résultat', subtitle: 'D\'où vient la demande, scénario par scénario' }),
  w({ id: 'ch-addrByBlock', kind: 'chart', tier: 'client', visible: true, datasetId: 'addrByBlock', chartType: 'hbar', legend: false }),
  w({ id: 'ch-scenarios', kind: 'chart', tier: 'client', visible: true, datasetId: 'scenarios', chartType: 'bar', legend: true }),

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
export const scenarioLayout = (): Layout[] => stack([
  [['headline', 0, 24, 5]],
  [['kpis', 0, 24, 4]],
  [['sec-levers', 0, 24, 2]],
  [['ch-bridge', 0, 12, 14], ['ch-trajectory', 12, 12, 14]],
  [['sec-why', 0, 24, 2]],
  [['ch-addrByBlock', 0, 12, 13], ['ch-scenarios', 12, 12, 13]],
  [['sec-detail', 0, 24, 2]],
  [['tb-detail', 0, 24, 12]],
  [['ch-trajectoryBlocks', 0, 12, 12], ['ch-addrByBlockScenario', 12, 12, 12]],
  [['ch-rateByBlock', 0, 8, 11], ['ch-socleAi', 8, 8, 11], ['ch-blockOverview', 16, 8, 11]],
  [['sec-method', 0, 24, 2]],
  [['tx-method', 0, 9, 12], ['tb-assumptions', 9, 15, 22], ['tx-notes', 0, 9, 10, 12]],
])

const GLOBAL_METHOD = `Une seule source de calcul alimente toutes les pages : le classeur Excel, lu à chaque lancement. Les scénarios Bas, Central et Haut utilisent exactement les mêmes formules avec des jeux d'hypothèses différents, et chaque acteur est un bloc du même modèle.\n\nSi une valeur ou une formule change dans l'Excel, le tableau de bord s'adapte automatiquement : aucun calcul n'est écrit dans le tableau de bord.`

export const globalWidgets = (): WidgetConfig[] => [
  w({ id: 'g-trajectory', kind: 'chart', tier: 'client', visible: true, datasetId: 'trajectory', chartType: 'line', legend: true, title: 'Évolution du besoin IT 2026 → 2035', subtitle: 'Trois scénarios (profil annuel interpolé entre 2026 et 2035)' }),
  w({ id: 'g-cards', kind: 'scenarioCards', tier: 'client', visible: true }),
  w({ id: 'g-headline', kind: 'headline', tier: 'client', visible: true, headline: { hideTitle: true } }),
  w({ id: 'g-sec-actors', kind: 'section', tier: 'client', visible: true, title: 'Qui génère le besoin ?', subtitle: 'Contribution de chaque acteur, par scénario' }),
  w({ id: 'g-actors', kind: 'chart', tier: 'client', visible: true, datasetId: 'actorsAddr', chartType: 'hbar', legend: true }),
  w({ id: 'g-spread', kind: 'chart', tier: 'client', visible: true, datasetId: 'spreadByActor', chartType: 'hbar', legend: false }),
  w({ id: 'g-sec-detail', kind: 'section', tier: 'client', visible: true, collapse: 'detail', title: 'Analyse détaillée', subtitle: 'Tableau de synthèse et vues complémentaires' }),
  w({ id: 'g-scenarios', kind: 'chart', tier: 'detail', visible: true, datasetId: 'scenarios', chartType: 'bar', legend: true }),
  w({ id: 'g-detail', kind: 'chart', tier: 'detail', visible: true, datasetId: 'detailTable', chartType: 'table' }),
  w({ id: 'g-blocks', kind: 'chart', tier: 'detail', visible: true, datasetId: 'addrByBlockScenario', chartType: 'stackedBar', legend: true }),
  w({ id: 'g-socle', kind: 'chart', tier: 'detail', visible: true, datasetId: 'socleAi', chartType: 'stackedBar', legend: true }),
  w({ id: 'g-sec-method', kind: 'section', tier: 'client', visible: true, collapse: 'method', title: 'Méthodologie', subtitle: 'Comment le modèle relie hypothèses, scénarios et acteurs' }),
  w({ id: 'g-method', kind: 'text', tier: 'method', visible: true, title: 'Principe', text: GLOBAL_METHOD }),
  w({ id: 'g-notes', kind: 'text', tier: 'method', visible: true, title: 'Points d\'attention', text: NOTES_TEXT }),
  w({ id: 'g-model', kind: 'modelInfo', tier: 'method', visible: true, title: 'Source du modèle', subtitle: 'Fichier Excel lu à chaque lancement' }),
]
export const globalLayout = (): Layout[] => stack([
  [['g-cards', 0, 15, 8], ['g-headline', 15, 9, 8]],
  [['g-trajectory', 0, 24, 15]],
  [['g-sec-actors', 0, 24, 2]],
  [['g-actors', 0, 14, 15], ['g-spread', 14, 10, 15]],
  [['g-sec-detail', 0, 24, 2]],
  [['g-scenarios', 0, 12, 12], ['g-socle', 12, 12, 12]],
  [['g-detail', 0, 24, 12]],
  [['g-blocks', 0, 24, 12]],
  [['g-sec-method', 0, 24, 2]],
  [['g-method', 0, 12, 10], ['g-notes', 12, 12, 10]],
  [['g-model', 0, 24, 16]],
])

export const actorWidgets = (): WidgetConfig[] => [
  w({ id: 'a-headline', kind: 'headline', tier: 'client', visible: true }),
  w({ id: 'a-kpis', kind: 'actorKpis', tier: 'client', visible: true }),
  w({ id: 'a-sec-levers', kind: 'section', tier: 'client', visible: true, title: 'Cascade et trajectoire de l\'acteur', subtitle: 'Le panneau de gauche ne montre que les hypothèses qui font varier cet acteur' }),
  w({ id: 'a-bridge', kind: 'chart', tier: 'client', visible: true, datasetId: 'actorBridge', chartType: 'waterfall', legend: false }),
  w({ id: 'a-trajectory', kind: 'chart', tier: 'client', visible: true, datasetId: 'actorTrajectory', chartType: 'line', legend: true }),
  w({ id: 'a-sec-scen', kind: 'section', tier: 'client', visible: true, title: 'Selon les scénarios', subtitle: 'La même analyse pour Bas, Central et Haut' }),
  w({ id: 'a-scenarios', kind: 'chart', tier: 'client', visible: true, datasetId: 'actorScenarios', chartType: 'bar', legend: true }),
  w({ id: 'a-sec-detail', kind: 'section', tier: 'client', visible: true, collapse: 'detail', title: 'Détail du calcul', subtitle: 'De la baseline 2026 à 2035' }),
  w({ id: 'a-table', kind: 'chart', tier: 'detail', visible: true, datasetId: 'actorTable', chartType: 'table' }),
  w({ id: 'a-note', kind: 'actorNote', tier: 'detail', visible: true, title: 'Méthode de calcul' }),
]
export const actorLayout = (): Layout[] => stack([
  [['a-headline', 0, 24, 5]],
  [['a-kpis', 0, 24, 4]],
  [['a-sec-levers', 0, 24, 2]],
  [['a-bridge', 0, 12, 14], ['a-trajectory', 12, 12, 14]],
  [['a-sec-scen', 0, 24, 2]],
  [['a-scenarios', 0, 24, 12]],
  [['a-sec-detail', 0, 24, 2]],
  [['a-table', 0, 12, 12], ['a-note', 12, 12, 12]],
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
  theme: { preset: 'cabinet', tokens: {}, metrics: defaultMetrics() },
  format: defaultFormat(),
  labels: {},
  kpis: { order: defaultKpiOrder(), visible: defaultKpiVisible() },
  actors: { order: null, hidden: [] },
  hyps: { visible: [...DEFAULT_DRIVERS], notes: {} },
  pages: { global: PAGE_DEFAULTS.global(), scenario: PAGE_DEFAULTS.scenario(), actor: PAGE_DEFAULTS.actor() },
})
