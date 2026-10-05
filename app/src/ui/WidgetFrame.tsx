import { memo, useDeferredValue, type ReactNode } from 'react'
import { DATASET_BY_ID, CHART_LABELS, compatibleCharts, type ChartType } from '../core/datasets'
import type { WidgetConfig } from '../config/types'
import { entityKey, resolveEntityText, resolveWidget } from '../config/resolve'
import { patchUI, toggleExpanded, updateWidget, updateWidgetLens, useUI } from '../state/store'
import { AssumptionsTable } from './AssumptionsTable'
import { ChartView } from './ChartView'
import { DriversWidget } from './DriversWidget'
import { ActorKpis, ActorNote, Headline, ScenarioCards } from './PageWidgets'
import { KpiStrip } from './KpiStrip'
import { ModelInfo } from './ModelInfo'
import { TextWidget } from './TextWidget'
import { fillUnit } from '../core/titles'
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
  const ds = useDataset(wc.datasetId, env, wc.showInitial)
  const def = wc.datasetId ? DATASET_BY_ID[wc.datasetId] : undefined
  if (!ds || !def) return <p className="empty small">Jeu de données inconnu.</p>
  const ok = compatibleCharts(ds)
  const eff = resolveWidget(wc, env.snap.lens)
  const type = eff.chartType && ok.includes(eff.chartType) ? eff.chartType : def.defaultChart
  return <ChartView wc={eff} ds={ds} type={type} env={env} />
}

function ChartTypeSelect({ wc, env }: { wc: WidgetConfig; env: Env }) {
  const ds = useDataset(wc.datasetId, env)
  const def = wc.datasetId ? DATASET_BY_ID[wc.datasetId] : undefined
  if (!ds || !def) return null
  const ok = compatibleCharts(ds)
  const cur = resolveWidget(wc, env.snap.lens).chartType
  const shown = cur && ok.includes(cur) ? cur : def.defaultChart
  return (
    <select className="type-select" value={shown} aria-label="Type de graphique" onChange={(e) => updateWidgetLens(wc.id, env.snap.lens, { chartType: e.target.value as ChartType })}>
      {ok.map((t) => <option key={t} value={t}>{CHART_LABELS[t]}</option>)}
    </select>
  )
}

function Body({ wc, env }: { wc: WidgetConfig; env: Env }): ReactNode {
  switch (wc.kind) {
    case 'headline': return <Headline env={env} wc={wc} />
    case 'kpis': return <KpiStrip env={env} />
    case 'scenarioCards': return <ScenarioCards env={env} />
    case 'actorKpis': return <ActorKpis env={env} />
    case 'actorNote': return <ActorNote env={env} />
    case 'modelInfo': return <ModelInfo env={env} />
    case 'drivers': return <DriversWidget wc={wc} env={env} />
    case 'assumptionsTable': return <AssumptionsTable env={env} />
    case 'text': return <TextWidget text={wc.text ?? ''} />
    case 'chart': return <ChartWidget wc={wc} env={env} />
    default: return null
  }
}

function SectionHeader({ wc, expanded, unit }: { wc: WidgetConfig; expanded: boolean; unit: string }) {
  return (
    <div className="section">
      <div>
        <h3>{fillUnit(widgetTitle(wc), unit)}</h3>
        {widgetSubtitle(wc) && <p>{fillUnit(widgetSubtitle(wc), unit)}</p>}
      </div>
      {wc.collapse && (
        <button className="section-toggle" aria-expanded={expanded} onClick={() => toggleExpanded(wc.collapse!)}>
          {expanded ? 'Masquer' : 'Afficher'} <span className="chev">{expanded ? '▴' : '▾'}</span>
        </button>
      )}
    </div>
  )
}

function WidgetFrameBase({ wc: wcRaw, env }: { wc: WidgetConfig; env: Env }) {
  // textes propres au scénario / à l'acteur affiché (sinon textes communs de la page)
  const wc = resolveEntityText(wcRaw, entityKey(env.route))
  // légende « [unité ; date] » : {unité} suit l'unité du graphique (ou MW IT pour les autres blocs)
  const dsForUnit = useDataset(wc.datasetId, env)
  const unit = env.unit(dsForUnit?.format ?? 'power')
  const ui = useUI()
  const edit = ui.editLayout
  const selected = edit && ui.selectedWidget === wc.id
  const bare = BARE.has(wc.kind)
  const style = { background: wc.bg, color: wc.fg } as React.CSSProperties
  const consultant = ui.mode === 'consultant'
  /** vue consultant : crayon discret pour modifier les textes du bloc sans passer par la mise en page */
  const textEdit = consultant && !edit && (
    <button className="wedit" title="Modifier les textes de ce bloc" aria-label="Modifier les textes de ce bloc" onClick={() => patchUI({ selectedWidget: wc.id, panel: 'widget' })}>✎</button>
  )
  const tools = edit && (
    <span className="wtools" onMouseDown={(e) => e.stopPropagation()}>
      <button title="Réglages du bloc" onClick={() => patchUI({ selectedWidget: wc.id, panel: 'widget' })}>⚙</button>
      <button title="Masquer ce bloc" onClick={() => updateWidget(wc.id, { visible: false })}>✕</button>
    </span>
  )

  if (wc.kind === 'section') {
    return (
      <div className={'wframe section-frame' + (selected ? ' selected' : '')} data-widget={wc.id} style={style} onMouseDown={() => edit && patchUI({ selectedWidget: wc.id })}>
        {edit && <span className="grip drag-handle" title="Déplacer">⠿</span>}
        <SectionHeader wc={wc} expanded={wc.collapse ? ui.expanded[wc.collapse] : true} unit={unit} />
        {tools}{textEdit}
      </div>
    )
  }
  if (bare) {
    return (
      <div className={'wframe bare' + (selected ? ' selected' : '')} data-widget={wc.id} style={style} onMouseDown={() => edit && patchUI({ selectedWidget: wc.id })}>
        {edit && <span className="grip drag-handle" title="Déplacer">⠿</span>}
        <Body wc={wc} env={env} />
        {tools}{textEdit}
      </div>
    )
  }
  const title = fillUnit(widgetTitle(wc), unit)
  const sub = fillUnit(widgetSubtitle(wc), unit)
  return (
    <div className={'wframe card' + (selected ? ' selected' : '')} data-widget={wc.id} style={style} onMouseDown={() => edit && patchUI({ selectedWidget: wc.id })}>
      <div className={'card-head' + (edit ? ' drag-handle' : '')}>
        <div className="card-titles">
          {title && <h4>{title}</h4>}
          {sub && <p>{sub}</p>}
        </div>
        <div className="card-tools" onMouseDown={(e) => e.stopPropagation()}>
          {textEdit}
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
