import { fmtValue, HYPS, SCENARIOS } from '../model'
import { useStore } from '../store'

/** Affiche soit un groupe d'hypothèses (`group`), soit une liste choisie (`ids`). */
export function Sliders({ group, ids }: { group?: string; ids?: string[] }) {
  const { params, setParam, theme } = useStore()
  const hyps = ids ? HYPS.filter((h) => ids.includes(h.id)) : HYPS.filter((h) => h.group === group)
  if (!hyps.length) return <p className="hint">Aucune hypothèse sélectionnée. Ouvrez le menu « ☰ Hypothèses » pour en cocher.</p>
  return (
    <div className="sliders">
      {hyps.map((h) => {
        const vals = params[h.id]
        return (
          <div className="hyp" key={h.id}>
            <div className="hyp-label" title={h.note}>{h.label}{h.note ? ' ⓘ' : ''}</div>
            {vals.map((v, i) => (
              <label className="slider-row" key={i}>
                {!h.single && <span className="dot" style={{ background: theme.scenarioColors[i] }}>{SCENARIOS[i]}</span>}
                <input
                  type="range" min={h.min} max={h.max} step={h.step} value={v}
                  style={{ accentColor: h.single ? theme.blockColors[0] : theme.scenarioColors[i] }}
                  onChange={(e) => setParam(h.id, i, parseFloat(e.target.value))}
                />
                <output>{fmtValue(h.unit, v)}</output>
              </label>
            ))}
            {h.note && <div className="hyp-note">{h.note}</div>}
          </div>
        )
      })}
    </div>
  )
}
