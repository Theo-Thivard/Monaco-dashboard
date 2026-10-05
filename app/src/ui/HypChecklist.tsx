import { useState } from 'react'
import { hypsAvailable, hypsOf } from '../config/hyps'
import { CATEGORIES, HYPS } from '../core/hypotheses'
import { setHypsVisible, toggleHypVisible } from '../state/store'
import type { Env } from './env'

/** Cases à cocher des hypothèses, par catégorie : « Afficher / masquer » le bandeau du contexte `ctx` (Besoins générés, Besoins adressables ou un acteur). */
export function HypChecklist({ env, ctx, query = '', renderExtra }: { env: Env; ctx: string; query?: string; renderExtra?: (id: string) => React.ReactNode }) {
  const visible = hypsOf(env.config, ctx)
  const available = hypsAvailable(ctx)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const q = query.trim().toLowerCase()
  return (
    <div className="checklist">
      {CATEGORIES.map((c) => {
        const items = HYPS.filter((h) => available.includes(h.id) && h.category === c.id && (!q || env.hypLabel(h.id).toLowerCase().includes(q)))
        if (!items.length) return null
        const ids = items.map((h) => h.id)
        const n = ids.filter((id) => visible.includes(id)).length
        const all = n === ids.length
        const open = q ? true : !collapsed[c.id]
        return (
          <div key={c.id} className="cl-group">
            <div className="cl-head">
              <button className="cl-title" onClick={() => setCollapsed({ ...collapsed, [c.id]: open })}>{open ? '▾' : '▸'} {c.title} <span className="count">{n}/{ids.length}</span></button>
              <button className="link" onClick={() => setHypsVisible(ctx, all ? visible.filter((x) => !ids.includes(x)) : Array.from(new Set([...visible, ...ids])))}>{all ? 'Aucune' : 'Toutes'}</button>
            </div>
            {open && items.map((h) => (
              <div key={h.id} className="cl-item">
                <label>
                  <input type="checkbox" checked={visible.includes(h.id)} onChange={() => toggleHypVisible(ctx, h.id)} />
                  <span>{env.hypLabel(h.id)}</span>
                </label>
                {renderExtra?.(h.id)}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
