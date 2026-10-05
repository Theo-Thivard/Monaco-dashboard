import { useEffect, useRef, useState } from 'react'
import type { FormatKind } from '../core/hypotheses'
import { KPI_BY_ID, kpiValue, kpisForLens, type KpiDef } from '../core/kpis'
import { moveKpi, toggleKpi, setLabel, useUI } from '../state/store'
import type { Env } from './env'
import { Popover } from './Popover'
import { UnitText } from './UnitText'

/** Met en évidence brièvement une valeur qui vient de changer. */
function useFlash(v: number): boolean {
  const prev = useRef(v)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (prev.current === v) return
    prev.current = v
    setOn(true)
    const t = setTimeout(() => setOn(false), 900)
    return () => clearTimeout(t)
  }, [v])
  return on
}

export interface KpiCardProps {
  label: string
  description: string
  format: FormatKind
  cur: number
  env: Env
  emphasis?: boolean
  /** identifiant de la cellule (unité modifiable) */
  unitId?: string
}

/** Carte d'indicateur : libellé et valeur lue directement (pas d'écart : le chiffre se lit tel quel). */
export function KpiCard({ label, description, format, cur, env, emphasis, unitId }: KpiCardProps) {
  const flash = useFlash(cur)
  return (
    <div className={'kpi' + (flash ? ' flash' : '') + (emphasis ? ' emphasis' : '')} title={description}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{env.fmt(format, cur, { unit: false })}<UnitText env={env} id={unitId ?? `kpi:${label}`} def={env.unit(format)} className="kpi-unit" /></div>
    </div>
  )
}

function Card({ def, env }: { def: KpiDef; env: Env }) {
  const { snap } = env
  return (
    <KpiCard
      label={env.label(`kpi:${def.id}`, def.label)} description={def.description} format={def.format}
      cur={kpiValue(def, snap.active, snap.results)} env={env} unitId={`kpi:${def.id}`}
    />
  )
}

export function KpiStrip({ env }: { env: Env }) {
  const { config } = env
  const ui = useUI()
  const shown = kpisForLens(config.kpis.order.filter((id) => config.kpis.visible.includes(id)), env.snap.lens)
  return (
    <div className="kpis-wrap">
      <div className="kpis" style={{ ['--n' as string]: Math.max(1, Math.min(shown.length, 6)) }}>
        {shown.map((id) => <Card key={id} def={KPI_BY_ID[id]} env={env} />)}
        {!shown.length && <p className="empty small">Aucun indicateur sélectionné.</p>}
      </div>
      {ui.mode === 'consultant' && (
        <Popover className="kpi-custom" align="right" trigger={({ toggle, open }) => <button className={'tool' + (open ? ' on' : '')} onClick={toggle}>⚙ Indicateurs</button>}>
          {() => (
            <div className="pop-body">
              <div className="pop-title">Indicateurs affichés</div>
              {(['Demande', 'Structure', 'Incertitude'] as const).map((cat) => (
                <div key={cat} className="cl-group">
                  <div className="cl-head"><span className="cl-title static">{cat}</span></div>
                  {kpisForLens(config.kpis.order, env.snap.lens).map((id) => KPI_BY_ID[id]).filter((k) => k.category === cat).map((k) => (
                    <div key={k.id} className="cl-item kpi-row">
                      <label>
                        <input type="checkbox" checked={config.kpis.visible.includes(k.id)} onChange={() => toggleKpi(k.id)} />
                        <input className="inline-rename" type="text" value={env.label(`kpi:${k.id}`, k.label)} onChange={(e) => setLabel(`kpi:${k.id}`, e.target.value, k.label)} aria-label="Libellé" />
                      </label>
                      <span className="order">
                        <button onClick={() => moveKpi(k.id, -1)} aria-label="Monter">↑</button>
                        <button onClick={() => moveKpi(k.id, 1)} aria-label="Descendre">↓</button>
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Popover>
      )}
    </div>
  )
}
