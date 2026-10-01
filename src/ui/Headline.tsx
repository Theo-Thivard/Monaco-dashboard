import { useMemo } from 'react'
import { buildHeadline } from '../core/insights'
import type { Env } from './env'

export function Headline({ env }: { env: Env }) {
  const h = useMemo(() => buildHeadline(env.snap, env.f, env.scenarioName(env.snap.scenario), env.hypLabel), [env])
  return (
    <div className="headline">
      <div className="hl-main">
        <div className="kicker">{h.kicker}</div>
        <h2>{h.title.map((p, i) => (p.strong ? <strong key={i}>{p.t}</strong> : <span key={i}>{p.t}</span>))}</h2>
      </div>
      <ul className="hl-bullets">
        {h.bullets.map((b, i) => <li key={i}>{b.map((p, j) => (p.strong ? <strong key={j}>{p.t}</strong> : <span key={j}>{p.t}</span>))}</li>)}
      </ul>
    </div>
  )
}
