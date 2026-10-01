import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Layout } from 'react-grid-layout'
import { computeAll, defaultOptions, defaultParams, HORIZON, computeScenario, type Options, type Params, type ScenarioResult } from './model'
import { CATALOG, defaultWidgets, defaultLayout } from './catalog'

export interface WidgetCfg {
  id: string
  type: string
  title: string
  group?: string // pour les widgets de curseurs
  bg?: string
  fg?: string
  headerBg?: string
  scenario: 'global' | 0 | 1 | 2
  legend: boolean
}

export interface Theme {
  mode: 'dark' | 'light'
  scenarioColors: string[]
  blockColors: string[]
}

export const defaultTheme = (): Theme => ({
  mode: 'dark',
  scenarioColors: ['#4f9cf9', '#f5b942', '#ef6f6c'],
  blockColors: ['#4f9cf9', '#8e7cf3', '#37c4a6', '#f5b942', '#ef6f6c', '#9aa5b8'],
})

interface Persisted {
  params: Params
  options: Options
  widgets: WidgetCfg[]
  layout: Layout[]
  theme: Theme
  activeScenario: number
}

const KEY = 'monaco-dashboard-v1'

function load(): Persisted {
  const fresh: Persisted = {
    params: defaultParams(), options: defaultOptions, widgets: defaultWidgets(),
    layout: defaultLayout(), theme: defaultTheme(), activeScenario: 1,
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fresh
    return sanitize(JSON.parse(raw), fresh)
  } catch {
    return fresh
  }
}

/** Fusionne une configuration importée avec les valeurs par défaut (tolérant aux versions). */
export function sanitize(x: Partial<Persisted>, fresh: Persisted): Persisted {
  const params = { ...fresh.params }
  for (const k of Object.keys(params)) {
    const v = x.params?.[k]
    if (Array.isArray(v) && v.length === params[k].length && v.every((n) => typeof n === 'number')) params[k] = v
  }
  const widgets = Array.isArray(x.widgets) ? x.widgets.filter((w) => w && CATALOG[w.type]) : fresh.widgets
  const ids = new Set(widgets.map((w) => w.id))
  const layout = Array.isArray(x.layout) ? x.layout.filter((l) => ids.has(l.i)) : fresh.layout
  return {
    params,
    options: { ...fresh.options, ...(x.options ?? {}) },
    widgets,
    layout,
    theme: { ...fresh.theme, ...(x.theme ?? {}) },
    activeScenario: [0, 1, 2].includes(x.activeScenario as number) ? (x.activeScenario as number) : 1,
  }
}

interface Ctx extends Persisted {
  edit: boolean
  setEdit: (b: boolean) => void
  results: ScenarioResult[]
  reference: ScenarioResult[] // valeurs de l'Excel d'origine
  trajectory: ScenarioResult[][] // [scénario][année 0..9]
  setParam: (id: string, idx: number, v: number) => void
  resetParams: () => void
  setOptions: (o: Partial<Options>) => void
  setTheme: (t: Partial<Theme>) => void
  setActiveScenario: (s: number) => void
  setLayout: (l: Layout[]) => void
  updateWidget: (id: string, patch: Partial<WidgetCfg>) => void
  removeWidget: (id: string) => void
  addWidget: (catalogKey: string) => void
  resetLayout: () => void
  exportConfig: () => string
  importConfig: (json: string) => void
  selected: string | null
  select: (id: string | null) => void
}

const StoreCtx = createContext<Ctx>(null as never)
export const useStore = () => useContext(StoreCtx)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load)
  const [edit, setEdit] = useState(false)
  const [selected, select] = useState<string | null>(null)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* stockage indisponible */ }
  }, [state])

  const results = useMemo(() => computeAll(state.params, state.options), [state.params, state.options])
  const reference = useMemo(() => computeAll(defaultParams(), defaultOptions), [])
  const trajectory = useMemo(
    () => [0, 1, 2].map((s) => Array.from({ length: HORIZON + 1 }, (_, t) => computeScenario(state.params, s, t, state.options))),
    [state.params, state.options],
  )

  const setParam = useCallback((id: string, idx: number, v: number) => {
    setState((s) => ({ ...s, params: { ...s.params, [id]: s.params[id].map((x, i) => (i === idx ? v : x)) } }))
  }, [])
  const resetParams = useCallback(() => setState((s) => ({ ...s, params: defaultParams() })), [])
  const setOptions = useCallback((o: Partial<Options>) => setState((s) => ({ ...s, options: { ...s.options, ...o } })), [])
  const setTheme = useCallback((t: Partial<Theme>) => setState((s) => ({ ...s, theme: { ...s.theme, ...t } })), [])
  const setActiveScenario = useCallback((a: number) => setState((s) => ({ ...s, activeScenario: a })), [])
  const setLayout = useCallback((layout: Layout[]) => {
    setState((s) => {
      const strip = (l: Layout[]) => JSON.stringify(l.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })))
      return strip(layout) === strip(s.layout) ? s : { ...s, layout: layout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })) }
    })
  }, [])
  const updateWidget = useCallback((id: string, patch: Partial<WidgetCfg>) => {
    setState((s) => ({ ...s, widgets: s.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)) }))
  }, [])
  const removeWidget = useCallback((id: string) => {
    setState((s) => ({ ...s, widgets: s.widgets.filter((w) => w.id !== id), layout: s.layout.filter((l) => l.i !== id) }))
    select(null)
  }, [])
  const addWidget = useCallback((key: string) => {
    const c = CATALOG[key]
    if (!c) return
    setState((s) => {
      const id = `${key}-${Date.now().toString(36)}`
      const w: WidgetCfg = { id, type: c.type, title: c.title, group: c.group, scenario: 'global', legend: true }
      const y = s.layout.reduce((m, l) => Math.max(m, l.y + l.h), 0)
      return { ...s, widgets: [...s.widgets, w], layout: [...s.layout, { i: id, x: 0, y, w: c.w, h: c.h }] }
    })
  }, [])
  const resetLayout = useCallback(() => {
    setState((s) => ({ ...s, widgets: defaultWidgets(), layout: defaultLayout(), theme: defaultTheme() }))
    select(null)
  }, [])
  const exportConfig = useCallback(() => JSON.stringify(state, null, 2), [state])
  const importConfig = useCallback((json: string) => {
    const fresh = load()
    setState(sanitize(JSON.parse(json), { ...fresh, params: defaultParams(), widgets: defaultWidgets(), layout: defaultLayout(), theme: defaultTheme() }))
  }, [])

  const value: Ctx = {
    ...state, edit, setEdit, results, reference, trajectory, setParam, resetParams, setOptions, setTheme,
    setActiveScenario, setLayout, updateWidget, removeWidget, addWidget, resetLayout, exportConfig, importConfig,
    selected, select,
  }
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}
