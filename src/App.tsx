import { useMemo, useRef, useState } from 'react'
import GridLayout, { WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { CATALOG } from './catalog'
import { SCENARIOS } from './model'
import { useStore, type WidgetCfg } from './store'
import { themeColors, WidgetBody } from './widgets/registry'
import { SettingsPanel } from './SettingsPanel'
import { HypMenu } from './HypMenu'

const Grid = WidthProvider(GridLayout)

function Widget({ cfg }: { cfg: WidgetCfg }) {
  const { edit, selected, select, theme, results, removeWidget } = useStore()
  const tc = themeColors(theme.mode)
  const fg = cfg.fg ?? tc.fg
  const style = { background: cfg.bg, color: cfg.fg } as React.CSSProperties
  void results
  return (
    <div
      className={'widget' + (edit && selected === cfg.id ? ' selected' : '')}
      style={style}
      onMouseDown={() => edit && select(cfg.id)}
    >
      <div className={'widget-head' + (edit ? ' drag-handle' : '')} style={{ background: cfg.headerBg }}>
        <span className="widget-title">{cfg.title}</span>
        {edit && (
          <span className="widget-tools" onMouseDown={(e) => e.stopPropagation()}>
            <button title="Réglages" onClick={() => select(cfg.id)}>⚙</button>
            <button title="Supprimer" onClick={() => removeWidget(cfg.id)}>✕</button>
          </span>
        )}
      </div>
      <div className="widget-body">
        <WidgetBody cfg={cfg} fg={fg} />
      </div>
    </div>
  )
}

export default function App() {
  const s = useStore()
  const [menu, setMenu] = useState(false)
  const [globalOpen, setGlobalOpen] = useState(false)
  const [hypOpen, setHypOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const sel = s.widgets.find((w) => w.id === s.selected)
  const layout = useMemo(() => s.layout.map((l) => ({ ...l, minW: 1, minH: 2 })), [s.layout])

  const download = () => {
    const blob = new Blob([s.exportConfig()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'monaco-dashboard-config.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const onImport = async (f?: File) => {
    if (!f) return
    try { s.importConfig(await f.text()) } catch { alert('Fichier de configuration invalide') }
  }

  return (
    <div className={'app ' + s.theme.mode}>
      <header className="topbar">
        <h1>Monaco – Besoins IT à l'horizon 2035</h1>
        <div className="topbar-spacer" />
        <div className="seg" title="Scénario affiché par les graphiques « scénario global »">
          {SCENARIOS.map((n, i) => (
            <button key={n} className={s.activeScenario === i ? 'on' : ''} style={s.activeScenario === i ? { background: s.theme.scenarioColors[i], color: '#111' } : undefined} onClick={() => s.setActiveScenario(i)}>{n}</button>
          ))}
        </div>
        <button onClick={() => setHypOpen(!hypOpen)} className={hypOpen ? 'primary' : ''} title="Choisir les hypothèses affichées">☰ Hypothèses</button>
        <button onClick={s.resetParams} title="Remettre toutes les hypothèses aux valeurs de l'Excel">↺ Hypothèses Excel</button>
        <button className={s.edit ? 'primary' : ''} onClick={() => { s.setEdit(!s.edit); s.select(null); setMenu(false) }}>{s.edit ? '✓ Terminer la mise en page' : '✎ Modifier la mise en page'}</button>
        <button onClick={() => setGlobalOpen(!globalOpen)} title="Thème, couleurs, import / export">⚙ Options</button>
      </header>

      {s.edit && (
        <div className="editbar">
          <span>Mode édition : glissez l'en-tête pour déplacer, tirez n'importe quel bord ou coin pour redimensionner, ⚙ pour la taille exacte, le titre et les couleurs.</span>
          <label className="free" title="Désactive le compactage automatique : les widgets restent là où vous les posez">
            <input type="checkbox" checked={s.freeLayout} onChange={(e) => s.setFreeLayout(e.target.checked)} /> Placement libre
          </label>
          <div className="menu">
            <button onClick={() => setMenu(!menu)}>＋ Ajouter un widget</button>
            {menu && (
              <div className="menu-pop">
                {(['curseurs', 'graphique', 'tableau'] as const).map((k) => (
                  <div key={k}>
                    <div className="menu-h">{k}</div>
                    {Object.entries(CATALOG).filter(([, c]) => c.kind === k).map(([key, c]) => (
                      <button key={key} className="menu-i" onClick={() => { s.addWidget(key); setMenu(false) }} title={c.desc}>{c.title}<small>{c.desc}</small></button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <main className={s.edit ? 'editing' : ''}>
        <Grid
          className="grid"
          cols={24}
          rowHeight={30}
          margin={[10, 10]}
          layout={layout}
          isDraggable={s.edit}
          isResizable={s.edit}
          draggableHandle=".drag-handle"
          onLayoutChange={s.setLayout}
          compactType={s.freeLayout ? null : 'vertical'}
          preventCollision={s.freeLayout}
          resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
        >
          {s.widgets.map((w) => (
            <div key={w.id}><Widget cfg={w} /></div>
          ))}
        </Grid>
      </main>

      {hypOpen && <HypMenu onClose={() => setHypOpen(false)} />}
      {s.edit && sel && <SettingsPanel mode="widget" cfg={sel} onClose={() => s.select(null)} />}
      {globalOpen && (
        <SettingsPanel mode="global" onClose={() => setGlobalOpen(false)} onExport={download} onImport={() => fileRef.current?.click()} />
      )}
      <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}
