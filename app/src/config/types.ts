import type { Layout } from 'react-grid-layout'
import type { Lens } from '../core/lens'
import type { ChartType } from '../core/datasets'
import type { FormatSettings } from '../core/format'
import type { PageKind } from '../state/route'
import type { Metrics, PresetId, Tokens } from './theme'
import type { Typography } from './typography'

export type WidgetKind = 'section' | 'headline' | 'kpis' | 'scenarioCards' | 'actorKpis' | 'drivers' | 'chart' | 'assumptionsTable' | 'text' | 'actorNote' | 'modelInfo'
/** client = vue par défaut ; detail / method = repliés derrière leur section */
export type Tier = 'client' | 'detail' | 'method'

/** curseurs des 3 scénarios : « Groupés » (un curseur, variation proportionnelle, valeur du Central affichée) ou « Indépendants » (un curseur par scénario) */
export type HypMode = 'together' | 'three'

export interface SeriesStyle { name?: string; color?: string; hidden?: boolean }

/** Réglages de graphique propres à une lecture (Besoins générés / adressables) : échelles, type, légende, séries… */
export type LensOverride = Partial<Pick<WidgetConfig, 'chartType' | 'legend' | 'decimals' | 'axisMin' | 'axisMax' | 'series' | 'seriesOrder'>>

/** Textes propres à un scénario (« scenario:0 ») ou à un acteur (« actor:MT ») : ils l'emportent sur les textes communs de la page. */
export type EntityText = Partial<Pick<WidgetConfig, 'title' | 'subtitle' | 'note' | 'text' | 'headline'>>

export interface WidgetConfig {
  id: string
  kind: WidgetKind
  tier: Tier
  visible: boolean
  title?: string
  subtitle?: string
  note?: string
  text?: string
  datasetId?: string
  chartType?: ChartType
  legend?: boolean
  decimals?: number
  /** bornes de l'axe des valeurs (unité affichée) ; vide = automatique */
  axisMin?: number
  axisMax?: number
  /** textes propres à chaque scénario / acteur */
  entityText?: Record<string, EntityText>
  /** réglages propres à chaque lecture : ils l'emportent sur les réglages ci-dessus */
  lensOverrides?: Partial<Record<Lens, LensOverride>>
  series?: Record<string, SeriesStyle>
  seriesOrder?: string[]
  bg?: string
  fg?: string
  /** section repliable : détail ou méthodologie */
  collapse?: 'detail' | 'method'
  /** message clé : textes personnalisés (jetons {central}, {bas}… ; **gras**) ; vide = texte généré */
  headline?: { kicker?: string; title?: string; bullets?: string; hideTitle?: boolean; hideBullets?: boolean }
  /** drivers : montrer les trois scénarios */
  showAllScenarios?: boolean
  /** drivers : les trois scénarios ensemble ou trois curseurs séparés */
  hypMode?: HypMode
  /** graphique : afficher la valeur initiale (2026) : étiquette au départ d'une courbe, repère 2026 sur les barres, barre 2026 d'un empilement */
  showInitial?: boolean
}

export interface ActorPrefsConfig { order: string[] | null; hidden: string[] }

export interface PageConfig { widgets: WidgetConfig[]; layout: Layout[] }

export interface DashboardConfig {
  version: 4
  /** nom court affiché dans la barre de navigation */
  brand: string
  footnote: string
  theme: { preset: PresetId; tokens: Partial<Tokens>; metrics: Metrics; /** taille et gras par catégorie de texte */ typo: Typography }
  format: FormatSettings
  /** libellés personnalisés : kpi:<id>, hyp:<id>, block:<id>, scenario:<i>, series:<id>, bridge:<id>… */
  labels: Record<string, string>
  kpis: { order: string[]; visible: string[] }
  /** indicateurs de la page acteur : même principe que `kpis` (le filtre par lecture est appliqué à l'affichage) */
  actorKpis: { order: string[]; visible: string[] }
  /** ordre et visibilité des acteurs (graphiques et menu) */
  actors: ActorPrefsConfig
  /** hypothèses affichées par bandeau : « need », « addressable », « actor:<id> » (seuls les bandeaux modifiés sont stockés ; les autres suivent le défaut) */
  hyps: { sets: Record<string, string[]>; notes: Record<string, string> }
  /** unités saisies à la main dans les cellules de chiffres (clé = cellule) ; chaîne vide = unité supprimée */
  units: Record<string, string>
  /** une configuration par type de page : Globale, Scénario (Bas/Central/Haut), Acteur (les 8 acteurs) */
  pages: Record<PageKind, PageConfig>
}
