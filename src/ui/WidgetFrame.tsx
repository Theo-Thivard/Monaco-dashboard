import { memo, useDeferredValue, type ReactNode } from 'react'
import { DATASET_BY_ID, CHART_LABELS, compatibleCharts, type ChartType } from '../core/datasets'
import type { WidgetConfig } from '../config/types'
import { patchUI, toggleExpanded, updateWidget, useUI } from '../state/store'
import { AssumptionsTable } from './AssumptionsTable'
import { ChartView } from './ChartView'
import { DriversWidget } from './DriversWidget'
import { ActorKpis, ActorNote, Headline, ScenarioCards } from './PageWidgets'
import { KpiStrip } from './KpiStrip'
import { TextWidget } from './TextWidget'
import { useDataset, type Env } from './env'

const BARE = new Set(['headline', 'kpis', 'scenarioCards', 'actorKpis', 'section'])

export function widgetTitle(wc: WidgetConfig): string {
  if (wc.title !== undefined) return wc.title
  if (wc.kind === 'chart' && wc.datasetId) return DATASET_BY_ID[wc.datasetId]?.title ?? ''
  return ''
}
export function widgetSubtitle(wc: WidgetConfig): string {
  if (wc.subtitle !== undefined) return wc.subtitle
  if (wc.kind === 'chart' && wc.datasetId) return DATASET_BY_ID[wc.datasetId]?.subtitle ?? ''
  return ''
}

function ChartWidget({ wc, env: liveEnv }: { wc: WidgetConfig; env: Env }) {
  // les graphiques se redessinent après les contrôles : le curseur reste fluide pendant le glissement
  const env = useDeferredValue(liveEnv)
  const ds = useDataset(wc.datasetId, env)
  const def = wc.datasetId ? DATASET_BY_ID[wc.datasetId] : undefined
  if (!ds || !def) return <p className="empty small">Jeu de données inconnu.</p>
  const ok = compatibleCharts(ds)
  const type = wc.chartType && ok.includes(wc.chartType) ? wc.chartType : def.defaultChart
  return <ChartView wc={wc} ds={ds} type={type} env={env} />
}

function ChartTypeSelect({ wc, env }: { wc: WidgetConfig; env: Env }) {
  const ds = useDataset(wc.datasetId, env)
  const def = wc.datasetId ? DATASET_BY_ID[wc.datasetId] : undefined
  if (!ds || !def) return null
  const ok = compatibleCharts(ds)
  const cur = wc.chartType && ok.includes(wc.chartType) ? wc.chartType : def.defaultChart
  return (
    <select className="type-select" value={cur} aria-label="Type de graphique" onChange={(e) => updateWidget(wc.id, { chartType: e.target.value as ChartType })}>
      {ok.map((t) => <option key={t} value={t}>{CHART_LABELS[t]}</option>)}
    </select>
  )
}

function Body({ wc, env }: { wc: WidgetConfig; env: Env }): ReactNode {
  switch (wc.kind) {
    case 'headline': return <Headline env={env} />
    case 'kpis': return <KpiStrip env={env} />
    case 'scenarioCards': return <ScenarioCards env={env} />
    case 'actorKpis': return <ActorKpis env={env} />
    case 'actorNote': return <ActorNote env={env} />
    case 'drivers': return <DriversWidget wc={wc} env={env} />
    case 'assumptionsTable': return <AssumptionsTable env={env} />
    case 'text': return <TextWidget text={wc.text ?? ''} />
    case 'chart': return <ChartWidget wc={wc} env={env} />
    default: return null
  }
}

function SectionHeader({ wc, expanded }: { wc: WidgetConfig; expanded: boolean }) {
  return (
    <div className="section">
      <div>
        <h3>{widgetTitle(wc)}</h3>
        {widgetSubtitle(wc) && <p>{widgetSubtitle(wc)}</p>}
      </div>
      {wc.collapse && (
        <button className="section-toggle" aria-expanded={expanded} onClick={() => toggleExpanded(wc.collapse!)}>
          {expanded ? 'Masquer' : 'Afficher'} <span className="chev">{expanded ? '▴' : '▾'}</span>
        </button>
      )}
    </div>
  )
}

function WidgetFrameBase({ wc, env }: { wc: WidgetConfig; env: Env }) {
  const ui = useUI()
  const edit = ui.editLayout
  const selected = edit && ui.selectedWidget === wc.id
  const bare = BARE.has(wc.kind)
  const style = { background: wc.bg, color: wc.fg } as React.CSSProperties
  const tools = edit && (
    <span className="wtools" onMouseDown={(e) => e.stopPropagation()}>
      <button title="Réglages du widget" onClick={() => patchUI({ selectedWidget: wc.id, panel: 'widget' })}>⚙</button>
      <button title="Masquer ce widget" onClick={() => updateWidget(wc.id, { visible: false })}>✕</button>
    </span>
  )

  if (wc.kind === 'section') {
    return (
      <div className={'wframe section-frame' + (selected ? ' selected' : '')} data-widget={wc.id} style={style} onMouseDown={() => edit && patchUI({ selectedWidget: wc.id })}>
        {edit && <span className="grip drag-handle" title="Déplacer">⠿</span>}
        <SectionHeader wc={wc} expanded={wc.collapse ? ui.expanded[wc.collapse] : true} />
        {tools}
      </div>
    )
  }
  if (bare) {
    return (
      <div className={'wframe bare' + (selected ? ' selected' : '')} data-widget={wc.id} style={style} onMouseDown={() => edit && patchUI({ selectedWidget: wc.id })}>
        {edit && <span className="grip drag-handle" title="Déplacer">⠿</span>}
        <Body wc={wc} env={env} />
        {tools}
      </div>
    )
  }
  const title = widgetTitle(wc)
  const sub = widgetSubtitle(wc)
  return (
    <div className={'wframe card' + (selected ? ' selected' : '')} data-widget={wc.id} style={style} onMouseDown={() => edit && patchUI({ selectedWidget: wc.id })}>
      <div className={'card-head' + (edit ? ' drag-handle' : '')}>
        <div className="card-titles">
          {title && <h4>{title}</h4>}
          {sub && <p>{sub}</p>}
        </div>
        <div className="card-tools" onMouseDown={(e) => e.stopPropagation()}>
          {ui.mode === 'consultant' && wc.kind === 'chart' && !edit && <ChartTypeSelect wc={wc} env={env} />}
          {tools}
        </div>
      </div>
      <div className="card-body"><Body wc={wc} env={env} /></div>
      {wc.note && <div className="card-note">{wc.note}</div>}
    </div>
  )
}

export const WidgetFrame = memo(WidgetFrameBase)
