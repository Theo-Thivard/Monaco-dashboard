import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import type { WidgetConfig } from '../config/types'
import type { ChartType, Dataset } from '../core/datasets'
import { buildOption } from './chartOptions'
import { prepareDataset } from './prepare'
import { DataTable } from './DataTable'
import type { Env } from './env'

echarts.use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TitleComponent, TooltipComponent, CanvasRenderer])

function EChart({ option, fixed }: { option: EChartsCoreOption; fixed: string }) {
  const el = useRef<HTMLDivElement>(null)
  const chart = useRef<echarts.ECharts | null>(null)
  useEffect(() => {
    if (!el.current) return
    const c = echarts.init(el.current, undefined, { renderer: 'canvas' })
    chart.current = c
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(el.current)
    return () => { ro.disconnect(); c.dispose(); chart.current = null }
    // `fixed` : remonter le graphique à chaque changement de type
  }, [fixed])
  useEffect(() => {
    chart.current?.setOption(option, { replaceMerge: ['series', 'xAxis', 'yAxis', 'legend', 'title'] })
  }, [option, fixed])
  return <div ref={el} className="echart" />
}

interface Props { wc: WidgetConfig; ds: Dataset; type: ChartType; env: Env }

/** Graphique OU tableau, à partir du même jeu de données préparé. */
export function ChartView({ wc, ds, type, env }: Props) {
  const prepared = useMemo(() => prepareDataset(ds, wc, env.tokens), [ds, wc.series, wc.seriesOrder, env.tokens])
  const option = useMemo(
    () => (type === 'table' || ds.empty ? {} : buildOption(prepared, type, {
      tokens: env.tokens, fmt: env.fmt, unit: env.unit, powerUnit: env.f.powerUnit, legend: wc.legend ?? true, decimals: wc.decimals,
    })),
    [prepared, type, env, wc.legend, wc.decimals],
  )
  if (ds.empty) return <div className="empty">{ds.empty}</div>
  if (type === 'table') return <DataTable prepared={prepared} env={env} decimals={wc.decimals} />
  return (
    <>
      <EChart option={option} fixed={`${type}`} />
      {ds.truncateAxis && type === 'waterfall' && <span className="axis-note">Axe tronqué pour la lisibilité</span>}
    </>
  )
}
