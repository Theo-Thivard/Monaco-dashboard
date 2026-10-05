import { useEffect, useState } from 'react'
import { fmtHyp } from '../core/format'
import { isDeadHyp } from '../core/actors'
import { defaultParams, HYP_BY_ID, hypValue, type HypDef } from '../core/hypotheses'
import type { HypMode } from '../config/types'
import { resetParam, setLabel, setParam, setParamTogether, updateConfig, useAppState } from '../state/store'
import type { Env } from './env'

/** Valeur affichée dans le champ : pourcentages en points de %, le reste tel quel. */
const toField = (h: HypDef, v: number) => (h.unit === 'pct' ? v * 100 : v)
const fromField = (h: HypDef, x: number) => (h.unit === 'pct' ? x / 100 : x)
const decimals = (h: HypDef) => (h.unit === 'pct' ? (h.step < 0.01 ? 1 : 0) : h.unit === 'ratio' ? 2 : 0)
const unitText = (h: HypDef) => (h.unit === 'pct' ? '%' : h.unit === 'watt' ? 'W' : h.unit === 'ratio' ? '×' : '')

/** Champ numérique : on tape librement, la valeur n'est validée qu'à Entrée / sortie du champ. */
function NumField({ h, value, onCommit }: { h: HypDef; value: number; onCommit: (v: number) => void }) {
  const shown = toField(h, value).toFixed(decimals(h))
  const [draft, setDraft] = useState<string | null>(null)
  useEffect(() => setDraft(null), [value])
  const commit = () => {
    if (draft === null) return
    const x = parseFloat(draft.replace(',', '.'))
    setDraft(null)
    if (Number.isFinite(x)) onCommit(Math.min(h.max, Math.max(h.min, fromField(h, x))))
  }
  return (
    <span className="numfield">
      <input
        inputMode="decimal" value={draft ?? shown} aria-label="Valeur"
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setDraft(null) }}
        onFocus={(e) => e.target.select()}
      />
      <span className="unit">{unitText(h)}</span>
    </span>
  )
}

export function SliderRow({ h, idx, color, name, together }: { h: HypDef; idx: number; color?: string; name?: string; together?: boolean }) {
  const apply = (x: number) => (together ? setParamTogether(h.id, x, idx) : setParam(h.id, x, idx))
  const params = useAppState((s) => s.params)
  const i = h.single ? 0 : idx
  const v = params[h.id][i]
  const ref = defaultParams()[h.id][i]
  const at = (x: number) => `calc(8px + (100% - 16px) * ${(x - h.min) / (h.max - h.min)})`
  return (
    <div className="slider-row">
      {name && <span className="scen-dot" style={{ background: color }} title={name}>{name}</span>}
      <div className="range" style={{ ['--pct' as string]: at(v) }}>
        <input type="range" min={h.min} max={h.max} step={h.step} value={v} aria-label={h.label} onChange={(e) => apply(parseFloat(e.target.value))} />
        <span className="ref-tick" style={{ left: at(ref) }} title="Valeur de l'Excel" />
      </div>
      <NumField h={h} value={v} onCommit={apply} />
    </div>
  )
}

function RadioGroup({ h, value, onChange }: { h: HypDef; value: number; onChange: (v: number) => void }) {
  return (
    <div className="seg small" role="radiogroup" aria-label={h.label}>
      {h.options!.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={value} aria-label={label} className={'switch' + (value ? ' on' : '')} onClick={() => onChange(!value)}><span /></button>
}

interface Props { id: string; env: Env; mode?: HypMode; consultant?: boolean }

/** Contrôle d'une hypothèse : valeur, bornes, référence, impact sur le résultat, source. */
export function HypControl({ id, env, mode = 'together', consultant }: Props) {
  const allScenarios = mode === 'three'
  const together = mode === 'together'
  const h = HYP_BY_ID[id]
  const { snap, f, tokens } = env
  // « les 3 ensemble » : le curseur et l'encadré montrent la valeur du scénario Central ; les autres suivent proportionnellement
  const s = together ? 1 : snap.scenario
  const [open, setOpen] = useState(false)
  const note = env.config.hyps.notes[id]
  const v = hypValue(snap.params, id, s)
  const orig = defaultParams()
  const ref = hypValue(orig, id, s)
  const changed = snap.params[id].some((x, k) => x !== orig[id][k])
  const sens = snap.sensitivity.find((r) => r.id === id)
  const delta = v - ref
  const scenColors = [tokens.scen0, tokens.scen1, tokens.scen2]

  return (
    <div className={'hyp' + (changed ? ' changed' : '')}>
      <div className="hyp-head">
        <button className="hyp-name" onClick={() => setOpen(!open)} aria-expanded={open} title="Afficher la source et le contexte">
          {env.hypLabel(id)}{isDeadHyp(id) && <span className="dead" title="Sans effet dans l'Excel actuel"> ⚠</span>}<span className="chev">{open ? '▴' : '▾'}</span>
        </button>
        {changed && <button className="reset" onClick={() => (h.single ? resetParam(id) : [0, 1, 2].forEach((k) => resetParam(id, k)))} title="Revenir à la valeur de l'Excel">↺</button>}
      </div>

      {h.control === 'radio' ? (
        <RadioGroup h={h} value={snap.params[id][0]} onChange={(x) => setParam(id, x)} />
      ) : h.control === 'toggle' ? (
        <Toggle value={snap.params[id][0] === 1} onChange={(b) => setParam(id, b ? 1 : 0)} label={h.label} />
      ) : allScenarios && !h.single ? (
        [0, 1, 2].map((k) => <SliderRow key={k} h={h} idx={k} color={scenColors[k]} name={env.scenarioName(k)} />)
      ) : (
        <SliderRow h={h} idx={s} together={together && !h.single} />
      )}
      {together && !h.single && h.control === 'slider' && <div className="hyp-together">Valeur du Central · les autres scénarios varient dans les mêmes proportions</div>}

      {h.control === 'slider' && (
        <div className="hyp-meta">
          <span>{changed && !(allScenarios && !h.single) && delta !== 0
            ? <b className="chg">{h.unit === 'pct' ? env.fmt('pts', delta, { sign: true, decimals: 1 }) : (delta > 0 ? '+' : '−') + fmtHyp(h.unit, Math.abs(delta), f)} vs Excel ({fmtHyp(h.unit, ref, f)})</b>
            : <>Excel : {fmtHyp(h.unit, ref, f)}</>}</span>
          {sens && !allScenarios && (
            <span className="impact" title={`Effet sur le résultat 2035 quand l'hypothèse passe de ${env.fmtHypValue(id, sens.lowVal)} à ${env.fmtHypValue(id, sens.highVal)}`}>
              {env.fmt('power', sens.low, { sign: true, unit: false })} / {env.fmt('power', sens.high, { sign: true })}
            </span>
          )}
        </div>
      )}

      {open && (
        <div className="hyp-more">
          <p>{h.description}</p>
          <dl>
            <dt>Plage</dt><dd>{fmtHyp(h.unit, h.min, f)} – {fmtHyp(h.unit, h.max, f)}</dd>
            <dt>Valeur Excel</dt><dd>{h.def.map((x) => env.fmtHypValue(id, x)).join(' · ')}{h.single ? '' : ' (Bas · Central · Haut)'}</dd>
            <dt>Source</dt><dd>{h.source}{h.excelRow !== '—' ? ` (ligne ${h.excelRow})` : ''}</dd>
          </dl>
          {h.note && <p className="warn">{h.note}</p>}
          {isDeadHyp(id) && <p className="warn">Sans effet dans l'Excel actuel : cette hypothèse n'intervient plus dans les résultats (formule modifiée).</p>}
          {consultant ? (
            <textarea className="note-edit" placeholder="Note du consultant sur cette hypothèse…" value={note ?? ''} rows={2}
              onChange={(e) => updateConfig((c) => ({ ...c, hyps: { ...c.hyps, notes: { ...c.hyps.notes, [id]: e.target.value } } }))} />
          ) : note ? <p className="note">{note}</p> : null}
          {consultant && (
            <label className="rename">Libellé
              <input type="text" value={env.hypLabel(id)} onChange={(e) => setLabel(`hyp:${id}`, e.target.value, h.label)} />
            </label>
          )}
        </div>
      )}
    </div>
  )
}
