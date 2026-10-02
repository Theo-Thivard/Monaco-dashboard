import { ACTOR_BY_ID } from '../core/actors'
import { LENSES, LENS_HINT, LENS_LABEL } from '../core/lens'
import { diffFromDefault, patchUI, resetAssumptions, setLens, setScenario, useAppState } from '../state/store'
import type { Env } from './env'

/** Contexte courant : où suis-je ? (+ sélecteur de scénario sur une page acteur). */
export function ContextBar({ env }: { env: Env }) {
  const { route, snap, tokens } = env
  const s = useAppState((x) => x)
  const n = diffFromDefault(s).assumptions.length
  const colors = [tokens.scen0, tokens.scen1, tokens.scen2]
  const scen = (
    <span className="ctx-scenario"><i className="dot" style={{ background: colors[snap.scenario] }} />{env.scenarioName(snap.scenario)}</span>
  )

  let crumb
  if (route.kind === 'global') crumb = <><strong>Globale</strong><span className="sep">·</span><span className="muted">Vue d'ensemble des trois scénarios</span></>
  else if (route.kind === 'scenario') crumb = <><span className="muted">Scénario</span><span className="sep">/</span><strong>{scen}</strong></>
  else crumb = <><span className="muted">Acteurs</span><span className="sep">/</span><strong>{env.actorLabel(route.actor)}</strong><span className="sep">·</span>{scen}</>
  const description = route.kind === 'actor' ? ACTOR_BY_ID[route.actor].description : ''

  return (
    <div className="contextbar">
      <div className="ctx-left">
        <h1 className="ctx-crumb">{crumb}</h1>
        {description && <p className="ctx-desc">{description}</p>}
      </div>
      <div className="ctx-right">
        <div className="ctx-seg" role="tablist" aria-label="Lecture des résultats">
          <div className="seg lens">
            {LENSES.map((l) => (
              <button key={l} role="tab" aria-selected={snap.lens === l} className={snap.lens === l ? 'on' : ''} onClick={() => setLens(l)} title={LENS_HINT[l]}>{LENS_LABEL[l]}</button>
            ))}
          </div>
        </div>
        {route.kind === 'actor' && (
          <div className="ctx-seg" role="radiogroup" aria-label="Scénario">
            <span className="ctx-label">Scénario</span>
            <div className="seg small">
              {[0, 1, 2].map((i) => (
                <button key={i} role="radio" aria-checked={snap.scenario === i} className={snap.scenario === i ? 'on' : ''} onClick={() => setScenario(i)}>{env.scenarioName(i)}</button>
              ))}
            </div>
          </div>
        )}
        {route.kind !== 'global' && n > 0 && (
          <span className="ctx-mod">
            <button className="link" onClick={() => patchUI({ panel: 'assumptions' })}>{n} hypothèse{n > 1 ? 's' : ''} modifiée{n > 1 ? 's' : ''}</button>
            <button className="link muted" onClick={resetAssumptions} title="Revenir aux valeurs de l'Excel">↺</button>
          </span>
        )}
      </div>
    </div>
  )
}
