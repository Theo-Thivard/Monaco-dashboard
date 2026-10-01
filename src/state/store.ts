// Store central (sans dépendance) : un seul objet d'état, des actions pures,
// un instantané de calcul mémoïsé partagé par tous les composants.

import { useSyncExternalStore } from 'react'
import type { Layout } from 'react-grid-layout'
import { createDefaultConfig } from '../config/defaults'
import type { DashboardConfig, WidgetConfig } from '../config/types'
import { defaultParams, HYP_BY_ID, HYPS, hypValue, type Params } from '../core/hypotheses'
import { getSnapshot, type Snapshot } from '../core/snapshot'

export type Mode = 'client' | 'consultant'
export type Panel = 'assumptions' | 'settings' | 'widget' | null

export interface UIState {
  mode: Mode
  editLayout: boolean
  expanded: { detail: boolean; method: boolean }
  panel: Panel
  settingsTab: string
  selectedWidget: string | null
  toast: { id: number; msg: string; undo?: () => void } | null
}

export interface AppState {
  params: Params
  reference: Params
  scenario: number
  past: Params[]
  future: Params[]
  config: DashboardConfig
  ui: UIState
}

const KEY = 'monaco-dashboard-v2'
const OLD_KEY = 'monaco-dashboard-v1'
const HISTORY_MAX = 60

const freshUI = (): UIState => ({
  mode: 'client', editLayout: false, expanded: { detail: false, method: false },
  panel: null, settingsTab: 'content', selectedWidget: null, toast: null,
})

// ------------------------------------------------------------------ init
function mergeParams(base: Params, x: unknown): Params {
  const out = { ...base }
  if (x && typeof x === 'object') {
    for (const id of Object.keys(out)) {
      const v = (x as Params)[id]
      if (Array.isArray(v) && v.length === out[id].length && v.every((n) => typeof n === 'number' && Number.isFinite(n))) out[id] = v
    }
  }
  return out
}

/** Fusionne une configuration (stockée / importée) avec le défaut : tolérant aux versions. */
export function sanitizeConfig(x: unknown): DashboardConfig {
  const d = createDefaultConfig()
  if (!x || typeof x !== 'object') return d
  const c = x as Partial<DashboardConfig>
  const widgets = Array.isArray(c.widgets) ? c.widgets.filter((w) => w && typeof w.id === 'string' && typeof w.kind === 'string') : d.widgets
  const ids = new Set(widgets.map((w) => w.id))
  const layout = Array.isArray(c.layout) ? c.layout.filter((l) => ids.has(l.i)) : d.layout
  const kpiOrder = Array.isArray(c.kpis?.order) ? [...c.kpis!.order, ...d.kpis.order.filter((k) => !c.kpis!.order.includes(k))] : d.kpis.order
  return {
    ...d,
    ...c,
    version: 2,
    theme: { ...d.theme, ...(c.theme ?? {}), metrics: { ...d.theme.metrics, ...(c.theme?.metrics ?? {}) }, tokens: { ...(c.theme?.tokens ?? {}) } },
    format: { ...d.format, ...(c.format ?? {}) },
    labels: { ...(c.labels ?? {}) },
    kpis: { order: kpiOrder, visible: Array.isArray(c.kpis?.visible) ? c.kpis!.visible : d.kpis.visible },
    hyps: { visible: Array.isArray(c.hyps?.visible) ? c.hyps!.visible.filter((id) => HYP_BY_ID[id]) : d.hyps.visible, notes: { ...(c.hyps?.notes ?? {}) } },
    widgets, layout,
  }
}

function readShared(): { params: Params; scenario: number } | null {
  try {
    const m = /[#&]s=([^&]+)/.exec(location.hash)
    if (!m) return null
    const o = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))))
    return { params: mergeParams(defaultParams(), o.p), scenario: [0, 1, 2].includes(o.sc) ? o.sc : 1 }
  } catch { return null }
}

function load(): AppState {
  const base: AppState = {
    params: defaultParams(), reference: defaultParams(), scenario: 1, past: [], future: [],
    config: createDefaultConfig(), ui: freshUI(),
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const o = JSON.parse(raw)
      base.params = mergeParams(base.params, o.params)
      base.reference = mergeParams(base.reference, o.reference)
      base.scenario = [0, 1, 2].includes(o.scenario) ? o.scenario : 1
      base.config = sanitizeConfig(o.config)
    } else {
      // migration depuis la première version du dashboard : on ne garde que les hypothèses
      const old = localStorage.getItem(OLD_KEY)
      if (old) {
        const o = JSON.parse(old)
        base.params = mergeParams(base.params, o.params)
        if (o.options?.fixChpg) base.params = { ...base.params, fixChpg: [1] }
        if ([0, 1, 2].includes(o.activeScenario)) base.scenario = o.activeScenario
      }
    }
  } catch { /* stockage indisponible ou corrompu : on repart du défaut */ }
  const shared = readShared()
  if (shared) {
    base.params = shared.params
    base.scenario = shared.scenario
    base.ui.toast = { id: Date.now(), msg: 'Scénario partagé chargé' }
    try { history.replaceState(null, '', location.pathname + location.search) } catch { /* noop */ }
  }
  return base
}

// ------------------------------------------------------------------ store
let state: AppState = load()
const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | undefined

function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ params: state.params, reference: state.reference, scenario: state.scenario, config: state.config }))
    } catch { /* noop */ }
  }, 250)
}

export const getState = () => state
export function setState(fn: (s: AppState) => AppState, save = true) {
  const next = fn(state)
  if (next === state) return
  state = next
  if (save) persist()
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}
export const useConfig = () => useAppState((s) => s.config)
export const useUI = () => useAppState((s) => s.ui)

/** Instantané de calcul partagé (recalculé uniquement quand params / référence / scénario changent). */
export function useSnapshot(): Snapshot {
  return useSyncExternalStore(subscribe, () => getSnapshot(state.params, state.reference, state.scenario))
}

// ------------------------------------------------------------------ actions
let toastSeq = 0
export function toast(msg: string, undo?: () => void) {
  const id = ++toastSeq
  setState((s) => ({ ...s, ui: { ...s.ui, toast: { id, msg, undo } } }), false)
  setTimeout(() => setState((s) => (s.ui.toast?.id === id ? { ...s, ui: { ...s.ui, toast: null } } : s), false), 6000)
}

let lastEdit = { id: '', t: 0 }
/** Modifie une hypothèse. idx = index de scénario (ignoré pour les valeurs uniques). */
export function setParam(id: string, value: number, idx?: number) {
  const h = HYP_BY_ID[id]
  if (!h) return
  setState((s) => {
    const i = h.single ? 0 : idx ?? s.scenario
    if (s.params[id][i] === value) return s
    const now = Date.now()
    const coalesce = lastEdit.id === `${id}:${i}` && now - lastEdit.t < 800
    lastEdit = { id: `${id}:${i}`, t: now }
    return {
      ...s,
      params: { ...s.params, [id]: s.params[id].map((x, k) => (k === i ? value : x)) },
      past: coalesce ? s.past : [...s.past.slice(-HISTORY_MAX + 1), s.params],
      future: [],
    }
  })
}

/** Remet une hypothèse à sa valeur de référence (scénario actif, ou valeur unique). */
export function resetParam(id: string, idx?: number) {
  const h = HYP_BY_ID[id]
  setState((s) => {
    const i = h.single ? 0 : idx ?? s.scenario
    const ref = s.reference[id][i]
    if (s.params[id][i] === ref) return s
    return { ...s, params: { ...s.params, [id]: s.params[id].map((v, k) => (k === i ? ref : v)) }, past: [...s.past.slice(-HISTORY_MAX + 1), s.params], future: [] }
  })
}

export const undo = () => setState((s) => (s.past.length ? { ...s, params: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.params, ...s.future] } : s))
export const redo = () => setState((s) => (s.future.length ? { ...s, params: s.future[0], past: [...s.past, s.params], future: s.future.slice(1) } : s))

export function resetAssumptions() {
  const before = getState().params
  setState((s) => ({ ...s, params: defaultParams(), past: [...s.past.slice(-HISTORY_MAX + 1), s.params], future: [] }))
  toast('Hypothèses remises aux valeurs par défaut', () => setState((s) => ({ ...s, params: before })))
}

export const setReferenceToCurrent = () => { setState((s) => ({ ...s, reference: s.params })); toast('Référence = scénario actuel') }
export const resetReference = () => { setState((s) => ({ ...s, reference: defaultParams() })); toast('Référence = valeurs d\'origine') }
export const setScenario = (n: number) => setState((s) => ({ ...s, scenario: n }))
export const setMode = (mode: Mode) => setState((s) => ({ ...s, ui: { ...s.ui, mode, editLayout: mode === 'client' ? false : s.ui.editLayout, panel: mode === 'client' && s.ui.panel === 'settings' ? null : s.ui.panel } }), false)
export const patchUI = (p: Partial<UIState>) => setState((s) => ({ ...s, ui: { ...s.ui, ...p } }), false)
export const toggleExpanded = (k: 'detail' | 'method') => setState((s) => ({ ...s, ui: { ...s.ui, expanded: { ...s.ui.expanded, [k]: !s.ui.expanded[k] } } }), false)

export const updateConfig = (fn: (c: DashboardConfig) => DashboardConfig) => setState((s) => ({ ...s, config: fn(s.config) }))
export const updateWidget = (id: string, patch: Partial<WidgetConfig>) =>
  updateConfig((c) => ({ ...c, widgets: c.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)) }))
export const setLabel = (key: string, value: string, def: string) =>
  updateConfig((c) => {
    const labels = { ...c.labels }
    if (!value.trim() || value === def) delete labels[key]
    else labels[key] = value
    return { ...c, labels }
  })

export function setLayout(visible: Layout[]) {
  setState((s) => {
    const strip = (l: Layout) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })
    const upd = new Map(visible.map((l) => [l.i, strip(l)]))
    let changed = false
    const layout = s.config.layout.map((l) => {
      const n = upd.get(l.i)
      if (!n) return l
      if (n.x !== l.x || n.y !== l.y || n.w !== l.w || n.h !== l.h) changed = true
      return n
    })
    return changed ? { ...s, config: { ...s.config, layout } } : s
  })
}
export const updateLayoutItem = (id: string, patch: Partial<Pick<Layout, 'x' | 'y' | 'w' | 'h'>>) =>
  updateConfig((c) => ({ ...c, layout: c.layout.map((l) => (l.i === id ? { ...l, ...patch } : l)) }))

export function addWidget(w: WidgetConfig, size: { w: number; h: number }) {
  updateConfig((c) => {
    const y = c.layout.reduce((m, l) => Math.max(m, l.y + l.h), 0)
    return { ...c, widgets: [...c.widgets, w], layout: [...c.layout, { i: w.id, x: 0, y, ...size }] }
  })
}
export const removeWidget = (id: string) =>
  updateConfig((c) => ({ ...c, widgets: c.widgets.filter((w) => w.id !== id), layout: c.layout.filter((l) => l.i !== id) }))

export const toggleHypVisible = (id: string) =>
  updateConfig((c) => ({ ...c, hyps: { ...c.hyps, visible: c.hyps.visible.includes(id) ? c.hyps.visible.filter((x) => x !== id) : [...c.hyps.visible, id] } }))
export const setHypsVisible = (ids: string[]) => updateConfig((c) => ({ ...c, hyps: { ...c.hyps, visible: ids } }))

export const toggleKpi = (id: string) =>
  updateConfig((c) => ({ ...c, kpis: { ...c.kpis, visible: c.kpis.visible.includes(id) ? c.kpis.visible.filter((x) => x !== id) : [...c.kpis.visible, id] } }))
export function moveKpi(id: string, dir: -1 | 1) {
  updateConfig((c) => {
    const o = [...c.kpis.order]
    const i = o.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= o.length) return c
    ;[o[i], o[j]] = [o[j], o[i]]
    return { ...c, kpis: { ...c.kpis, order: o } }
  })
}

// ------------------------------------------------------------------ resets
/** Remet layout, couleurs, formats, libellés, visibilité et types de graphiques par défaut (hypothèses conservées). */
export function resetDashboard() {
  setState((s) => ({ ...s, config: createDefaultConfig(), ui: { ...s.ui, selectedWidget: null, expanded: { detail: false, method: false } } }))
  toast('Dashboard remis dans sa configuration par défaut')
}
export function resetAll() {
  setState((s) => ({ ...s, params: defaultParams(), reference: defaultParams(), past: [], future: [], config: createDefaultConfig(), scenario: 1, ui: { ...freshUI(), mode: s.ui.mode } }))
  toast('Tout a été remis à l\'état initial')
}

// ------------------------------------------------------------------ export / import / partage
export const exportJSON = () => JSON.stringify({ app: 'monaco-dashboard', version: 2, params: state.params, reference: state.reference, scenario: state.scenario, config: state.config }, null, 2)

export function importJSON(text: string) {
  const o = JSON.parse(text)
  if (o?.app !== 'monaco-dashboard') throw new Error('Fichier inconnu')
  setState((s) => ({
    ...s, params: mergeParams(defaultParams(), o.params), reference: mergeParams(defaultParams(), o.reference),
    scenario: [0, 1, 2].includes(o.scenario) ? o.scenario : 1, config: sanitizeConfig(o.config), past: [], future: [],
  }))
  toast('Configuration importée')
}

/** Lien partageable : uniquement les hypothèses qui diffèrent du défaut. */
export function shareURL(): string {
  const def = defaultParams()
  const p: Params = {}
  for (const h of HYPS) if (state.params[h.id].some((v, i) => v !== def[h.id][i])) p[h.id] = state.params[h.id]
  const enc = btoa(unescape(encodeURIComponent(JSON.stringify({ p, sc: state.scenario }))))
  return `${location.origin}${location.pathname}#s=${encodeURIComponent(enc)}`
}

// ------------------------------------------------------------------ comparaison avec le défaut
export interface DiffSummary {
  assumptions: { id: string; scenario: number | null; from: number; to: number }[]
  layout: number
  theme: number
  labels: number
  visibility: number
  charts: number
  format: number
}
export function diffFromDefault(s: AppState): DiffSummary {
  const d = createDefaultConfig()
  const def = defaultParams()
  const assumptions: DiffSummary['assumptions'] = []
  for (const h of HYPS) {
    s.params[h.id].forEach((v, i) => {
      if (v !== def[h.id][i]) assumptions.push({ id: h.id, scenario: h.single ? null : i, from: def[h.id][i], to: v })
    })
  }
  const c = s.config
  const lay = c.layout.filter((l) => { const o = d.layout.find((x) => x.i === l.i); return !o || o.x !== l.x || o.y !== l.y || o.w !== l.w || o.h !== l.h }).length
  const metrics = Object.entries(c.theme.metrics).filter(([k, v]) => (d.theme.metrics as unknown as Record<string, number>)[k] !== v).length
  const vis = c.widgets.filter((w) => w.visible !== (d.widgets.find((x) => x.id === w.id)?.visible ?? true)).length
    + d.widgets.filter((w) => !c.widgets.some((x) => x.id === w.id)).length
    + (JSON.stringify([...c.kpis.visible].sort()) !== JSON.stringify([...d.kpis.visible].sort()) ? 1 : 0)
    + (JSON.stringify([...c.hyps.visible].sort()) !== JSON.stringify([...d.hyps.visible].sort()) ? 1 : 0)
  const charts = c.widgets.filter((w) => { const o = d.widgets.find((x) => x.id === w.id); return o && (o.chartType !== w.chartType || JSON.stringify(o.series ?? null) !== JSON.stringify(w.series ?? null) || o.legend !== w.legend) }).length
  return {
    assumptions, layout: lay,
    theme: Object.keys(c.theme.tokens).length + metrics + (c.theme.preset !== d.theme.preset ? 1 : 0)
      + c.widgets.filter((w) => w.bg || w.fg).length,
    labels: Object.keys(c.labels).length + c.widgets.filter((w) => { const o = d.widgets.find((x) => x.id === w.id); return o && (o.title !== w.title || o.subtitle !== w.subtitle || o.note !== w.note || o.text !== w.text) }).length
      + (c.title !== d.title ? 1 : 0) + (c.subtitle !== d.subtitle ? 1 : 0),
    visibility: vis, charts, format: Object.entries(c.format).filter(([k, v]) => (d.format as unknown as Record<string, unknown>)[k] !== v).length,
  }
}

export const hypNow = (id: string, s: number) => hypValue(getState().params, id, s)
