// Message clé généré à partir de l'instantané (mêmes valeurs, même formateur
// que les KPI et les graphiques).

import { groupBlocks } from './engine'
import { fmt, type FormatSettings } from './format'
import { KPI_BY_ID, kpiValue } from './kpis'
import type { Snapshot } from './snapshot'

export type Part = { t: string; strong?: boolean }
export interface Headline { kicker: string; title: Part[]; bullets: Part[][] }

export function buildHeadline(snap: Snapshot, f: FormatSettings, scenarioName: string, hypLabel: (id: string) => string): Headline {
  const r = snap.active
  const refR = snap.activeRef
  const P = (t: string, strong = false): Part => ({ t, strong })
  const title: Part[] = [
    P('La demande adressable à Monaco atteint '), P(fmt('power', r.addressable, f), true),
    P(' en 2035, soit '), P(fmt('pct', r.rate, f), true), P(' d\'un besoin total de '), P(fmt('power', r.total, f), true), P('.'),
  ]
  const bullets: Part[][] = []

  const d = r.addressable - refR.addressable
  if (Math.abs(d) < 1e-9) {
    bullets.push([P('Le besoin IT total est multiplié par '), P(fmt('ratio', r.growth, f), true), P(' entre 2026 et 2035 ('), P(fmt('pct', kpiValue(KPI_BY_ID.cagr, r, snap.results), f, { sign: true }), true), P(' par an).')])
  } else {
    bullets.push([P('Par rapport à la référence : '), P(fmt('power', d, f, { sign: true }), true), P(' ('), P(fmt('pct', refR.addressable ? d / refR.addressable : 0, f, { sign: true, decimals: 0 }), true), P(') de demande adressable.')])
  }

  const top = snap.sensitivity[0]
  if (top) {
    const span = Math.abs(top.high - top.low)
    bullets.push([P('Premier levier : '), P(hypLabel(top.id), true), P(` — jusqu'à ${fmt('power', span, f)} d'écart entre ses valeurs basse et haute.`)])
  }

  const capt = kpiValue(KPI_BY_ID.captiveShare, r, snap.results)
  const priv = groupBlocks(r).filter((g) => !g.captive).reduce((a, g) => a + g.addressable, 0)
  bullets.push([P('Le secteur public et Monaco Telecom assurent '), P(fmt('pct', capt, f), true), P(' de la demande adressable ; le privé ('), P(fmt('power', priv, f), true), P(') porte l\'incertitude.')])

  return { kicker: `Scénario ${scenarioName}`, title, bullets }
}

