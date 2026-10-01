import type { ReactNode } from 'react'
import { useMemo } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { useStore, type WidgetCfg } from '../store'
import { Chart } from './Chart'
import { Sliders } from './Sliders'
import { Kpi } from './Kpi'
import { DataTable } from './Table'
import * as O from './options'

const CHARTS: Record<string, (c: O.ChartCtx) => EChartsCoreOption> = {
  compare: O.compare, trajectory: O.trajectory, stacked: O.stacked, waterfall: O.waterfall,
  tornado: O.tornadoOpt, donut: O.donut, blockBase: O.blockBase, rate: O.rate, socleIA: O.socleIA, areaBlocks: O.areaBlocks,
}

export function themeColors(mode: 'dark' | 'light') {
  return mode === 'dark'
    ? { fg: '#e6e9ef', muted: '#9aa5b8', line: 'rgba(255,255,255,0.09)' }
    : { fg: '#1d2433', muted: '#5b6678', line: 'rgba(0,0,0,0.09)' }
}

function HypsWidget() {
  const { shownHyps } = useStore()
  return <Sliders ids={shownHyps} />
}

function ChartWidget({ cfg, fg }: { cfg: WidgetCfg; fg: string }) {
  const { results, trajectory, params, options, theme, activeScenario } = useStore()
  const tc = themeColors(theme.mode)
  const scen = cfg.scenario === 'global' ? activeScenario : cfg.scenario
  const option = useMemo(
    () => CHARTS[cfg.type]({
      results, trajectory, params, options, scen, scenColors: theme.scenarioColors, blockColors: theme.blockColors,
      fg, muted: cfg.fg ? fg : tc.muted, line: tc.line, legend: cfg.legend,
    }),
    [cfg.type, cfg.legend, cfg.fg, results, trajectory, params, options, scen, theme, fg, tc.muted, tc.line],
  )
  return <Chart option={option} />
}

export function WidgetBody({ cfg, fg }: { cfg: WidgetCfg; fg: string }): ReactNode {
  switch (cfg.type) {
    case 'sliders': return <Sliders group={cfg.group!} />
    case 'hyps': return <HypsWidget />
    case 'kpi': return <Kpi />
    case 'table': return <DataTable />
    default: return CHARTS[cfg.type] ? <ChartWidget cfg={cfg} fg={fg} /> : null
  }
}
