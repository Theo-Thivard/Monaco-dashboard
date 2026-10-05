// Message clé généré à partir de l'instantané (mêmes valeurs, même formateur
// que les KPI et les graphiques).

import { ACTORS, actorBlock, type ActorDef } from './actors'
import { groupBlocks } from './engine'
import { fmt, type FormatSettings } from './format'
import { KPI_BY_ID, kpiValue } from './kpis'
import { lensValue } from './lens'
import { sensitivityFor, type Snapshot } from './snapshot'

export type Part = { t: string; strong?: boolean }
export interface Headline { kicker: string; title: Part[]; bullets: Part[][] }

const P = (t: string, strong = false): Part => ({ t, strong })

/** Message clé d'une page Scénario. */
export function buildHeadline(snap: Snapshot, f: FormatSettings, hypLabel: (id: string) => string): Headline {
  const r = snap.active
  const need = snap.lens === 'need'
  const title: Part[] = need
    ? [P('Le besoin IT généré à Monaco atteint '), P(fmt('power', r.total, f), true), P(' en 2035, soit '), P(fmt('ratio', r.growth, f), true), P(' le niveau de 2026 ('), P(fmt('power', r.base, f), true), P(').')]
    : [P('La demande adressable à Monaco atteint '), P(fmt('power', r.addressable, f), true), P(' en 2035, soit '), P(fmt('pct', r.rate, f), true), P(' d\'un besoin total de '), P(fmt('power', r.total, f), true), P('.')]
  const bullets: Part[][] = []
  if (need) {
    bullets.push([P('Croissance annuelle moyenne du besoin : '), P(fmt('pct', kpiValue(KPI_BY_ID.cagr, r, snap.results), f, { sign: true }), true), P(' par an entre 2026 et 2035.')])
    bullets.push([P('La surcouche IA représente '), P(fmt('power', r.ia, f), true), P(' ('), P(fmt('pct', r.total ? r.ia / r.total : 0, f, { decimals: 0 }), true), P(' du besoin 2035).')])
  } else {
    bullets.push([P('Le besoin IT total est multiplié par '), P(fmt('ratio', r.growth, f), true), P(' entre 2026 et 2035 ('), P(fmt('pct', kpiValue(KPI_BY_ID.cagr, r, snap.results), f, { sign: true }), true), P(' par an).')])
    const capt = kpiValue(KPI_BY_ID.captiveShare, r, snap.results)
    const priv = groupBlocks(r).filter((g) => !g.captive).reduce((a, g) => a + g.addressable, 0)
    bullets.push([P('Le secteur public et Monaco Telecom assurent '), P(fmt('pct', capt, f), true), P(' de la demande adressable ; le privé ('), P(fmt('power', priv, f), true), P(') porte l\'incertitude.')])
  }
  const top = snap.sensitivity[0]
  if (top) {
    const span = Math.abs(top.high - top.low)
    bullets.push([P('Premier levier : '), P(hypLabel(top.id), true), P(` — jusqu'à ${fmt('power', span, f)} d'écart entre ses valeurs basse et haute.`)])
  }
  return { kicker: '', title, bullets }
}

/** Message clé de la page Globale : comparaison des trois scénarios. */
export function buildGlobalHeadline(snap: Snapshot, f: FormatSettings, scen: (i: number) => string, actorName: (a: ActorDef) => string): Headline {
  const [lo, mid, hi] = snap.results
  const need = snap.lens === 'need'
  const v = (x: { total: number; addressable: number }) => lensValue(x, snap.lens)
  const spread = v(hi) - v(lo)
  const contrib = ACTORS.map((a) => ({ a, d: v(actorBlock(hi, a.id)) - v(actorBlock(lo, a.id)) })).sort((x, y) => y.d - x.d)[0]
  const share = spread ? contrib.d / spread : 0
  const title: Part[] = [
    P(need ? 'Le besoin IT généré à Monaco atteint ' : 'La demande adressable à Monaco atteint '), P(fmt('power', v(mid), f), true), P(` en 2035 dans le scénario ${scen(1)}, entre `),
    P(fmt('power', v(lo), f), true), P(` (${scen(0)}) et `), P(fmt('power', v(hi), f), true), P(` (${scen(2)}).`),
  ]
  const bullets: Part[][] = [
    need
      ? [P('Le besoin IT passe de '), P(fmt('power', mid.base, f), true), P(' en 2026 à '), P(fmt('power', lo.total, f), true), P(' – '), P(fmt('power', hi.total, f), true), P(' en 2035, soit '), P(fmt('ratio', lo.growth, f), true), P(' à '), P(fmt('ratio', hi.growth, f), true), P('.')]
      : [P('Le besoin IT total passe de '), P(fmt('power', mid.base, f), true), P(' en 2026 à '), P(fmt('power', lo.total, f), true), P(' – '), P(fmt('power', hi.total, f), true), P(' en 2035.')],
    [P(actorName(contrib.a), true), P(' explique '), P(fmt('pct', share, f, { decimals: 0 }), true), P(` de l'écart entre les scénarios ${scen(0)} et ${scen(2)}.`)],
    need
      ? [P('La surcouche IA pèse '), P(fmt('pct', lo.total ? lo.ia / lo.total : 0, f, { decimals: 0 }), true), P(' à '), P(fmt('pct', hi.total ? hi.ia / hi.total : 0, f, { decimals: 0 }), true), P(' du besoin 2035 selon le scénario.')]
      : [P('Le taux adressable varie de '), P(fmt('pct', lo.rate, f), true), P(' à '), P(fmt('pct', hi.rate, f), true), P(' : l\'incertitude porte surtout sur la part du privé hébergée à Monaco.')],
  ]
  return { kicker: '', title, bullets }
}

/** Message clé d'une page acteur. */
export function buildActorHeadline(snap: Snapshot, actor: ActorDef, f: FormatSettings, actorName: string, hypLabel: (id: string) => string): Headline {
  const r = snap.active
  const need = snap.lens === 'need'
  const v = (x: { total: number; addressable: number }) => lensValue(x, snap.lens)
  const b = actorBlock(r, actor.id)
  const lo = actorBlock(snap.results[0], actor.id)
  const hi = actorBlock(snap.results[2], actor.id)
  const weight = v(r) ? v(b) / v(r) : 0
  const top = sensitivityFor(snap.params, snap.scenario, (x) => v(actorBlock(x, actor.id)))[0]
  const title: Part[] = need
    ? [P(actorName, true), P(' génère '), P(fmt('power', b.total, f), true), P(' de besoin IT en 2035, soit '), P(fmt('pct', weight, f), true), P(' du total monégasque.')]
    : [P(actorName, true), P(' représente '), P(fmt('power', b.addressable, f), true), P(' de demande adressable en 2035, soit '), P(fmt('pct', weight, f), true), P(' du total monégasque.')]
  const bullets: Part[][] = [
    need
      ? [P('Besoin 2026 : '), P(fmt('power', b.base, f), true), P(' → 2035 : '), P(fmt('power', b.total, f), true), P(' ('), P(fmt('ratio', b.base ? b.total / b.base : 0, f), true), P(').')]
      : [P('Besoin 2035 : '), P(fmt('power', b.total, f), true), P(' ('), P(fmt('ratio', b.base ? b.total / b.base : 0, f), true), P(' vs 2026), dont '), P(fmt('pct', b.total ? b.addressable / b.total : 0, f), true), P(' captable à Monaco.')],
    [P('Selon les scénarios : de '), P(fmt('power', v(lo), f), true), P(' à '), P(fmt('power', v(hi), f), true), P('.')],
  ]
  if (top) bullets.push([P('Premier levier : '), P(hypLabel(top.id), true), P(` — jusqu'à ${fmt('power', Math.abs(top.high - top.low), f)} d'écart.`)])
  else bullets.push([P('Aucune hypothèse du modèle ne fait varier cet acteur.')])
  return { kicker: '', title, bullets }
}
