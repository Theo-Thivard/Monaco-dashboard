import { useEffect } from 'react'
import { applyTheme } from './config/theme'
import { AssumptionsDrawer } from './ui/AssumptionsDrawer'
import { Dashboard } from './ui/Dashboard'
import { Header } from './ui/Header'
import { SettingsDrawer } from './ui/SettingsDrawer'
import { Toast } from './ui/Toast'
import { WidgetSettings } from './ui/WidgetSettings'
import { useEnv } from './ui/env'
import { redo, undo, useUI } from './state/store'

export default function App() {
  const env = useEnv()
  const ui = useUI()
  const { config, tokens } = env

  useEffect(() => { applyTheme(tokens, config.theme.metrics) }, [tokens, config.theme.metrics])

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

  const selected = config.widgets.find((w) => w.id === ui.selectedWidget)
  const withLeft = ui.panel === 'assumptions'
  const withRight = ui.panel === 'settings' || (ui.panel === 'widget' && !!selected)

  return (
    <div className={'app' + (ui.mode === 'consultant' ? ' consultant' : '') + (withLeft ? ' pad-left' : '') + (withRight ? ' pad-right' : '')}>
      <Header env={env} />
      <main className="page">
        <Dashboard env={env} />
        {config.footnote && <footer className="footnote">{config.footnote}</footer>}
      </main>
      {ui.panel === 'assumptions' && <AssumptionsDrawer env={env} />}
      {ui.panel === 'settings' && <SettingsDrawer env={env} />}
      {ui.panel === 'widget' && selected && <WidgetSettings wc={selected} env={env} />}
      <Toast />
    </div>
  )
}
