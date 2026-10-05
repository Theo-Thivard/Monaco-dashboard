import { useEffect, useState } from 'react'
import { getModel } from './core/model'
import { SOURCE_LABEL } from './ui/ModelInfo'
import { applyTheme } from './config/theme'
import { applyTypography } from './config/typography'
import { TypographyPanel } from './ui/TypographyPanel'
import { AssumptionsDrawer } from './ui/AssumptionsDrawer'
import { ContextBar } from './ui/ContextBar'
import { HypSidebar } from './ui/HypSidebar'
import { Dashboard } from './ui/Dashboard'
import { SettingsDrawer } from './ui/SettingsDrawer'
import { Toast } from './ui/Toast'
import { TopNav } from './ui/TopNav'
import { WidgetSettings } from './ui/WidgetSettings'
import { useEnv } from './ui/env'
import { redo, undo, useUI } from './state/store'

/** Avertissement visible si le modèle Excel présente un écart (copie de repli utilisée, total incohérent…). */
function ModelBanner() {
  const [hidden, setHidden] = useState(false)
  const issues = getModel().diagnostics.filter((d) => d.level !== 'info')
  if (!issues.length || hidden) return null
  return (
    <div className="modelbanner" role="status">
      <span>⚠ {issues[0].message}{issues.length > 1 ? ` (+ ${issues.length - 1} autre${issues.length > 2 ? 's' : ''}, détail dans Globale › Méthodologie › Source du modèle)` : ''}</span>
      <button className="link" onClick={() => setHidden(true)}>Masquer</button>
    </div>
  )
}

export default function App() {
  const env = useEnv()
  const ui = useUI()
  const { config, tokens, route } = env

  useEffect(() => { applyTheme(tokens, config.theme.metrics) }, [tokens, config.theme.metrics])
  useEffect(() => { applyTypography(config.theme.typo) }, [config.theme.typo])

  // titre de l'onglet = page courante
  const pageTitle = route.kind === 'global' ? 'Globale' : route.kind === 'scenario' ? `Scénario ${env.scenarioName(route.scenario)}` : env.actorLabel(route.actor)
  useEffect(() => { document.title = `${pageTitle} · ${config.brand}` }, [pageTitle, config.brand])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo() }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  useEffect(() => { window.dispatchEvent(new Event('resize')) }, [ui.panel, ui.selectedWidget])

  const selected = config.pages[route.kind].widgets.find((w) => w.id === ui.selectedWidget)
  const withLeft = ui.panel === 'assumptions' && !ui.sidebar
  const withRight = ui.panel === 'settings' || (ui.panel === 'widget' && !!selected)

  return (
    <div className={'app' + (ui.mode === 'consultant' ? ' consultant' : '') + (withLeft ? ' pad-left' : '') + (ui.sidebar ? ' with-side' : '') + (withRight ? ' pad-right' : '')}>
      <TopNav env={env} />
      <main className="page">
        <ModelBanner />
        <ContextBar env={env} />
        <Dashboard key={route.kind} env={env} />
        <footer className="footnote">
          <div>Modèle Excel : <strong>{getModel().meta.fileName}</strong> — {SOURCE_LABEL[getModel().meta.source]}.</div>
          {config.footnote && <div>{config.footnote}</div>}
        </footer>
      </main>
      {ui.sidebar && <HypSidebar env={env} />}
      {ui.panel === 'assumptions' && <AssumptionsDrawer env={env} />}
      {ui.panel === 'settings' && <SettingsDrawer env={env} />}
      {ui.panel === 'widget' && selected && <WidgetSettings wc={selected} env={env} />}
      {ui.typoPanel && <TypographyPanel env={env} />}
      <Toast />
    </div>
  )
}
