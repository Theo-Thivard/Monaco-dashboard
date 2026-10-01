import type { EChartsCoreOption } from 'echarts/core'
import { groupBlocks, HORIZON, SCENARIOS, tornado, type Options, type Params, type ScenarioResult } from '../model'

export interface ChartCtx {
  results: ScenarioResult[]
  trajectory: ScenarioResult[][]
  params: Params
  options: Options
  scen: number
  scenColors: string[]
  blockColors: string[]
  fg: string
  muted: string
  line: string
  legend: boolean
}

const mw = (kw: number) => kw / 1000
const f2 = (v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const years = Array.from({ length: HORIZON + 1 }, (_, i) => String(2026 + i))

function base(c: ChartCtx, extra: EChartsCoreOption = {}): EChartsCoreOption {
  return {
    animationDuration: 250,
    animationDurationUpdate: 200,
    textStyle: { color: c.fg },
    color: c.scenColors,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => f2(v) + ' MW', confine: true },
    legend: c.legend ? { top: 0, textStyle: { color: c.fg }, type: 'scroll' } : { show: false },
    grid: { left: 8, right: 16, top: c.legend ? 36 : 16, bottom: 8, containLabel: true },
    ...extra,
  }
}

const valueAxis = (c: ChartCtx, name = 'MW IT') => ({
  type: 'value' as const, name, nameTextStyle: { color: c.muted },
  axisLabel: { color: c.muted }, splitLine: { lineStyle: { color: c.line } },
})
const catAxis = (c: ChartCtx, data: string[], extra = {}) => ({
  type: 'category' as const, data, axisLabel: { color: c.muted, interval: 0 }, axisLine: { lineStyle: { color: c.line } }, ...extra,
})

export function compare(c: ChartCtx): EChartsCoreOption {
  const cats = SCENARIOS.map((s) => s)
  return base(c, {
    xAxis: catAxis(c, [...cats]),
    yAxis: valueAxis(c),
    series: [
      { name: 'Besoin 2026', type: 'bar', data: c.results.map((r) => mw(r.base)), itemStyle: { color: c.muted } },
      { name: 'Besoin total 2035', type: 'bar', data: c.results.map((r) => mw(r.total)), itemStyle: { color: c.blockColors[0] } },
      { name: 'Demande adressable 2035', type: 'bar', data: c.results.map((r) => mw(r.addressable)), itemStyle: { color: c.blockColors[2] },
        label: { show: true, position: 'top', color: c.fg, formatter: (p: { value: number }) => f2(p.value) } },
    ],
  })
}

export function trajectory(c: ChartCtx): EChartsCoreOption {
  return base(c, {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => f2(v) + ' MW', confine: true },
    xAxis: catAxis(c, years, { boundaryGap: false }),
    yAxis: valueAxis(c),
    series: [
      ...SCENARIOS.map((s, i) => ({
        name: `Adressable – ${s}`, type: 'line' as const, smooth: true, showSymbol: false, lineStyle: { width: 3 },
        itemStyle: { color: c.scenColors[i] }, data: c.trajectory[i].map((r) => mw(r.addressable)),
      })),
      ...SCENARIOS.map((s, i) => ({
        name: `Besoin total – ${s}`, type: 'line' as const, smooth: true, showSymbol: false, lineStyle: { width: 1.5, type: 'dashed' as const },
        itemStyle: { color: c.scenColors[i] }, data: c.trajectory[i].map((r) => mw(r.total)),
      })),
    ],
  })
}

export function stacked(c: ChartCtx): EChartsCoreOption {
  const g = c.results.map(groupBlocks)
  return base(c, {
    xAxis: catAxis(c, [...SCENARIOS]),
    yAxis: valueAxis(c),
    series: g[0].map((blk, i) => ({
      name: blk.label, type: 'bar', stack: 'adr', itemStyle: { color: c.blockColors[i] },
      data: g.map((gs) => mw(gs[i].addressable)),
    })),
  })
}

export function waterfall(c: ChartCtx): EChartsCoreOption {
  const r = c.results[c.scen]
  const act = r.blocks.reduce((a, b) => a + (b.needAct - b.base), 0)
  const intens = r.blocks.reduce((a, b) => a + (b.need - b.needAct), 0)
  const steps: { name: string; delta?: number; total?: number }[] = [
    { name: 'Besoin 2026', total: r.base },
    { name: 'Effectifs / activité / métier', delta: act },
    { name: 'Intensité numérique', delta: intens },
    { name: 'Surcouche IA', delta: r.ia },
    { name: 'Besoin total 2035', total: r.total },
    { name: 'Non adressable', delta: r.addressable - r.total },
    { name: 'Demande adressable', total: r.addressable },
  ]
  let run = 0
  const low: number[] = []
  const val: { value: number; itemStyle: { color: string } }[] = []
  const labels: string[] = []
  for (const s of steps) {
    if (s.total !== undefined) {
      run = s.total
      low.push(0)
      val.push({ value: mw(s.total), itemStyle: { color: s.name === 'Demande adressable' ? c.blockColors[2] : c.blockColors[0] } })
      labels.push(f2(mw(s.total)))
    } else {
      const d = s.delta!
      const next = run + d
      low.push(mw(Math.min(run, next)))
      val.push({ value: mw(Math.abs(d)), itemStyle: { color: d >= 0 ? c.blockColors[3] : c.blockColors[4] } })
      labels.push((d >= 0 ? '+' : '−') + f2(mw(Math.abs(d))))
      run = next
    }
  }
  return base(c, {
    legend: { show: false },
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true, formatter: (p: { dataIndex: number }[]) => `${steps[p[0].dataIndex].name}<br/><b>${labels[p[0].dataIndex]} MW</b>` },
    xAxis: catAxis(c, steps.map((s) => s.name), { axisLabel: { color: c.muted, interval: 0, width: 80, overflow: 'break' } }),
    yAxis: valueAxis(c),
    series: [
      { type: 'bar', stack: 'w', silent: true, itemStyle: { color: 'transparent' }, data: low },
      { name: `Scénario ${SCENARIOS[c.scen]}`, type: 'bar', stack: 'w', data: val,
        label: { show: true, position: 'top', color: c.fg, formatter: (p: { dataIndex: number }) => labels[p.dataIndex] } },
    ],
  })
}

export function tornadoOpt(c: ChartCtx): EChartsCoreOption {
  const { rows } = tornado(c.params, c.scen, c.options)
  const top = rows.slice(0, 12).reverse() // la plus influente en haut
  return base(c, {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true,
      formatter: (p: { dataIndex: number }[]) => {
        const r = top[p[0].dataIndex]
        return `${r.label}<br/>Valeur basse : <b>${f2(mw(r.low))} MW</b><br/>Valeur haute : <b>${f2(mw(r.high))} MW</b>`
      } },
    grid: { left: 8, right: 24, top: c.legend ? 36 : 12, bottom: 8, containLabel: true },
    xAxis: { ...valueAxis(c, ''), axisLabel: { color: c.muted, formatter: (v: number) => (v > 0 ? '+' : '') + v } },
    yAxis: { type: 'category', data: top.map((r) => r.label), axisLabel: { color: c.muted, width: 190, overflow: 'truncate', fontSize: 11 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [
      { name: 'Valeur basse (Bas / −20 %)', type: 'bar', stack: 't', itemStyle: { color: c.scenColors[0] }, data: top.map((r) => mw(r.low)) },
      { name: 'Valeur haute (Haut / +20 %)', type: 'bar', stack: 't', itemStyle: { color: c.scenColors[2] }, data: top.map((r) => mw(r.high)) },
    ],
  })
}

export function donut(c: ChartCtx): EChartsCoreOption {
  const g = groupBlocks(c.results[c.scen])
  return base(c, {
    tooltip: { trigger: 'item', valueFormatter: (v: number) => f2(v) + ' MW', confine: true },
    legend: c.legend ? { bottom: 0, textStyle: { color: c.fg }, type: 'scroll' } : { show: false },
    series: [{
      name: `Adressable ${SCENARIOS[c.scen]}`, type: 'pie', radius: ['45%', '70%'], center: ['50%', c.legend ? '45%' : '50%'],
      itemStyle: { borderColor: 'transparent', borderWidth: 2 },
      label: { color: c.fg, formatter: '{b}\n{d} %' },
      data: g.map((b, i) => ({ name: b.label, value: mw(b.addressable), itemStyle: { color: c.blockColors[i] } })),
    }],
  })
}

export function blockBase(c: ChartCtx): EChartsCoreOption {
  const g = groupBlocks(c.results[c.scen])
  return base(c, {
    xAxis: catAxis(c, g.map((b) => b.label), { axisLabel: { color: c.muted, interval: 0, width: 70, overflow: 'break', fontSize: 11 } }),
    yAxis: valueAxis(c),
    series: [
      { name: 'Besoin 2026', type: 'bar', itemStyle: { color: c.muted }, data: g.map((b) => mw(b.base)) },
      { name: 'Besoin total 2035', type: 'bar', itemStyle: { color: c.blockColors[0] }, data: g.map((b) => mw(b.total)) },
      { name: 'Demande adressable 2035', type: 'bar', itemStyle: { color: c.blockColors[2] }, data: g.map((b) => mw(b.addressable)) },
    ],
  })
}

export function rate(c: ChartCtx): EChartsCoreOption {
  const g = groupBlocks(c.results[c.scen])
  const r = c.results[c.scen]
  return base(c, {
    legend: { show: false },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => v.toFixed(1) + ' %', confine: true },
    xAxis: catAxis(c, g.map((b) => b.label), { axisLabel: { color: c.muted, interval: 0, width: 70, overflow: 'break', fontSize: 11 } }),
    yAxis: { ...valueAxis(c, '%'), max: 100 },
    series: [{
      name: 'Taux adressable', type: 'bar', data: g.map((b, i) => ({ value: b.total ? (100 * b.addressable) / b.total : 0, itemStyle: { color: c.blockColors[i] } })),
      label: { show: true, position: 'top', color: c.fg, formatter: (p: { value: number }) => p.value.toFixed(0) + ' %' },
      markLine: { symbol: 'none', silent: true, lineStyle: { color: c.fg, type: 'dashed' }, label: { color: c.fg, formatter: 'Moyenne {c} %' }, data: [{ yAxis: +(r.rate * 100).toFixed(1) }] },
    }],
  })
}

export function socleIA(c: ChartCtx): EChartsCoreOption {
  const socle = c.results.map((r) => r.blocks.reduce((a, b) => a + b.need * b.adrShare, 0))
  const ia = c.results.map((r) => r.blocks.reduce((a, b) => a + b.ia * b.adrIaShare, 0))
  return base(c, {
    xAxis: catAxis(c, [...SCENARIOS]),
    yAxis: valueAxis(c),
    series: [
      { name: 'Socle hors IA', type: 'bar', stack: 's', itemStyle: { color: c.blockColors[0] }, data: socle.map(mw) },
      { name: 'Surcouche IA', type: 'bar', stack: 's', itemStyle: { color: c.blockColors[1] }, data: ia.map(mw) },
    ],
  })
}

export function areaBlocks(c: ChartCtx): EChartsCoreOption {
  const traj = c.trajectory[c.scen].map(groupBlocks)
  return base(c, {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => f2(v) + ' MW', confine: true },
    xAxis: catAxis(c, years, { boundaryGap: false }),
    yAxis: valueAxis(c),
    series: traj[0].map((blk, i) => ({
      name: blk.label, type: 'line', stack: 'a', smooth: true, showSymbol: false, areaStyle: { opacity: 0.85 },
      lineStyle: { width: 1 }, itemStyle: { color: c.blockColors[i] }, data: traj.map((t) => mw(t[i].addressable)),
    })),
  })
}
