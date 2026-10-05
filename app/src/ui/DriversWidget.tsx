import { useState } from 'react'
import { hypContext, hypsOf, HYP_CONTEXT_LABEL } from '../config/hyps'
import { CATEGORIES, HYPS } from '../core/hypotheses'
import type { HypMode, WidgetConfig } from '../config/types'
import { patchUI, resetHypSet, updateWidget, useUI } from '../state/store'
import { HypControl } from './Controls'
import { HypChecklist } from './HypChecklist'
import type { Env } from './env'
import { Popover } from './Popover'

/** Bandeau d'hypothèses : un bandeau par contexte (Besoins générés, Besoins adressables, chaque acteur), avec sa propre liste « Afficher / masquer ». */
export function DriversWidget({ wc, env, pinned }: { wc: WidgetConfig; env: Env; pinned?: boolean }) {
  const [localMode, setLocalMode] = useState<HypMode>(env.route.kind === 'global' ? 'three' : 'together')
  const mode: HypMode = pinned ? localMode : wc.hypMode === 'three' || (!wc.hypMode && wc.showAllScenarios) ? 'three' : 'together'
  const setMode = (m: HypMode) => (pinned ? setLocalMode(m) : updateWidget(wc.id, { hypMode: m, showAllScenarios: undefined }))
  const ui = useUI()
  const consultant = ui.mode === 'consultant'
  const ctx = hypContext(env.route, env.snap.lens)
  const ids = HYPS.filter((h) => hypsOf(env.config, ctx).includes(h.id)).sort((a, b) => hypsOf(env.config, ctx).indexOf(a.id) - hypsOf(env.config, ctx).indexOf(b.id)).map((h) => h.id)
  const custom = !!env.config.hyps.sets[ctx]
  const name = env.route.kind === 'actor' ? env.actorLabel(env.route.actor) : env.label(`lens:${ctx}`, HYP_CONTEXT_LABEL[ctx])
  // regroupe par catégorie dès que plusieurs catégories sont visibles
  const cats = CATEGORIES.map((c) => ({ c, ids: ids.filter((id) => HYPS.find((h) => h.id === id)!.category === c.id) })).filter((x) => x.ids.length)
  const grouped = cats.length > 1 && ids.length > 6

  return (
    <div className="drivers">
      <div className="drivers-band" title="Chaque bandeau a sa propre liste d'hypothèses">Hypothèses · {name}</div>
      <div className="drivers-tools">
        <Popover trigger={({ toggle, open }) => <button className={'tool' + (open ? ' on' : '')} onClick={toggle}>☰ Afficher / masquer</button>} className="grow-0">
          {() => (
            <div className="pop-body">
              <div className="pop-title">Hypothèses affichées · {name}</div>
              <HypChecklist env={env} ctx={ctx} />
              {custom && <button className="link" onClick={() => resetHypSet(ctx)}>Revenir à la liste par défaut</button>}
              <button className="link" onClick={() => patchUI({ panel: 'assumptions' })}>Ouvrir toutes les hypothèses →</button>
            </div>
          )}
        </Popover>
        {(consultant || pinned) && (
          <div className="mode-group">
            <span className="mode-label">Curseurs des 3 scénarios</span>
            <div className="seg small mode-seg" role="radiogroup" aria-label="Curseurs des 3 scénarios">
              {([['together', 'Groupés'], ['three', 'Indépendants']] as [HypMode, string][]).map(([m, label]) => (
                <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}
                  title={m === 'together' ? 'Un seul curseur (valeur du scénario Central) : les trois scénarios varient du même pourcentage' : 'Un curseur par scénario : chacun se règle séparément'}>{label}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      {!ids.length && <p className="empty small">Aucune hypothèse affichée. Utilisez « Afficher / masquer ».</p>}
      {grouped
        ? cats.map(({ c, ids: g }) => (
          <section key={c.id}>
            <h4 className="cat">{c.title}</h4>
            {g.map((id) => <HypControl key={id} id={id} env={env} mode={mode} consultant={consultant} />)}
          </section>
        ))
        : ids.map((id) => <HypControl key={id} id={id} env={env} mode={mode} consultant={consultant} />)}
    </div>
  )
}
