import { useState } from 'react'
import { HYP_BY_ID } from '../core/hypotheses'
import { patchUI, resetAssumptions, useUI } from '../state/store'
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
  const { snap } = env
  const rows = snap.changes.rows
  return (
    <Drawer title="Hypothèses du modèle" side="left" onClose={() => patchUI({ panel: null })}>
      <input className="search" type="search" placeholder="Rechercher une hypothèse…" value={q} onChange={(e) => setQ(e.target.value)} />
      {rows.length > 0 && (
        <div className="changes">
          <div className="changes-title">Modifiées vs référence ({env.scenarioName(snap.scenario)})</div>
          {rows.map((r) => (
            <div key={r.id} className="change-row">
              <span>{env.hypLabel(r.id)}</span>
              <span className="muted">{env.fmtHypValue(r.id, r.from)} → <b>{env.fmtHypValue(r.id, r.to)}</b></span>
              <span className={'imp ' + (r.delta > 0 ? 'positive' : r.delta < 0 ? 'negative' : 'neutral')}>{env.fmt('power', r.delta, { sign: true })}</span>
            </div>
          ))}
          <button className="link" onClick={resetAssumptions}>Tout remettre aux valeurs d'origine</button>
        </div>
      )}
      <p className="drawer-help">Cochez les hypothèses à afficher dans « Hypothèses clés ». ✎ permet de modifier la valeur directement ici.</p>
      <HypChecklist env={env} query={q} renderExtra={(id) => <Row id={id} env={env} />} />
    </Drawer>
  )
}
