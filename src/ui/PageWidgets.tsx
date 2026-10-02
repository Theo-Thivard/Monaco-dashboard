import { useMemo } from 'react'
import { ACTOR_BY_ID, actorBlock, actorHyps } from '../core/actors'
import { HYP_BY_ID } from '../core/hypotheses'
import { buildActorHeadline, buildGlobalHeadline, buildHeadline, type Headline as HeadlineData } from '../core/insights'
import { ACTOR_KPI_DEFS } from '../core/kpis'
import { getModel } from '../core/model'
import { navigate } from '../state/store'
import { KpiCard } from './KpiStrip'
import type { Env } from './env'

const ACTOR_KPIS_NEED = ['base', 'need', 'growth', 'weightNeed']
const ACTOR_KPIS_ADDR = ['need', 'addressable', 'rate', 'weight']

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

/** Page Globale : les trois scénarios regroupés dans un seul panneau, chiffres en grand, chaque colonne ouvre la page du scénario. */
export function ScenarioCards({ env }: { env: Env }) {
  const { snap, tokens } = env
  const colors = [tokens.scen0, tokens.scen1, tokens.scen2]
  const need = snap.lens === 'need'
  const value = (r: (typeof snap.results)[number]) => (need ? r.total : r.addressable)
  const max = Math.max(...snap.results.map(value), 1e-9)
  return (
    <div className="scen-panel" role="group" aria-label={need ? 'Besoin IT 2035 par scénario' : 'Demande adressable 2035 par scénario'}>
      <div className="scen-panel-title">{need ? 'Besoin IT généré à Monaco en 2035' : 'Demande adressable à Monaco en 2035'}</div>
      <div className="scen-cols">
        {snap.results.map((r, i) => (
          <button key={i} className="scen-col" onClick={() => navigate({ kind: 'scenario', scenario: i })} aria-label={`Ouvrir le scénario ${env.scenarioName(i)}`}>
            <span className="scen-card-head"><i className="dot" style={{ background: colors[i] }} /><span className="scen-name">{env.scenarioName(i)}</span><span className="scen-go">Détail →</span></span>
            <span className="kpi-value">{env.fmt('power', value(r), { unit: false })}<span className="kpi-unit">{env.unit('power')}</span></span>
            <span className="scen-bar"><i style={{ width: `${(100 * value(r)) / max}%`, background: colors[i] }} /></span>
            <span className="scen-meta">
              {need ? <>2026 : {env.fmt('power', r.base)} · <strong>{env.fmt('pct', r.growth - 1, { sign: true, decimals: 0 })}</strong> d'ici 2035</> : <>Besoin {env.fmt('power', r.total)} · taux {env.fmt('pct', r.rate)}</>}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Page acteur : indicateurs de l'acteur (scénario actif), selon la lentille. */
export function ActorKpis({ env }: { env: Env }) {
  const { snap, route } = env
  if (route.kind !== 'actor') return null
  const id = route.actor
  const cur = { b: actorBlock(snap.active, id), r: snap.active }
  const ids = snap.lens === 'need' ? ACTOR_KPIS_NEED : ACTOR_KPIS_ADDR
  const defs = ACTOR_KPI_DEFS.filter((k) => ids.includes(k.id))
  return (
    <div className="kpis" style={{ ['--n' as string]: defs.length }}>
      {defs.map((k) => (
        <KpiCard key={k.id} label={env.label(`actorkpi:${k.id}`, k.label)} description={k.description} format={k.format}
          cur={k.compute(cur)} env={env} emphasis={k.id === (snap.lens === 'need' ? 'need' : 'addressable')} />
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
      <ActorFormulas env={env} actor={a.id} />
      <p className="muted">Hypothèses qui font varier cet acteur : {actorHyps(a.id).map((id) => env.hypLabel(id)).join(' · ')}.</p>
    </div>
  )
}

export const actorHypIds = (id: string) => (ACTOR_BY_ID[id as keyof typeof ACTOR_BY_ID] ? actorHyps(id as keyof typeof ACTOR_BY_ID).filter((h) => HYP_BY_ID[h]) : [])

/** Formules de l'Excel qui calculent cet acteur (lues dans le classeur : elles suivent toute modification). */
function ActorFormulas({ env, actor }: { env: Env; actor: import('../core/engine').Entity }) {
  const m = getModel()
  const s = env.snap.scenario
  const rows: [string, 'need' | 'ia' | 'addressable'][] = [['Besoin hors IA 2035', 'need'], ['Besoin IA', 'ia'], ['Demande adressable', 'addressable']]
  return (
    <div className="formulas">
      <div className="muted small">Formules de l'Excel pour cet acteur (scénario {env.scenarioName(s)}) :</div>
      {rows.map(([label, col]) => {
        const f = m.formulaFor(s, actor, col)
        return <div key={col} className="formula-row"><span>{label}</span><code>{f.formula ? `=${f.formula}` : '(valeur saisie)'}</code><span className="muted small">{f.where}</span></div>
      })}
    </div>
  )
}
