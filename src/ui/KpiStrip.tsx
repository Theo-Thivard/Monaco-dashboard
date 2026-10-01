import { useEffect, useRef, useState } from 'react'
import type { FormatKind } from '../core/hypotheses'
import { KPI_BY_ID, kpiDelta, kpiValue, type KpiDef } from '../core/kpis'
import { moveKpi, toggleKpi, setLabel, useUI } from '../state/store'
import type { Env } from './env'
import { Popover } from './Popover'

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

function deltaText(mode: 'relative' | 'points' | 'absolute', format: FormatKind, d: ReturnType<typeof kpiDelta>, env: Env): { main: string; sub?: string } {
  if (d.direction === 'flat') return { main: '= référence' }
  if (mode === 'points') return { main: env.fmt('pts', d.abs, { sign: true }) }
  if (mode === 'absolute') return { main: env.fmt(format, d.abs, { sign: true }) }
  return { main: env.fmt(format, d.abs, { sign: true }), sub: env.fmt('pct', d.value, { sign: true, decimals: Math.abs(d.value) < 0.1 ? 1 : 0 }) }
}

export interface KpiCardProps {
  label: string
  description: string
  format: FormatKind
  delta: 'relative' | 'points' | 'absolute'
  higherIsBetter: boolean | null
  cur: number
  /** valeur de référence (comparaison) */
  reference: number
  env: Env
  emphasis?: boolean
}

/** Carte d'indicateur : valeur, écart vs référence. Partagée par toutes les pages. */
export function KpiCard({ label, description, format, delta, higherIsBetter, cur, reference, env, emphasis }: KpiCardProps) {
  const d = kpiDelta({ delta, higherIsBetter }, cur, reference)
  const flash = useFlash(cur)
  const t = deltaText(delta, format, d, env)
  const arrow = d.direction === 'up' ? '▲' : d.direction === 'down' ? '▼' : ''
  return (
    <div className={'kpi' + (flash ? ' flash' : '') + (emphasis ? ' emphasis' : '')} title={description}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{env.fmt(format, cur, { unit: false })}<span className="kpi-unit">{env.unit(format)}</span></div>
      <div className={'kpi-delta ' + d.tone}>
        {arrow && <span className="arrow">{arrow}</span>}
        <span>{t.main}</span>{t.sub && <span className="sub">{t.sub}</span>}
      </div>
    </div>
  )
}

function Card({ def, env }: { def: KpiDef; env: Env }) {
  const { snap } = env
  return (
    <KpiCard
      label={env.label(`kpi:${def.id}`, def.label)} description={def.description} format={def.format} delta={def.delta} higherIsBetter={def.higherIsBetter}
      cur={kpiValue(def, snap.active, snap.results)} reference={kpiValue(def, snap.activeRef, snap.refResults)} env={env}
    />
  )
}

export function KpiStrip({ env }: { env: Env }) {
  const { config } = env
  const ui = useUI()
  const shown = config.kpis.order.filter((id) => config.kpis.visible.includes(id) && KPI_BY_ID[id])
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
                  {config.kpis.order.map((id) => KPI_BY_ID[id]).filter((k) => k && k.category === cat).map((k) => (
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
