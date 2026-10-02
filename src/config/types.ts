import type { Layout } from 'react-grid-layout'
import type { ChartType } from '../core/datasets'
import type { FormatSettings } from '../core/format'
import type { PageKind } from '../state/route'
import type { Metrics, PresetId, Tokens } from './theme'

export type WidgetKind = 'section' | 'headline' | 'kpis' | 'scenarioCards' | 'actorKpis' | 'drivers' | 'chart' | 'assumptionsTable' | 'text' | 'actorNote' | 'modelInfo'
/** client = vue par défaut ; detail / method = repliés derrière leur section */
export type Tier = 'client' | 'detail' | 'method'

export interface SeriesStyle { name?: string; color?: string; hidden?: boolean }

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
  series?: Record<string, SeriesStyle>
  seriesOrder?: string[]
  bg?: string
  fg?: string
  /** section repliable : détail ou méthodologie */
  collapse?: 'detail' | 'method'
  /** drivers : montrer les trois scénarios */
  showAllScenarios?: boolean
  /** drivers : hypothèses choisies par l'utilisateur (défaut) ou hypothèses de l'acteur affiché */
  hypSource?: 'visible' | 'actor'
}

export interface ActorPrefsConfig { order: string[] | null; hidden: string[] }

export interface PageConfig { widgets: WidgetConfig[]; layout: Layout[] }

export interface DashboardConfig {
  version: 4
  /** nom court affiché dans la barre de navigation */
  brand: string
  footnote: string
  theme: { preset: PresetId; tokens: Partial<Tokens>; metrics: Metrics }
  format: FormatSettings
  /** libellés personnalisés : kpi:<id>, hyp:<id>, block:<id>, scenario:<i>, series:<id>, bridge:<id>… */
  labels: Record<string, string>
  kpis: { order: string[]; visible: string[] }
  /** ordre et visibilité des acteurs (graphiques et menu) */
  actors: ActorPrefsConfig
  hyps: { visible: string[]; notes: Record<string, string> }
  /** une configuration par type de page : Globale, Scénario (Bas/Central/Haut), Acteur (les 8 acteurs) */
  pages: Record<PageKind, PageConfig>
}
