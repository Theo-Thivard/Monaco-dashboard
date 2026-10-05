import { useState } from 'react'
import { hypContext, HYP_CONTEXT_LABEL } from '../config/hyps'
import { HYP_BY_ID } from '../core/hypotheses'
import { diffFromDefault, patchUI, resetAssumptions, useAppState, useUI } from '../state/store'
import { HypControl } from './Controls'
import { HypChecklist } from './HypChecklist'
import type { Env } from './env'
import { Drawer } from './fields'

function Row({ id, env }: { id: string; env: Env }) {
  const [open, setOpen] = useState(false)
  const consultant = useUI().mode === 'consultant'
  const h = HYP_BY_ID[id]
  const v = h.single ? env.snap.params[id][0] : env.snap.params[id][env.snap.scenario]
  return (
    <div className="cl-extra">
      <button className="val" onClick={() => setOpen(!open)} aria-expanded={open}>{env.fmtHypValue(id, v)}<span className="chev">{open ? '▴' : '✎'}</span></button>
      {open && <div className="cl-control"><HypControl id={id} env={env} consultant={consultant} /></div>}
    </div>
  )
}

/** Toutes les hypothèses : cocher = afficher dans le dashboard ; ✎ = modifier ici. */
export function AssumptionsDrawer({ env }: { env: Env }) {
  const [q, setQ] = useState('')
  const state = useAppState((x) => x)
  const rows = diffFromDefault(state).assumptions
  const ctx = hypContext(env.route, env.snap.lens)
  const ctxName = env.route.kind === 'actor' ? env.actorLabel(env.route.actor) : HYP_CONTEXT_LABEL[ctx]
  return (
    <Drawer title="Hypothèses du modèle" side="left" onClose={() => patchUI({ panel: null })}>
      <input className="search" type="search" placeholder="Rechercher une hypothèse…" value={q} onChange={(e) => setQ(e.target.value)} />
      {rows.length > 0 && (
        <div className="changes">
          <div className="changes-title">Modifiées par rapport à l'Excel</div>
          {rows.map((r) => (
            <div key={`${r.id}:${r.scenario}`} className="change-row">
              <span>{env.hypLabel(r.id)}{r.scenario !== null ? ` (${env.scenarioName(r.scenario)})` : ''}</span>
              <span className="muted">{env.fmtHypValue(r.id, r.from)} → <b>{env.fmtHypValue(r.id, r.to)}</b></span>
            </div>
          ))}
          <button className="link" onClick={resetAssumptions}>Tout remettre aux valeurs de l'Excel</button>
        </div>
      )}
      <p className="drawer-help">Cochez les hypothèses à afficher dans le bandeau d'hypothèses de « {ctxName} » (chaque lecture et chaque acteur a le sien). ✎ permet de modifier la valeur directement ici.</p>
      <HypChecklist env={env} ctx={ctx} query={q} renderExtra={(id) => <Row id={id} env={env} />} />
    </Drawer>
  )
}
