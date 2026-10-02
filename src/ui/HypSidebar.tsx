import { useMemo } from 'react'
import type { WidgetConfig } from '../config/types'
import { DriversWidget } from './DriversWidget'
import type { Env } from './env'

/** Panneau d'hypothèses épinglé à gauche, présent sur toutes les pages ; le reste de l'affichage se décale à droite. */
export function HypSidebar({ env }: { env: Env }) {
  const { route } = env
  // sur une page acteur : seulement les hypothèses qui font varier cet acteur
  const wc: WidgetConfig = useMemo(() => ({ id: 'pinned-hyps', kind: 'drivers', tier: 'client', visible: true, hypSource: route.kind === 'actor' ? 'actor' : 'visible' }), [route.kind])
  return (
    <aside className="hypside" aria-label="Hypothèses">
      <div className="drawer-head">
        <h3>Hypothèses</h3>
      </div>
      <div className="drawer-body"><DriversWidget key={route.kind} wc={wc} env={env} pinned /></div>
    </aside>
  )
}
