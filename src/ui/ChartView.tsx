import { useEffect, useMemo, useRef, useState } from 'react'
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

function EChart({ option, fixed, onWidth }: { option: EChartsCoreOption; fixed: string; onWidth: (w: number) => void }) {
  const el = useRef<HTMLDivElement>(null)
  const chart = useRef<echarts.ECharts | null>(null)
  useEffect(() => {
    if (!el.current) return
    const c = echarts.init(el.current, undefined, { renderer: 'canvas' })
    chart.current = c
    const ro = new ResizeObserver(() => { c.resize(); if (el.current) onWidth(el.current.clientWidth) })
    ro.observe(el.current)
    return () => { ro.disconnect(); c.dispose(); chart.current = null }
    // `fixed` : remonter le graphique à chaque changement de type
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixed])
  // Les graphiques hors écran ne sont pas redessinés : ils se mettent à jour dès qu'ils redeviennent visibles.
  const visible = useRef(true)
  const latest = useRef(option)
  const dirty = useRef(false)
  const apply = () => { chart.current?.setOption(latest.current, { replaceMerge: ['series', 'xAxis', 'yAxis', 'legend', 'title'] }); dirty.current = false }
  useEffect(() => {
    if (!el.current || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; if (e.isIntersecting && dirty.current) apply() }, { rootMargin: '200px' })
    io.observe(el.current)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixed])
  useEffect(() => {
    latest.current = option
    if (visible.current || !chart.current?.getOption()) apply()
    else dirty.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option, fixed])
  return <div ref={el} className="echart" />
}

interface Props { wc: WidgetConfig; ds: Dataset; type: ChartType; env: Env }

/** Graphique OU tableau, à partir du même jeu de données préparé. */
export function ChartView({ wc, ds, type, env }: Props) {
  const prepared = useMemo(() => prepareDataset(ds, wc, env.tokens), [ds, wc.series, wc.seriesOrder, env.tokens])
  const [width, setWidth] = useState(600)
  const option = useMemo(
    () => (type === 'table' || ds.empty ? {} : buildOption(prepared, type, {
      tokens: env.tokens, fmt: env.fmt, unit: env.unit, powerUnit: env.f.powerUnit, legend: wc.legend ?? true, decimals: wc.decimals, width,
    })),
    [prepared, type, env, wc.legend, wc.decimals, width],
  )
  if (ds.empty) return <div className="empty">{ds.empty}</div>
  if (type === 'table') return <DataTable prepared={prepared} env={env} decimals={wc.decimals} />
  return (
    <>
      <EChart option={option} fixed={`${type}`} onWidth={(w) => setWidth((o) => (Math.abs(o - w) > 8 ? w : o))} />
      {ds.truncateAxis && type === 'waterfall' && ((option as { yAxis?: { min?: number } }).yAxis?.min ?? 0) > 0 && <span className="axis-note">Axe tronqué pour la lisibilité</span>}
    </>
  )
}
