import { useEffect, useMemo, useState } from 'react'
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { setLayout, useUI } from '../state/store'
import type { Env } from './env'
import { WidgetFrame } from './WidgetFrame'

const Grid = WidthProvider(GridLayout)

function useNarrow(limit = 900) {
  const [narrow, setNarrow] = useState(() => window.innerWidth < limit)
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < limit)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [limit])
  return narrow
}

export function Dashboard({ env }: { env: Env }) {
  const ui = useUI()
  const narrow = useNarrow()
  const { config } = env
  const page = config.pages[env.route.kind]
  const m = config.theme.metrics

  // en édition, tout le dashboard est déplié : les positions enregistrées restent cohérentes
  const edit = ui.editLayout
  const shown = useMemo(
    () => page.widgets.filter((w) => w.visible && (w.tier === 'client' || edit || ui.expanded[w.tier])),
    [page.widgets, ui.expanded, edit],
  )
  const layout: Layout[] = useMemo(() => {
    const byId = new Map(page.layout.map((l) => [l.i, l]))
    return shown.map((w, k) => ({ ...(byId.get(w.id) ?? { i: w.id, x: 0, y: 1000 + k, w: 12, h: 8 }), i: w.id, minW: 2, minH: 2 }))
  }, [page.layout, shown])

  if (narrow) {
    const ordered = [...layout].sort((a, b) => a.y - b.y || a.x - b.x)
    return (
      <div className="stack" style={{ gap: m.gap }}>
        {ordered.map((l) => {
          const wc = shown.find((w) => w.id === l.i)!
          const auto = ['section', 'headline', 'kpis', 'scenarioCards', 'actorKpis'].includes(wc.kind)
          return <div key={l.i} className="stack-item" style={auto ? undefined : { height: Math.max(260, l.h * m.rowHeight + (l.h - 1) * m.gap) }}><WidgetFrame wc={wc} env={env} /></div>
        })}
      </div>
    )
  }

  return (
    <Grid
      className={'grid' + (edit ? ' editing' : '')}
      cols={24}
      rowHeight={m.rowHeight}
      margin={[m.gap, m.gap]}
      containerPadding={[0, 0]}
      layout={layout}
      isDraggable={edit}
      isResizable={edit}
      draggableHandle=".drag-handle"
      draggableCancel=".wtools,.card-tools,input,select,textarea,button:not(.grip)"
      onLayoutChange={(l) => { if (edit) setLayout(l) }}
      compactType="vertical"
      resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
      useCSSTransforms
    >
      {shown.map((w) => (
        <div key={w.id}><WidgetFrame wc={w} env={env} /></div>
      ))}
    </Grid>
  )
}
