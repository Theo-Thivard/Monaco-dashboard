import { useState } from 'react'
import { DEFAULT_DRIVERS } from '../config/defaults'
import { CATEGORIES, defaultParams, HYPS } from '../core/hypotheses'
import { sensitivityFor } from '../core/snapshot'
import type { WidgetConfig } from '../config/types'
import { patchUI, updateWidget, useUI } from '../state/store'
import { actorHypIds } from './PageWidgets'
import { HypControl } from './Controls'
import { HypChecklist } from './HypChecklist'
import type { Env } from './env'
import { Popover } from './Popover'

let needDriversCache: string[] | null = null
/** Six leviers qui pèsent le plus sur le besoin généré (calculés une fois, sur les valeurs de l'Excel, pour que la liste ne bouge pas pendant qu'on joue avec les curseurs). */
function needDrivers(): string[] {
  if (!needDriversCache) {
    const score = new Map<string, number>()
    for (const s of [0, 1, 2]) for (const r of sensitivityFor(defaultParams(), s)) score.set(r.id, (score.get(r.id) ?? 0) + Math.max(Math.abs(r.low), Math.abs(r.high)))
    needDriversCache = [...score].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id)
  }
  return needDriversCache
}

export function DriversWidget({ wc, env }: { wc: WidgetConfig; env: Env }) {
  const ui = useUI()
  const consultant = ui.mode === 'consultant'
  // liste par défaut (non personnalisée) : adaptée à la lentille ; sinon choix de l'utilisateur
  const untouched = env.config.hyps.visible.length === DEFAULT_DRIVERS.length && DEFAULT_DRIVERS.every((id) => env.config.hyps.visible.includes(id))
  const visible = untouched && env.snap.lens === 'need' ? needDrivers() : env.config.hyps.visible
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
