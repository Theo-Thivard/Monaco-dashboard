// Store central (sans dépendance) : un seul objet d'état, des actions pures,
// un instantané de calcul mémoïsé partagé par tous les composants.

import { useSyncExternalStore } from 'react'
import type { Layout } from 'react-grid-layout'
import { createDefaultConfig, PAGE_DEFAULTS } from '../config/defaults'
import saved from '../config/saved.json'
import type { DashboardConfig, PageConfig, WidgetConfig } from '../config/types'
import { defaultParams, HYP_BY_ID, HYPS, hypValue, type Params } from '../core/hypotheses'
import type { Lens } from '../core/lens'
import { getSnapshot, type Snapshot } from '../core/snapshot'
import { DEFAULT_ROUTE, formatRoute, parseRoute, sameRoute, type PageKind, type Route } from './route'

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
  scenario: number
  /** lentille : besoins générés (livrable 2, défaut) ou besoins adressables (livrable 3) */
  lens: Lens
  route: Route
  past: Params[]
  future: Params[]
  config: DashboardConfig
  ui: UIState
}

// On ne stocke que les hypothèses que l'utilisateur a MODIFIÉES par rapport à l'Excel (les autres suivent l'Excel).
// v5 : nouvelles mises en page (lentille « besoins générés ») ; les anciennes configurations ne sont pas reprises.
const KEY = 'monaco-dashboard-v5'
const HISTORY_MAX = 60

const freshUI = (): UIState => ({
  mode: 'client', editLayout: false, expanded: { detail: false, method: false },
  panel: null, settingsTab: 'content', selectedWidget: null, toast: null,
})

/** Affichage par défaut du site : configuration enregistrée dans le dépôt (src/config/saved.json) si elle existe, sinon l'affichage d'origine. */
export function userDefaultConfig(): DashboardConfig {
  const c = (saved as { config?: unknown }).config
  return c ? sanitizeConfig(c) : createDefaultConfig()
}

// ------------------------------------------------------------------ init
/** Écarts par rapport aux valeurs de l'Excel : null = « suit l'Excel ». */
export type Overrides = Record<string, (number | null)[]>
export function toOverrides(p: Params): Overrides {
  const def = defaultParams()
  const o: Overrides = {}
  for (const id of Object.keys(p)) {
    const arr = p[id].map((v, i) => (v !== def[id]?.[i] ? v : null))
    if (arr.some((v) => v !== null)) o[id] = arr
  }
  return o
}
export function applyOverrides(base: Params, o: unknown): Params {
  const out = { ...base }
  if (o && typeof o === 'object') {
    for (const id of Object.keys(out)) {
      const v = (o as Overrides)[id]
      if (Array.isArray(v) && v.length === out[id].length) out[id] = out[id].map((d, i) => (typeof v[i] === 'number' && Number.isFinite(v[i] as number) ? (v[i] as number) : d))
    }
  }
  return out
}

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

/** Fusionne une configuration (stockée / importée) avec le défaut : tolérant aux versions (v2 -> v3 migrée). */
export function sanitizeConfig(x: unknown): DashboardConfig {
  const d = createDefaultConfig()
  if (!x || typeof x !== 'object') return d
  const c = x as Partial<DashboardConfig> & { widgets?: WidgetConfig[]; layout?: Layout[]; title?: string }
  const cleanPage = (p: Partial<PageConfig> | undefined, fallback: PageConfig): PageConfig => {
    if (!p || !Array.isArray(p.widgets)) return fallback
    const widgets = p.widgets.filter((w) => w && typeof w.id === 'string' && typeof w.kind === 'string' && w.datasetId !== 'whatChanged')
    const ids = new Set(widgets.map((w) => w.id))
    return { widgets, layout: Array.isArray(p.layout) ? p.layout.filter((l) => ids.has(l.i)) : fallback.layout }
  }
  // v2 : une seule page (devenue la page « Scénario »)
  const legacy: Partial<PageConfig> | undefined = c.widgets ? { widgets: c.widgets, layout: c.layout } : undefined
  const pages = {
    global: cleanPage(c.pages?.global, d.pages.global),
    scenario: cleanPage(c.pages?.scenario ?? legacy, d.pages.scenario),
    actor: cleanPage(c.pages?.actor, d.pages.actor),
  }
  const kpiOrder = Array.isArray(c.kpis?.order) ? [...c.kpis!.order, ...d.kpis.order.filter((k) => !c.kpis!.order.includes(k))] : d.kpis.order
  return {
    ...d,
    version: 4,
    brand: typeof c.brand === 'string' && c.brand ? c.brand : d.brand,
    footnote: typeof c.footnote === 'string' && !c.footnote.startsWith('Source : modèle Monaco_Besoins_IT_v') ? c.footnote : d.footnote,
    theme: { ...d.theme, ...(c.theme ?? {}), metrics: { ...d.theme.metrics, ...(c.theme?.metrics ?? {}) }, tokens: { ...(c.theme?.tokens ?? {}) } },
    format: { ...d.format, ...(c.format ?? {}) },
    labels: { ...(c.labels ?? {}) },
    kpis: { order: kpiOrder, visible: Array.isArray(c.kpis?.visible) ? c.kpis!.visible : d.kpis.visible },
    hyps: { visible: Array.isArray(c.hyps?.visible) ? c.hyps!.visible.filter((id) => HYP_BY_ID[id]) : d.hyps.visible, notes: { ...(c.hyps?.notes ?? {}) } },
    pages,
  }
}

/** Lien partagé : « #/scenario/central?s=… » (ou ancien format « #s=… »). */
function readShared(): { params: Params; scenario: number; lens: Lens } | null {
  try {
    const m = /[?&#]s=([^&]+)/.exec(location.hash)
    if (!m) return null
    const o = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))))
    return { params: mergeParams(defaultParams(), o.p), scenario: [0, 1, 2].includes(o.sc) ? o.sc : 1, lens: (o.l === 'addressable' ? 'addressable' : 'need') as Lens }
  } catch { return null }
}

const readRoute = (): Route => { try { return parseRoute(location.hash) } catch { return DEFAULT_ROUTE } }

function load(): AppState {
  const base: AppState = {
    params: defaultParams(), scenario: 1, lens: 'need', route: readRoute(), past: [], future: [],
    config: userDefaultConfig(), ui: freshUI(),
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const o = JSON.parse(raw)
      base.params = applyOverrides(base.params, o.overrides)
      if (o.lens === 'need' || o.lens === 'addressable') base.lens = o.lens
      base.scenario = [0, 1, 2].includes(o.scenario) ? o.scenario : 1
      base.config = sanitizeConfig(o.config)
    }
  } catch { /* stockage indisponible ou corrompu : on repart du défaut */ }
  const shared = readShared()
  if (shared) {
    base.params = shared.params
    base.scenario = shared.scenario
    base.lens = shared.lens
    base.ui.toast = { id: Date.now(), msg: 'Scénario partagé chargé' }
  }
  // le scénario affiché d'une page « Scénario » est celui de la route
  if (base.route.kind === 'scenario') base.scenario = base.route.scenario
  if (shared) { try { history.replaceState(null, '', location.pathname + location.search + formatRoute(base.route)) } catch { /* noop */ } }
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
      localStorage.setItem(KEY, JSON.stringify({ overrides: toOverrides(state.params), scenario: state.scenario, lens: state.lens, config: state.config }))
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

/** Instantané de calcul partagé (recalculé uniquement quand params / scénario / lentille changent). */
export function useSnapshot(): Snapshot {
  return useSyncExternalStore(subscribe, () => getSnapshot(state.params, state.scenario, state.lens))
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

/** Remet une hypothèse à sa valeur de l'Excel (scénario actif, ou valeur unique). */
export function resetParam(id: string, idx?: number) {
  const h = HYP_BY_ID[id]
  setState((s) => {
    const i = h.single ? 0 : idx ?? s.scenario
    const ref = defaultParams()[id][i]
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

export const setLens = (lens: Lens) => setState((s) => (s.lens === lens ? s : { ...s, lens }))
/** Scénario de contexte (sélecteur d'une page acteur). Sur une page Scénario, on navigue vers la route correspondante. */
export function setScenario(n: number) {
  if (getState().route.kind === 'scenario') navigate({ kind: 'scenario', scenario: n })
  else setState((s) => ({ ...s, scenario: n }))
}

// ------------------------------------------------------------------ navigation
function applyRoute(r: Route) {
  setState((s) => {
    const scenario = r.kind === 'scenario' ? r.scenario : s.scenario
    if (sameRoute(s.route, r) && scenario === s.scenario) return s
    return { ...s, route: r, scenario, ui: { ...s.ui, selectedWidget: null, panel: s.ui.panel === 'widget' ? null : s.ui.panel } }
  })
}
/** Va à une page : l'adresse (#/…) est la source de vérité, le bouton « précédent » fonctionne. */
export function navigate(r: Route) {
  if (typeof location !== 'undefined') {
    const h = formatRoute(r)
    if (location.hash !== h) { location.hash = h; return }
  }
  applyRoute(r)
}
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    applyRoute(parseRoute(location.hash))
    window.scrollTo(0, 0)
  })
}
export const setMode = (mode: Mode) => setState((s) => ({ ...s, ui: { ...s.ui, mode, editLayout: mode === 'client' ? false : s.ui.editLayout, panel: mode === 'client' && s.ui.panel === 'settings' ? null : s.ui.panel } }), false)
export const patchUI = (p: Partial<UIState>) => setState((s) => ({ ...s, ui: { ...s.ui, ...p } }), false)
export const toggleExpanded = (k: 'detail' | 'method') => setState((s) => ({ ...s, ui: { ...s.ui, expanded: { ...s.ui.expanded, [k]: !s.ui.expanded[k] } } }), false)

export const updateConfig = (fn: (c: DashboardConfig) => DashboardConfig) => setState((s) => ({ ...s, config: fn(s.config) }))
const KINDS: PageKind[] = ['global', 'scenario', 'actor']
/** Applique `fn` à la page qui contient le widget `id` (les identifiants sont uniques entre pages). */
const updateOwnPage = (id: string, fn: (p: PageConfig) => PageConfig) =>
  updateConfig((c) => {
    const kind = KINDS.find((k) => c.pages[k].widgets.some((w) => w.id === id) || c.pages[k].layout.some((l) => l.i === id))
    return kind ? { ...c, pages: { ...c.pages, [kind]: fn(c.pages[kind]) } } : c
  })
export const updateWidget = (id: string, patch: Partial<WidgetConfig>) =>
  updateOwnPage(id, (p) => ({ ...p, widgets: p.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)) }))
export const setLabel = (key: string, value: string, def: string) =>
  updateConfig((c) => {
    const labels = { ...c.labels }
    if (!value.trim() || value === def) delete labels[key]
    else labels[key] = value
    return { ...c, labels }
  })

/** Positions des widgets visibles de la page courante (n'écrase pas les widgets masqués). */
export function setLayout(visible: Layout[]) {
  setState((s) => {
    const kind = s.route.kind
    const page = s.config.pages[kind]
    const strip = (l: Layout) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })
    const upd = new Map(visible.map((l) => [l.i, strip(l)]))
    let changed = false
    const layout = page.layout.map((l) => {
      const n = upd.get(l.i)
      if (!n) return l
      if (n.x !== l.x || n.y !== l.y || n.w !== l.w || n.h !== l.h) changed = true
      return n
    })
    return changed ? { ...s, config: { ...s.config, pages: { ...s.config.pages, [kind]: { ...page, layout } } } } : s
  })
}
export const updateLayoutItem = (id: string, patch: Partial<Pick<Layout, 'x' | 'y' | 'w' | 'h'>>) =>
  updateOwnPage(id, (p) => ({ ...p, layout: p.layout.map((l) => (l.i === id ? { ...l, ...patch } : l)) }))

export function addWidget(w: WidgetConfig, size: { w: number; h: number }) {
  updateConfig((c) => {
    const kind = getState().route.kind
    const p = c.pages[kind]
    const y = p.layout.reduce((m, l) => Math.max(m, l.y + l.h), 0)
    return { ...c, pages: { ...c.pages, [kind]: { widgets: [...p.widgets, w], layout: [...p.layout, { i: w.id, x: 0, y, ...size }] } } }
  })
}
export const removeWidget = (id: string) =>
  updateOwnPage(id, (p) => ({ widgets: p.widgets.filter((w) => w.id !== id), layout: p.layout.filter((l) => l.i !== id) }))

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
  setState((s) => ({ ...s, config: userDefaultConfig(), ui: { ...s.ui, selectedWidget: null, expanded: { detail: false, method: false } } }))
  toast('Dashboard remis dans sa configuration par défaut')
}
export function resetAll() {
  setState((s) => ({ ...s, params: defaultParams(), lens: 'need', past: [], future: [], config: userDefaultConfig(), scenario: s.route.kind === 'scenario' ? s.route.scenario : 1, ui: { ...freshUI(), mode: s.ui.mode } }))
  toast('Tout a été remis à l\'état initial')
}

// ------------------------------------------------------------------ export / import / partage
export const exportJSON = () => JSON.stringify({ app: 'monaco-dashboard', version: 5, overrides: toOverrides(state.params), scenario: state.scenario, lens: state.lens, config: state.config }, null, 2)

export function importJSON(text: string) {
  const o = JSON.parse(text)
  if (o?.app !== 'monaco-dashboard') throw new Error('Fichier inconnu')
  // formats anciens (hypothèses absolues) : seules les valeurs différentes de l'Excel actuel sont reprises
  const ov = o.overrides ?? toOverrides(mergeParams(defaultParams(), o.params))
  setState((s) => ({
    ...s, params: applyOverrides(defaultParams(), ov), lens: o.lens === 'addressable' ? 'addressable' : 'need',
    scenario: s.route.kind === 'scenario' ? s.route.scenario : [0, 1, 2].includes(o.scenario) ? o.scenario : 1,
    config: sanitizeConfig(o.config), past: [], future: [],
  }))
  toast('Configuration importée')
}

/** Lien partageable (page courante + hypothèses qui diffèrent du défaut). */
export function shareURL(): string {
  const def = defaultParams()
  const p: Params = {}
  for (const h of HYPS) if (state.params[h.id].some((v, i) => v !== def[h.id][i])) p[h.id] = state.params[h.id]
  const enc = btoa(unescape(encodeURIComponent(JSON.stringify({ p, sc: state.scenario, l: state.lens }))))
  return `${location.origin}${location.pathname}${formatRoute(state.route)}?s=${encodeURIComponent(enc)}`
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
  const d = userDefaultConfig()
  const def = defaultParams()
  const assumptions: DiffSummary['assumptions'] = []
  for (const h of HYPS) {
    s.params[h.id].forEach((v, i) => {
      if (v !== def[h.id][i]) assumptions.push({ id: h.id, scenario: h.single ? null : i, from: def[h.id][i], to: v })
    })
  }
  const c = s.config
  let layout = 0, vis = 0, charts = 0, bg = 0, texts = 0
  for (const k of KINDS) {
    const cp = c.pages[k]
    const dp = d.pages[k]
    layout += cp.layout.filter((l) => { const o = dp.layout.find((x) => x.i === l.i); return !o || o.x !== l.x || o.y !== l.y || o.w !== l.w || o.h !== l.h }).length
    vis += cp.widgets.filter((w) => w.visible !== (dp.widgets.find((x) => x.id === w.id)?.visible ?? true)).length
      + dp.widgets.filter((w) => !cp.widgets.some((x) => x.id === w.id)).length
    charts += cp.widgets.filter((w) => { const o = dp.widgets.find((x) => x.id === w.id); return o && (o.chartType !== w.chartType || JSON.stringify(o.series ?? null) !== JSON.stringify(w.series ?? null) || o.legend !== w.legend) }).length
    bg += cp.widgets.filter((w) => w.bg || w.fg).length
    texts += cp.widgets.filter((w) => { const o = dp.widgets.find((x) => x.id === w.id); return o && (o.title !== w.title || o.subtitle !== w.subtitle || o.note !== w.note || o.text !== w.text) }).length
  }
  vis += (JSON.stringify([...c.kpis.visible].sort()) !== JSON.stringify([...d.kpis.visible].sort()) ? 1 : 0)
    + (JSON.stringify([...c.hyps.visible].sort()) !== JSON.stringify([...d.hyps.visible].sort()) ? 1 : 0)
  const metrics = Object.entries(c.theme.metrics).filter(([k, v]) => (d.theme.metrics as unknown as Record<string, number>)[k] !== v).length
  return {
    assumptions, layout,
    theme: Object.keys(c.theme.tokens).length + metrics + (c.theme.preset !== d.theme.preset ? 1 : 0) + bg,
    labels: Object.keys(c.labels).length + texts + (c.brand !== d.brand ? 1 : 0),
    visibility: vis, charts, format: Object.entries(c.format).filter(([k, v]) => (d.format as unknown as Record<string, unknown>)[k] !== v).length,
  }
}

export const pageKind = (r: Route): PageKind => r.kind
export { PAGE_DEFAULTS }

export const hypNow = (id: string, s: number) => hypValue(getState().params, id, s)
