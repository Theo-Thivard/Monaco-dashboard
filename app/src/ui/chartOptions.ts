// Construction des options ECharts à partir d'un jeu de données préparé.
// Toutes les valeurs affichées (axes, étiquettes, infobulles) passent par le
// formateur central `fmt` ; ECharts ne calcule ni pourcentage ni total.

import type { EChartsCoreOption } from 'echarts/core'
import { OUTPUT_GROUPS } from '../core/engine'
import type { ChartType, Dataset } from '../core/datasets'
import type { FormatKind } from '../core/hypotheses'
import type { FmtOptions } from '../core/format'
import { palette, type Tokens } from '../config/theme'
import type { ChartTypo } from '../config/typography'
import type { PreparedDataset } from './prepare'

export interface ChartEnv {
  tokens: Tokens
  /** formateur central (déjà lié aux réglages d'affichage) */
  fmt: (kind: FormatKind, v: number, o?: FmtOptions) => string
  powerUnit: 'MW' | 'kW'
  /** libellé d'unité d'un format (p. ex. « MW IT ») */
  unit: (kind: FormatKind) => string
  legend: boolean
  decimals?: number
  /** largeur du conteneur en px (adaptation des libellés) */
  width: number
  /** bornes de l'axe des valeurs, dans l'unité affichée (MW, %…) ; vide = automatique */
  axisMin?: number
  axisMax?: number
  /** noms de séries de la légende (pour réserver assez de place si elle passe sur plusieurs lignes) */
  legendNames?: string[]
  /** typographie : zoom et gras des légendes / axes (labels) et des valeurs (figures) ; défaut ×1, normal */
  typo?: ChartTypo
}

const ty = (env: ChartEnv): ChartTypo => env.typo ?? { labels: 1, figures: 1, labelsBold: false, figuresBold: false }
/** taille de police en px d'un texte de graphique : base × zoom de sa catégorie */
const fs = (env: ChartEnv, cat: 'labels' | 'figures', base: number) => Math.round(base * ty(env)[cat] * 10) / 10
const fw = (env: ChartEnv, cat: 'labels' | 'figures', normal: 'normal' | 600 = 'normal') => (ty(env)[cat === 'labels' ? 'labelsBold' : 'figuresBold'] ? 'bold' : normal)

/** Nombre de lignes occupées par la légende (estimation d'après la largeur du graphique). */
function legendRows(env: ChartEnv): number {
  if (!env.legend || !env.legendNames?.length) return 1
  const itemW = env.legendNames.reduce((a, n) => a + 10 + 6 + n.length * 6.6 * ty(env).labels + 16, 0)
  return Math.max(1, Math.ceil(itemW / Math.max(80, env.width - 24)))
}
/** Marge haute de la grille : la légende (sur une ou plusieurs lignes) ne recouvre jamais le graphique. */
const gridTop = (env: ChartEnv, noLegend = 14) => (env.legend ? 14 + legendRows(env) * Math.round(20 * ty(env).labels) : noLegend)

/** Valeur affichée (MW, %…) → valeur brute du jeu de données (kW, fraction…). */
function fromDisplay(kind: FormatKind, v: number, powerUnit: 'MW' | 'kW'): number {
  if (kind === 'power') return powerUnit === 'MW' ? v * 1000 : v
  if (kind === 'pct' || kind === 'pts') return v / 100
  return v
}

const FONT = 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif'
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

type P = Record<string, unknown>

function frame(env: ChartEnv, extra: P = {}): P {
  const t = env.tokens
  return {
    animationDuration: 300,
    animationDurationUpdate: 250,
    animationEasing: 'cubicOut',
    textStyle: { fontFamily: FONT, color: t.textMuted, fontSize: fs(env, 'labels', 12) },
    grid: { left: 10, right: 18, top: gridTop(env), bottom: 4, containLabel: true },
    legend: env.legend
      ? { top: 0, left: 0, width: Math.max(80, env.width - 24), type: 'plain', icon: 'roundRect', itemWidth: fs(env, 'labels', 10), itemHeight: fs(env, 'labels', 10), itemGap: 16, textStyle: { color: t.textMuted, fontSize: fs(env, 'labels', 12), fontWeight: fw(env, 'labels'), fontFamily: FONT } }
      : { show: false },
    tooltip: {
      confine: true, backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, padding: [8, 10],
      textStyle: { color: t.text, fontSize: fs(env, 'labels', 12), fontFamily: FONT }, extraCssText: 'box-shadow:0 4px 16px rgba(0,0,0,.12);border-radius:4px;',
    },
    ...extra,
  }
}

function valueAxis(ds: Dataset, env: ChartEnv, horizontal = false, extra: P = {}): P {
  const t = env.tokens
  const power = ds.format === 'power'
  return {
    type: 'value',
    axisLabel: {
      color: t.axis, fontSize: fs(env, 'labels', 11), fontWeight: fw(env, 'labels'), hideOverlap: true,
      formatter: (v: number) => env.fmt(ds.format, v, { unit: false, decimals: power ? (env.powerUnit === 'MW' ? 1 : 0) : 0 }),
    },
    minInterval: power ? (env.powerUnit === 'MW' ? 100 : 1) : undefined,
    splitLine: { lineStyle: { color: t.grid } },
    axisLine: { show: false }, axisTick: { show: false },
    ...(horizontal ? {} : {}), ...extra,
    ...(env.axisMin !== undefined ? { min: fromDisplay(ds.format, env.axisMin, env.powerUnit) } : {}),
    ...(env.axisMax !== undefined ? { max: fromDisplay(ds.format, env.axisMax, env.powerUnit) } : {}),
  }
}

function catAxis(cats: string[], env: ChartEnv, extra: P = {}): P {
  const t = env.tokens
  return {
    type: 'category', data: cats,
    axisLabel: { color: t.textMuted, fontSize: fs(env, 'labels', 11.5), fontWeight: fw(env, 'labels'), interval: 0, hideOverlap: false, width: Math.round(120 * ty(env).labels), overflow: 'break' },
    axisLine: { lineStyle: { color: t.border } }, axisTick: { show: false }, ...extra,
  }
}

function axisTooltip(p: PreparedDataset, env: ChartEnv, showTotal: boolean) {
  const { ds } = p
  return (raw: unknown) => {
    const arr = (Array.isArray(raw) ? raw : [raw]) as { dataIndex: number; seriesName: string; seriesId: string; color: string }[]
    const i = arr[0].dataIndex
    const rows = arr.filter((a) => a.seriesName && !a.seriesName.startsWith('__'))
    const lines = rows.map((a) => {
      const s = ds.series.find((x) => x.id === a.seriesId)!
      const v = s.values[i]
      return `<div style="display:flex;justify-content:space-between;gap:18px"><span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.colors[s.id]};margin-right:6px"></span>${esc(s.name)}</span><b>${env.fmt(s.format ?? ds.format, v)}</b></div>`
    })
    if (showTotal && rows.length > 1) {
      const tot = sum(rows.map((a) => ds.series.find((x) => x.id === a.seriesId)!.values[i]))
      lines.push(`<div style="display:flex;justify-content:space-between;gap:18px;border-top:1px solid ${env.tokens.border};margin-top:4px;padding-top:4px"><span>Total</span><b>${env.fmt(ds.format, tot)}</b></div>`)
    }
    const hint = ds.hints?.[i] ? `<div style="color:${env.tokens.textMuted};margin-top:2px">${esc(ds.hints[i])}</div>` : ''
    return `<div style="font-weight:600;margin-bottom:4px">${esc(ds.categories[i])}</div>${lines.join('')}${hint}`
  }
}

// ------------------------------------------------------------------ barres
function bars(p: PreparedDataset, type: 'bar' | 'hbar' | 'stackedBar', env: ChartEnv): EChartsCoreOption {
  const { ds } = p
  const horizontal = type === 'hbar'
  const stacked = type === 'stackedBar'
  const manyLabels = !stacked && ds.categories.length * ds.series.length <= 12
  const single = ds.series.length === 1
  env = { ...env, legend: env.legend && ds.series.length > 1 }
  return {
    ...frame(env),
    tooltip: { ...(frame(env).tooltip as P), trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: env.tokens.surfaceAlt, opacity: 0.6 } }, formatter: axisTooltip(p, env, stacked) },
    xAxis: horizontal ? valueAxis(ds, env, true) : catAxis(ds.categories, env),
    yAxis: horizontal ? catAxis(ds.categories, env, { inverse: true, axisLabel: { color: env.tokens.text, fontSize: fs(env, 'labels', 12), fontWeight: fw(env, 'labels'), width: Math.round(Math.min(150, Math.max(70, env.width * 0.32)) * ty(env).labels), overflow: 'break' } }) : valueAxis(ds, env),
    series: ds.series.map((s) => ({
      id: s.id, name: s.name, type: 'bar', stack: stacked ? 'total' : undefined,
      barMaxWidth: single ? 26 : 34, barGap: '12%',
      itemStyle: { color: p.colors[s.id], borderRadius: stacked ? 0 : horizontal ? [0, 2, 2, 0] : [2, 2, 0, 0] },
      emphasis: { focus: 'series', itemStyle: { opacity: 0.92 } },
      label: manyLabels
        ? { show: true, position: horizontal ? 'right' : 'top', color: env.tokens.text, fontSize: fs(env, 'figures', 11), fontWeight: fw(env, 'figures'), fontFamily: FONT, formatter: (q: { dataIndex: number }) => env.fmt(s.format ?? ds.format, s.values[q.dataIndex], { unit: false, decimals: env.decimals }) }
        : { show: false },
      data: s.values.map((v) => v),
      seriesId: s.id,
    })),
  } as EChartsCoreOption
}

// ------------------------------------------------------------------ lignes / aires
function lines(p: PreparedDataset, type: 'line' | 'area' | 'stackedArea' | 'bar', env: ChartEnv): EChartsCoreOption {
  const { ds } = p
  const stacked = type === 'stackedArea'
  const last = ds.categories.length - 1
  return {
    ...frame(env, { grid: { left: 4, right: type === 'bar' ? 18 : 64, top: gridTop(env), bottom: 4, containLabel: true } }),
    tooltip: { ...(frame(env).tooltip as P), trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: env.tokens.axis, type: 'dashed' } }, formatter: axisTooltip(p, env, stacked) },
    xAxis: catAxis(ds.categories, env, { boundaryGap: type === 'bar', axisLabel: { color: env.tokens.textMuted, fontSize: fs(env, 'labels', 11), fontWeight: fw(env, 'labels'), interval: 'auto' } }),
    yAxis: valueAxis(ds, env),
    series: ds.series.map((s) => ({
      id: s.id, seriesId: s.id, name: s.name, type: type === 'bar' ? 'bar' : 'line',
      stack: stacked ? 'total' : undefined, smooth: false, showSymbol: false, symbolSize: 6,
      lineStyle: { width: stacked ? 1 : 2.5, color: p.colors[s.id] },
      itemStyle: { color: p.colors[s.id] },
      areaStyle: type === 'area' ? { opacity: 0.1, color: p.colors[s.id] } : stacked ? { opacity: 0.88, color: p.colors[s.id] } : undefined,
      emphasis: { focus: 'series' },
      endLabel: type !== 'bar' ? { show: true, color: p.colors[s.id], fontWeight: fw(env, 'figures', 600), fontSize: fs(env, 'figures', 11.5), formatter: () => env.fmt(s.format ?? ds.format, s.values[last], { unit: false, decimals: env.decimals }) } : undefined,
      data: s.values,
    })),
  } as EChartsCoreOption
}

// ------------------------------------------------------------------ anneau / camembert
function pie(p: PreparedDataset, type: 'donut' | 'pie', env: ChartEnv): EChartsCoreOption {
  const { ds } = p
  const s = ds.series[0]
  const pal = palette(env.tokens)
  const total = s.total ?? sum(s.values)
  const colorOf = (i: number) => {
    const id = ds.categoryIds?.[i]
    const k = id ? OUTPUT_GROUPS.findIndex((g) => g.id === id) : -1
    return pal[(k >= 0 ? k : i) % pal.length]
  }
  const share = (v: number) => (total ? v / total : 0)
  return {
    ...frame(env, { grid: undefined }),
    legend: { show: false },
    tooltip: { ...(frame(env).tooltip as P), trigger: 'item', formatter: (q: { dataIndex: number }) => `<b>${esc(ds.categories[q.dataIndex])}</b><br/>${env.fmt(ds.format, s.values[q.dataIndex])} · ${env.fmt('pct', share(s.values[q.dataIndex]))}` },
    title: type === 'donut' ? { text: env.fmt(ds.format, total, { unit: false, decimals: env.decimals }), subtext: env.unit(ds.format), left: 'center', top: '40%', textStyle: { color: env.tokens.heading, fontSize: fs(env, 'figures', 22), fontWeight: fw(env, 'figures', 600), fontFamily: FONT }, subtextStyle: { color: env.tokens.textMuted, fontSize: fs(env, 'labels', 12), fontWeight: fw(env, 'labels'), fontFamily: FONT } } : undefined,
    series: [{
      type: 'pie', radius: type === 'donut' ? ['52%', '74%'] : ['0%', '72%'], center: ['50%', '52%'], avoidLabelOverlap: true,
      itemStyle: { borderColor: env.tokens.surface, borderWidth: 2 },
      label: { color: env.tokens.text, fontSize: fs(env, 'labels', 11.5), fontWeight: fw(env, 'labels'), fontFamily: FONT, formatter: (q: { dataIndex: number }) => `${ds.categories[q.dataIndex]}\n${env.fmt('pct', share(s.values[q.dataIndex]))}` },
      labelLine: { lineStyle: { color: env.tokens.axis } },
      data: s.values.map((v, i) => ({ name: ds.categories[i], value: v, itemStyle: { color: colorOf(i) } })),
    }],
  } as EChartsCoreOption
}

// ------------------------------------------------------------------ cascade
function waterfall(p: PreparedDataset, env: ChartEnv): EChartsCoreOption {
  const { ds } = p
  const t = env.tokens
  const steps = ds.steps ?? []
  const vals = ds.series[0].values
  let run = 0
  const low: number[] = []
  const high: number[] = []
  const colors: string[] = []
  vals.forEach((v, i) => {
    if (steps[i] === 'total') {
      run = v
      low.push(0); high.push(v)
      colors.push(i === vals.length - 1 ? t.accent : t.primary)
    } else {
      const next = run + v
      low.push(Math.min(run, next)); high.push(Math.max(run, next))
      colors.push(v >= 0 ? t.positive : t.negative)
      run = next
    }
  })
  const lab = (i: number) => env.fmt(ds.format, vals[i], { unit: false, sign: steps[i] === 'delta', decimals: env.decimals })
  let axisMin: number | undefined
  if (ds.truncateAxis) {
    const lo = Math.min(...low.filter((_, i) => steps[i] === 'delta'), ...vals.filter((_, i) => steps[i] === 'total'))
    const hi = Math.max(...high)
    axisMin = Math.max(0, lo - 2.5 * (hi - lo || hi * 0.05))
  }
  return {
    ...frame(env, { legend: { show: false }, grid: { left: 4, right: 12, top: 26, bottom: 4, containLabel: true } }),
    tooltip: { ...(frame(env).tooltip as P), trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: t.surfaceAlt, opacity: 0.6 } },
      formatter: (raw: { dataIndex: number }[]) => {
        const i = raw[0].dataIndex
        return `<div style="font-weight:600;margin-bottom:4px">${esc(ds.categories[i])}</div><b>${env.fmt(ds.format, vals[i], { sign: steps[i] === 'delta' })}</b>${ds.hints?.[i] ? `<div style="color:${t.textMuted};margin-top:2px">${esc(ds.hints[i])}</div>` : ''}`
      } },
    xAxis: catAxis(ds.categories, env, { axisLabel: { color: t.textMuted, fontSize: fs(env, 'labels', 11), fontWeight: fw(env, 'labels'), interval: 0, width: Math.round(84 * ty(env).labels), overflow: 'break' } }),
    yAxis: valueAxis(ds, env, false, { min: axisMin }),
    series: [
      { id: '__base', name: '__base', type: 'bar', stack: 'w', silent: true, itemStyle: { color: 'transparent' }, tooltip: { show: false }, data: low },
      { id: 'v', seriesId: 'v', name: ds.series[0].name, type: 'bar', stack: 'w', barMaxWidth: 46,
        label: { show: true, position: 'top', color: t.text, fontSize: fs(env, 'figures', 11.5), fontWeight: fw(env, 'figures', 600), fontFamily: FONT, formatter: (q: { dataIndex: number }) => lab(q.dataIndex) },
        data: high.map((h, i) => ({ value: h - low[i], itemStyle: { color: colors[i] } })) },
    ],
  } as EChartsCoreOption
}

// ------------------------------------------------------------------ tornade
function tornado(p: PreparedDataset, env: ChartEnv): EChartsCoreOption {
  const { ds } = p
  const t = env.tokens
  const labelW = Math.round(Math.min(240, Math.max(80, env.width * 0.4)))
  return {
    ...frame(env),
    tooltip: { ...(frame(env).tooltip as P), trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: t.surfaceAlt, opacity: 0.6 } }, formatter: axisTooltip(p, env, false) },
    legend: { ...(frame(env).legend as P), show: env.legend },
    grid: { left: labelW + 14, right: 24, top: gridTop(env, 10), bottom: 4, containLabel: false },
    xAxis: valueAxis(ds, env, true, { axisLabel: { color: t.axis, fontSize: fs(env, 'labels', 11), fontWeight: fw(env, 'labels'), formatter: (v: number) => env.fmt(ds.format, v, { unit: false, sign: true, decimals: env.powerUnit === 'MW' ? 1 : 0 }) } }),
    yAxis: catAxis(ds.categories, env, { inverse: true, axisLabel: { color: t.text, fontSize: fs(env, 'labels', 11), fontWeight: fw(env, 'labels'), width: labelW, overflow: 'truncate', ellipsis: '…', margin: 10 }, axisLine: { lineStyle: { color: t.axis } } }),
    series: ds.series.map((s) => ({
      id: s.id, seriesId: s.id, name: s.name, type: 'bar', barGap: '-100%', barMaxWidth: 16, itemStyle: { color: p.colors[s.id] },
      label: { show: false }, data: s.values,
    })),
  } as EChartsCoreOption
}

export function buildOption(p: PreparedDataset, type: ChartType, env: ChartEnv): EChartsCoreOption {
  switch (type) {
    case 'bar': return p.ds.kind === 'timeseries' ? lines(p, 'bar', env) : bars(p, 'bar', env)
    case 'hbar': return bars(p, 'hbar', env)
    case 'stackedBar': return p.ds.kind === 'timeseries' ? stackedTime(p, env) : bars(p, 'stackedBar', env)
    case 'line': return lines(p, 'line', env)
    case 'area': return lines(p, 'area', env)
    case 'stackedArea': return lines(p, 'stackedArea', env)
    case 'donut': return pie(p, 'donut', env)
    case 'pie': return pie(p, 'pie', env)
    case 'waterfall': return waterfall(p, env)
    case 'tornado': return tornado(p, env)
    default: return {}
  }
}

function stackedTime(p: PreparedDataset, env: ChartEnv): EChartsCoreOption {
  const o = bars(p, 'stackedBar', env) as P
  return o as EChartsCoreOption
}
