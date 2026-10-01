import { useState } from 'react'
import { CATEGORIES, HYPS } from '../core/hypotheses'
import type { WidgetConfig } from '../config/types'
import { patchUI, updateWidget, useUI } from '../state/store'
import { actorHypIds } from './PageWidgets'
import { HypControl } from './Controls'
import { HypChecklist } from './HypChecklist'
import type { Env } from './env'
import { Popover } from './Popover'

export function DriversWidget({ wc, env }: { wc: WidgetConfig; env: Env }) {
  const ui = useUI()
  const consultant = ui.mode === 'consultant'
  const visible = env.config.hyps.visible
  const [q] = useState('')
  const fromActor = wc.hypSource === 'actor' && env.route.kind === 'actor'
  const ids = fromActor
    ? HYPS.filter((h) => actorHypIds(env.route.kind === 'actor' ? env.route.actor : '').includes(h.id)).map((h) => h.id)
    : HYPS.filter((h) => visible.includes(h.id)).sort((a, b) => visible.indexOf(a.id) - visible.indexOf(b.id)).map((h) => h.id)
  // regroupe par catégorie dès que plusieurs catégories sont visibles
  const cats = CATEGORIES.map((c) => ({ c, ids: ids.filter((id) => HYPS.find((h) => h.id === id)!.category === c.id) })).filter((x) => x.ids.length)
  const grouped = !fromActor && cats.length > 1 && ids.length > 6

  return (
    <div className="drivers">
      <div className="drivers-tools">
        {!fromActor ? <Popover trigger={({ toggle, open }) => <button className={'tool' + (open ? ' on' : '')} onClick={toggle}>☰ Afficher / masquer</button>} className="grow-0">
          {() => (
            <div className="pop-body">
              <div className="pop-title">Hypothèses affichées</div>
              <HypChecklist env={env} query={q} />
              <button className="link" onClick={() => patchUI({ panel: 'assumptions' })}>Ouvrir toutes les hypothèses →</button>
            </div>
          )}
        </Popover> : <span className="muted small">{ids.length} hypothèse{ids.length > 1 ? 's' : ''}</span>}
        {consultant && (
          <label className="chk"><input type="checkbox" checked={!!wc.showAllScenarios} onChange={(e) => updateWidget(wc.id, { showAllScenarios: e.target.checked })} /> 3 scénarios</label>
        )}
      </div>
      {!ids.length && <p className="empty small">Aucune hypothèse affichée. Utilisez « Afficher / masquer ».</p>}
      {grouped
        ? cats.map(({ c, ids: g }) => (
          <section key={c.id}>
            <h4 className="cat">{c.title}</h4>
            {g.map((id) => <HypControl key={id} id={id} env={env} allScenarios={wc.showAllScenarios} consultant={consultant} />)}
          </section>
        ))
        : ids.map((id) => <HypControl key={id} id={id} env={env} allScenarios={wc.showAllScenarios} consultant={consultant} />)}
    </div>
  )
}
