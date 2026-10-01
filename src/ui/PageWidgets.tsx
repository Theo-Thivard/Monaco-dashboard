import { useMemo } from 'react'
import { ACTOR_BY_ID, actorBlock } from '../core/actors'
import { HYP_BY_ID } from '../core/hypotheses'
import { buildActorHeadline, buildGlobalHeadline, buildHeadline, type Headline as HeadlineData } from '../core/insights'
import { ACTOR_KPI_DEFS } from '../core/kpis'
import { navigate } from '../state/store'
import { KpiCard } from './KpiStrip'
import type { Env } from './env'

const ACTOR_KPIS = ['base', 'need', 'addressable', 'rate', 'weight']

/** Message clé : dépend de la page (globale / scénario / acteur) ; mêmes valeurs et même formateur que partout. */
export function Headline({ env }: { env: Env }) {
  const { route, snap } = env
  const h: HeadlineData = useMemo(() => {
    if (route.kind === 'global') return buildGlobalHeadline(snap, env.f, env.scenarioName, (a) => env.actorLabel(a.id, true))
    if (route.kind === 'actor') return buildActorHeadline(snap, ACTOR_BY_ID[route.actor], env.f, env.scenarioName(snap.scenario), env.actorLabel(route.actor), env.hypLabel)
    return buildHeadline(snap, env.f, env.scenarioName(snap.scenario), env.hypLabel)
  }, [env, route, snap])
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

/** Page Globale : une carte par scénario, cliquable vers la page du scénario. */
export function ScenarioCards({ env }: { env: Env }) {
  const { snap, tokens } = env
  const colors = [tokens.scen0, tokens.scen1, tokens.scen2]
  const max = Math.max(...snap.results.map((r) => r.addressable), 1e-9)
  return (
    <div className="scen-cards">
      {snap.results.map((r, i) => {
        const ref = snap.refResults[i]
        const d = r.addressable - ref.addressable
        const tone = Math.abs(d) < 1e-9 ? 'neutral' : d > 0 ? 'positive' : 'negative'
        return (
          <button key={i} className="scen-card" onClick={() => navigate({ kind: 'scenario', scenario: i })} aria-label={`Ouvrir le scénario ${env.scenarioName(i)}`}>
            <span className="scen-card-head"><i className="dot" style={{ background: colors[i] }} /><span className="scen-name">{env.scenarioName(i)}</span><span className="scen-go">Détail →</span></span>
            <span className="kpi-label">Demande adressable 2035</span>
            <span className="kpi-value">{env.fmt('power', r.addressable, { unit: false })}<span className="kpi-unit">{env.unit('power')}</span></span>
            <span className="scen-bar"><i style={{ width: `${(100 * r.addressable) / max}%`, background: colors[i] }} /></span>
            <span className="scen-meta">Besoin {env.fmt('power', r.total)} · taux {env.fmt('pct', r.rate)}</span>
            <span className={'kpi-delta ' + tone}>{Math.abs(d) < 1e-9 ? '= référence' : `${d > 0 ? '▲' : '▼'} ${env.fmt('power', d, { sign: true })} vs référence`}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Page acteur : indicateurs de l'acteur (scénario actif). */
export function ActorKpis({ env }: { env: Env }) {
  const { snap, route } = env
  if (route.kind !== 'actor') return null
  const id = route.actor
  const cur = { b: actorBlock(snap.active, id), r: snap.active }
  const ref = { b: actorBlock(snap.activeRef, id), r: snap.activeRef }
  return (
    <div className="kpis" style={{ ['--n' as string]: ACTOR_KPIS.length }}>
      {ACTOR_KPI_DEFS.filter((k) => ACTOR_KPIS.includes(k.id)).map((k) => (
        <KpiCard key={k.id} label={env.label(`actorkpi:${k.id}`, k.label)} description={k.description} format={k.format} delta={k.delta} higherIsBetter={k.higherIsBetter}
          cur={k.compute(cur)} reference={k.compute(ref)} env={env} emphasis={k.id === 'addressable'} />
      ))}
    </div>
  )
}

/** Page acteur : description et méthode de calcul de l'acteur (lues dans le registre). */
export function ActorNote({ env }: { env: Env }) {
  const { route } = env
  if (route.kind !== 'actor') return null
  const a = ACTOR_BY_ID[route.actor]
  return (
    <div className="prose">
      <p><strong>{env.actorLabel(a.id)}</strong> — {a.description}</p>
      <p>{a.method}</p>
      <p className="muted">Hypothèses qui font varier cet acteur : {a.hyps.map((id) => env.hypLabel(id)).join(' · ')}.</p>
    </div>
  )
}

export const actorHypIds = (id: string) => ACTOR_BY_ID[id as keyof typeof ACTOR_BY_ID]?.hyps.filter((h) => HYP_BY_ID[h]) ?? []
