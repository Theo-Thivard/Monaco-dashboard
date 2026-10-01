import { SCENARIOS } from '../model'
import { useStore } from '../store'

const f2 = (v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const sign = (v: number) => (Math.abs(v) < 0.005 ? '' : (v > 0 ? '+' : '−') + f2(Math.abs(v)))

export function Kpi() {
  const { results, reference, theme } = useStore()
  return (
    <div className="kpis">
      {results.map((r, i) => {
        const ref = reference[i]
        const dAdr = (r.addressable - ref.addressable) / 1000
        const dTot = (r.total - ref.total) / 1000
        return (
          <div className="kpi" key={i} style={{ borderTopColor: theme.scenarioColors[i] }}>
            <div className="kpi-title">Scénario {SCENARIOS[i]}</div>
            <div className="kpi-main">{f2(r.addressable / 1000)}<small> MW adressables</small></div>
            {sign(dAdr) && <div className={'kpi-delta ' + (dAdr > 0 ? 'up' : 'down')}>{sign(dAdr)} MW vs Excel</div>}
            <div className="kpi-rows">
              <span>Besoin total 2035</span><b>{f2(r.total / 1000)} MW{sign(dTot) && <i> ({sign(dTot)})</i>}</b>
              <span>Taux adressable</span><b>{(r.rate * 100).toFixed(1)} %</b>
              <span>Croissance 2026→2035</span><b>× {r.growth.toFixed(2)}</b>
            </div>
          </div>
        )
      })}
    </div>
  )
}
