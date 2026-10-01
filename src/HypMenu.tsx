import { useState } from 'react'
import { fmtValue, GROUPS, HYPS, SCENARIOS } from './model'
import { useStore } from './store'

/** Liste de toutes les hypothèses : on coche celles à afficher dans le widget « Hypothèses sélectionnées ». */
export function HypMenu({ onClose }: { onClose: () => void }) {
  const { shownHyps, toggleHyp, setShownHyps, params, widgets } = useStore()
  const [q, setQ] = useState('')
  const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const match = (label: string) => !q || norm(label).includes(norm(q))
  const hasWidget = widgets.some((w) => w.type === 'hyps')

  return (
    <aside className="panel left">
      <div className="panel-head"><b>Hypothèses ({shownHyps.length}/{HYPS.length} affichées)</b><button onClick={onClose}>✕</button></div>
      <input className="search" type="text" placeholder="Rechercher une hypothèse…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="btns row">
        <button onClick={() => setShownHyps(HYPS.map((h) => h.id))}>Tout</button>
        <button onClick={() => setShownHyps([])}>Aucune</button>
      </div>
      {!hasWidget && shownHyps.length === 0 && <p className="hint">Cochez une hypothèse : le widget « Hypothèses sélectionnées » sera recréé automatiquement.</p>}
      {GROUPS.map((g) => {
        const items = HYPS.filter((h) => h.group === g.id && match(h.label))
        if (!items.length) return null
        const all = items.every((h) => shownHyps.includes(h.id))
        return (
          <div key={g.id} className="hgroup">
            <div className="hgroup-head">
              <span>{g.title}</span>
              <button className="link" onClick={() => {
                const ids = items.map((h) => h.id)
                setShownHyps(all ? shownHyps.filter((x) => !ids.includes(x)) : Array.from(new Set([...shownHyps, ...ids])))
              }}>{all ? 'masquer' : 'afficher'}</button>
            </div>
            {items.map((h) => (
              <label key={h.id} className="hitem">
                <input type="checkbox" checked={shownHyps.includes(h.id)} onChange={() => toggleHyp(h.id)} />
                <span>
                  {h.label}
                  <small>{h.single ? fmtValue(h.unit, params[h.id][0]) : params[h.id].map((v, i) => `${SCENARIOS[i][0]} ${fmtValue(h.unit, v)}`).join(' · ')}</small>
                </span>
              </label>
            ))}
          </div>
        )
      })}
    </aside>
  )
}
