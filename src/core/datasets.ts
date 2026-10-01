// Jeux de données : chaque graphique / tableau du dashboard lit UN jeu de
// données construit ici à partir de l'instantané. Aucune valeur n'est
// recalculée côté affichage ; les types de graphiques compatibles dépendent
// de la nature (kind) du jeu de données.

import { ACTORS, actorBlock } from './actors'
import { groupBlocks, HORIZON, OUTPUT_GROUPS, SCENARIOS, type Entity } from './engine'
import { type FormatKind } from './hypotheses'
import { sensitivityFor, type Snapshot } from './snapshot'

export type ChartType =
  | 'bar' | 'hbar' | 'stackedBar' | 'line' | 'area' | 'stackedArea'
  | 'donut' | 'pie' | 'waterfall' | 'tornado' | 'table'

export type DatasetKind = 'composition' | 'comparison' | 'timeseries' | 'bridge' | 'sensitivity' | 'matrix'

export interface DataSeries {
  id: string
  name: string
  /** valeurs brutes (kW pour 'power') */
  values: number[]
  /** total fourni par le modèle (jamais recalculé par l'affichage) */
  total?: number
  /** format spécifique à la série (sinon celui du jeu de données) */
  format?: FormatKind
  /** couleur sémantique (clé de jeton) : 'scen0' | 'scen1' | 'scen2' | 'muted' | 'positive' | 'negative' */
  tone?: string
}

export interface Dataset {
  id: string
  kind: DatasetKind
  format: FormatKind
  categories: string[]
  /** identifiants de bloc des catégories (pour des couleurs stables d'un graphique à l'autre) */
  categoryIds?: string[]
  series: DataSeries[]
  /** les séries peuvent s'empiler (somme significative) */
  stackable: boolean
  /** pour les cascades : nature de chaque étape */
  steps?: ('total' | 'delta')[]
  /** texte additionnel d'infobulle par catégorie (déjà formaté par l'appelant) */
  hints?: string[]
  /** cascade dont les totaux écrasent les écarts : l'axe est tronqué (signalé à l'utilisateur) */
  truncateAxis?: boolean
  empty?: string
}

export interface DatasetCtx {
  snap: Snapshot
  /** libellé personnalisable : label(clé, défaut) */
  label: (key: string, def: string) => string
  /** libellé d'une hypothèse */
  hypLabel: (id: string) => string
  /** formateur d'une valeur d'hypothèse (pour les infobulles) */
  fmtHypValue: (id: string, v: number) => string
  /** acteur de la page courante (jeux de données « acteur ») */
  actor?: Entity
}

export interface DatasetDef {
  id: string
  title: string
  subtitle: string
  kind: DatasetKind
  defaultChart: ChartType
  build: (c: DatasetCtx) => Dataset
}

/** Libellé d'un acteur (personnalisable) */
const actorName = (c: DatasetCtx, id: Entity) => c.label(`actor:${id}`, ACTORS.find((a) => a.id === id)!.short)
const noActor = (id: string, kind: DatasetKind): Dataset => ({ id, kind, format: 'power', stackable: false, categories: [], series: [{ id: 'v', name: '', values: [] }], steps: kind === 'bridge' ? [] : undefined, empty: 'Sélectionnez un acteur pour afficher ces données.' })

const years = Array.from({ length: HORIZON + 1 }, (_, i) => String(2026 + i))
const blockName = (c: DatasetCtx, id: string, def: string) => c.label(`block:${id}`, def)

export const CHART_LABELS: Record<ChartType, string> = {
  bar: 'Barres verticales', hbar: 'Barres horizontales', stackedBar: 'Barres empilées', line: 'Courbes', area: 'Aires',
  stackedArea: 'Aires empilées', donut: 'Anneau', pie: 'Camembert', waterfall: 'Cascade', tornado: 'Tornade', table: 'Tableau',
}

/** Types de visualisation compatibles avec la nature des données. */
export function compatibleCharts(d: Pick<Dataset, 'kind' | 'stackable' | 'series' | 'format'>): ChartType[] {
  switch (d.kind) {
    case 'composition': return ['hbar', 'bar', 'donut', 'pie', 'table']
    case 'comparison': return d.stackable ? ['bar', 'stackedBar', 'hbar', 'table'] : ['bar', 'hbar', 'table']
    case 'timeseries': return d.stackable ? ['stackedArea', 'stackedBar', 'area', 'line', 'bar', 'table'] : ['line', 'area', 'bar', 'table']
    case 'bridge': return ['waterfall', 'bar', 'table']
    case 'sensitivity': return ['tornado', 'table']
    case 'matrix': return ['table']
  }
}

export const DATASETS: DatasetDef[] = [
  {
    id: 'addrByBlock', title: 'Où se situe la demande adressable ?', subtitle: 'Demande adressable 2035 par bloc, scénario actif', kind: 'composition', defaultChart: 'hbar',
    build: (c) => {
      const g = groupBlocks(c.snap.active).sort((a, b) => b.addressable - a.addressable)
      return {
        id: 'addrByBlock', kind: 'composition', format: 'power', stackable: false,
        categories: g.map((x) => blockName(c, x.id, x.label)), categoryIds: g.map((x) => x.id),
        series: [{ id: 'addr', name: c.label('series:addr', 'Demande adressable 2035'), values: g.map((x) => x.addressable), total: c.snap.active.addressable }],
      }
    },
  },
  {
    id: 'scenarios', title: 'Trois scénarios, un même point de départ', subtitle: 'Besoin 2026, besoin 2035 et demande adressable', kind: 'comparison', defaultChart: 'bar',
    build: (c) => ({
      id: 'scenarios', kind: 'comparison', format: 'power', stackable: false,
      categories: SCENARIOS.map((s, i) => c.label(`scenario:${i}`, s)),
      series: [
        { id: 'base', name: c.label('series:base', 'Besoin 2026'), values: c.snap.results.map((r) => r.base), tone: 'muted' },
        { id: 'need', name: c.label('series:need', 'Besoin total 2035'), values: c.snap.results.map((r) => r.total), tone: 'primary' },
        { id: 'addr', name: c.label('series:addr', 'Demande adressable 2035'), values: c.snap.results.map((r) => r.addressable), tone: 'accent' },
      ],
    }),
  },
  {
    id: 'trajectory', title: 'Trajectoire de la demande adressable', subtitle: '2026 → 2035, par scénario (profil annuel interpolé)', kind: 'timeseries', defaultChart: 'line',
    build: (c) => ({
      id: 'trajectory', kind: 'timeseries', format: 'power', stackable: false, categories: years,
      series: SCENARIOS.map((s, i) => ({ id: `s${i}`, name: c.label(`scenario:${i}`, s), values: c.snap.trajectory[i].map((r) => r.addressable), total: c.snap.results[i].addressable, tone: `scen${i}` })),
    }),
  },
  {
    id: 'trajectoryBlocks', title: 'Trajectoire par bloc', subtitle: 'Demande adressable 2026 → 2035, scénario actif', kind: 'timeseries', defaultChart: 'stackedArea',
    build: (c) => {
      const t = c.snap.trajectory[c.snap.scenario].map(groupBlocks)
      return {
        id: 'trajectoryBlocks', kind: 'timeseries', format: 'power', stackable: true, categories: years,
        series: OUTPUT_GROUPS.map((g, i) => ({ id: g.id, name: blockName(c, g.id, g.label), values: t.map((x) => x[i].addressable), total: groupBlocks(c.snap.active)[i].addressable })),
      }
    },
  },
  {
    id: 'addrByBlockScenario', title: 'Demande adressable par bloc et par scénario', subtitle: '2035', kind: 'comparison', defaultChart: 'stackedBar',
    build: (c) => {
      const g = c.snap.results.map(groupBlocks)
      return {
        id: 'addrByBlockScenario', kind: 'comparison', format: 'power', stackable: true,
        categories: SCENARIOS.map((s, i) => c.label(`scenario:${i}`, s)),
        series: OUTPUT_GROUPS.map((og, i) => ({ id: og.id, name: blockName(c, og.id, og.label), values: g.map((x) => x[i].addressable) })),
      }
    },
  },
  {
    id: 'bridge', title: 'Du besoin 2026 à la demande adressable', subtitle: 'Lecture en cascade, scénario actif', kind: 'bridge', defaultChart: 'waterfall',
    build: (c) => {
      const r = c.snap.active
      const steps: { name: string; v: number; t: 'total' | 'delta' }[] = [
        { name: c.label('bridge:base', 'Besoin 2026'), v: r.base, t: 'total' },
        { name: c.label('bridge:act', 'Effectifs & activité'), v: r.dAct, t: 'delta' },
        { name: c.label('bridge:int', 'Intensité numérique'), v: r.dInt, t: 'delta' },
        { name: c.label('bridge:ia', 'Surcouche IA'), v: r.ia, t: 'delta' },
        { name: c.label('bridge:total', 'Besoin 2035'), v: r.total, t: 'total' },
        { name: c.label('bridge:out', 'Hors Monaco'), v: r.addressable - r.total, t: 'delta' },
        { name: c.label('bridge:addr', 'Adressable 2035'), v: r.addressable, t: 'total' },
      ]
      return {
        id: 'bridge', kind: 'bridge', format: 'power', stackable: false, categories: steps.map((s) => s.name), steps: steps.map((s) => s.t),
        series: [{ id: 'v', name: c.label('series:v', 'Puissance IT'), values: steps.map((s) => s.v) }],
      }
    },
  },
  {
    id: 'whatChanged', title: 'Ce qui a changé vs la référence', subtitle: 'Impact de chaque hypothèse modifiée sur la demande adressable 2035 (effets croisés répartis)', kind: 'bridge', defaultChart: 'waterfall',
    build: (c) => {
      const ch = c.snap.changes
      const rows = ch.rows.filter((r) => Math.abs(r.delta) > 1e-9)
      const hasRes = Math.abs(ch.residual) > 1e-9
      if (!rows.length && !hasRes) {
        return { id: 'whatChanged', kind: 'bridge', format: 'power', stackable: false, categories: [], series: [{ id: 'v', name: 'Écart', values: [] }], steps: [], empty: 'Aucun écart pour l\'instant. Modifiez une hypothèse pour voir son effet sur la demande adressable.' }
      }
      const steps: { name: string; v: number; t: 'total' | 'delta' }[] = [
        { name: c.label('whatChanged:ref', 'Référence'), v: c.snap.activeRef.addressable, t: 'total' },
        ...rows.map((r) => ({ name: c.hypLabel(r.id), v: r.delta, t: 'delta' as const })),
        ...(hasRes ? [{ name: c.label('whatChanged:cross', 'Effets croisés'), v: ch.residual, t: 'delta' as const }] : []),
        { name: c.label('whatChanged:cur', 'Scénario actuel'), v: c.snap.active.addressable, t: 'total' },
      ]
      return {
        id: 'whatChanged', kind: 'bridge', format: 'power', stackable: false, truncateAxis: true, categories: steps.map((s) => s.name), steps: steps.map((s) => s.t),
        series: [{ id: 'v', name: c.label('series:v', 'Puissance IT'), values: steps.map((s) => s.v) }],
        hints: steps.map((s, i) => {
          const r = rows[i - 1]
          return r ? `${c.fmtHypValue(r.id, r.from)} → ${c.fmtHypValue(r.id, r.to)}` : ''
        }),
      }
    },
  },
  {
    id: 'sensitivity', title: 'Quelles hypothèses comptent le plus ?', subtitle: 'Impact sur la demande adressable 2035 en passant de la valeur basse à la valeur haute', kind: 'sensitivity', defaultChart: 'tornado',
    build: (c) => {
      const rows = c.snap.sensitivity.slice(0, 8)
      return {
        id: 'sensitivity', kind: 'sensitivity', format: 'power', stackable: false,
        categories: rows.map((r) => c.hypLabel(r.id)),
        series: [
          { id: 'low', name: c.label('series:low', 'Valeur basse'), values: rows.map((r) => r.low), tone: 'scen0' },
          { id: 'high', name: c.label('series:high', 'Valeur haute'), values: rows.map((r) => r.high), tone: 'scen2' },
        ],
        hints: rows.map((r) => `${c.fmtHypValue(r.id, r.lowVal)} → ${c.fmtHypValue(r.id, r.highVal)}`),
      }
    },
  },
  {
    id: 'socleAi', title: 'Socle et intelligence artificielle', subtitle: 'Demande adressable 2035 : besoin hors IA vs surcouche IA', kind: 'comparison', defaultChart: 'stackedBar',
    build: (c) => ({
      id: 'socleAi', kind: 'comparison', format: 'power', stackable: true,
      categories: SCENARIOS.map((s, i) => c.label(`scenario:${i}`, s)),
      series: [
        { id: 'socle', name: c.label('series:socle', 'Socle hors IA'), values: c.snap.results.map((r) => r.addrBase), total: undefined },
        { id: 'ai', name: c.label('series:ai', 'Surcouche IA'), values: c.snap.results.map((r) => r.addrIa) },
      ],
    }),
  },
  {
    id: 'rateByBlock', title: 'Part du besoin captable par bloc', subtitle: 'Demande adressable / besoin 2035, scénario actif', kind: 'composition', defaultChart: 'hbar',
    build: (c) => {
      const g = groupBlocks(c.snap.active).sort((a, b) => b.addressable / b.total - a.addressable / a.total)
      return {
        id: 'rateByBlock', kind: 'composition', format: 'pct', stackable: false,
        categories: g.map((x) => blockName(c, x.id, x.label)), categoryIds: g.map((x) => x.id),
        series: [{ id: 'rate', name: c.label('series:rate', 'Taux adressable'), values: g.map((x) => (x.total ? x.addressable / x.total : 0)), total: c.snap.active.rate }],
      }
    },
  },
  {
    id: 'blockOverview', title: 'Par bloc : 2026, 2035 et adressable', subtitle: 'Scénario actif', kind: 'comparison', defaultChart: 'bar',
    build: (c) => {
      const g = groupBlocks(c.snap.active)
      return {
        id: 'blockOverview', kind: 'comparison', format: 'power', stackable: false,
        categories: g.map((x) => blockName(c, x.id, x.label)), categoryIds: g.map((x) => x.id),
        series: [
          { id: 'base', name: c.label('series:base', 'Besoin 2026'), values: g.map((x) => x.base), total: c.snap.active.base, tone: 'muted' },
          { id: 'need', name: c.label('series:need', 'Besoin total 2035'), values: g.map((x) => x.total), total: c.snap.active.total, tone: 'primary' },
          { id: 'addr', name: c.label('series:addr', 'Demande adressable 2035'), values: g.map((x) => x.addressable), total: c.snap.active.addressable, tone: 'accent' },
        ],
      }
    },
  },
  {
    id: 'detailTable', title: 'Détail par bloc et par scénario', subtitle: 'Besoin et demande adressable 2035', kind: 'matrix', defaultChart: 'table',
    build: (c) => {
      const g = c.snap.results.map(groupBlocks)
      const names = SCENARIOS.map((s, i) => c.label(`scenario:${i}`, s))
      return {
        id: 'detailTable', kind: 'matrix', format: 'power', stackable: false,
        categories: OUTPUT_GROUPS.map((og) => blockName(c, og.id, og.label)),
        series: [
          { id: 'base', name: c.label('series:base', 'Besoin 2026'), values: g[1].map((x) => x.base), total: c.snap.results[1].base },
          ...names.map((n, i) => ({ id: `need${i}`, name: `${c.label('series:need', 'Besoin total 2035')} – ${n}`, values: g[i].map((x) => x.total), total: c.snap.results[i].total })),
          ...names.map((n, i) => ({ id: `addr${i}`, name: `${c.label('series:addr', 'Demande adressable 2035')} – ${n}`, values: g[i].map((x) => x.addressable), total: c.snap.results[i].addressable })),
        ],
      }
    },
  },

  // ------------------------------------------------------------- page Globale
  {
    id: 'actorsAddr', title: 'Qui porte la demande ?', subtitle: 'Demande adressable 2035 par acteur et par scénario', kind: 'comparison', defaultChart: 'hbar',
    build: (c) => ({
      id: 'actorsAddr', kind: 'comparison', format: 'power', stackable: false,
      categories: ACTORS.map((a) => actorName(c, a.id)), categoryIds: ACTORS.map((a) => a.id),
      series: SCENARIOS.map((s, i) => ({ id: `s${i}`, name: c.label(`scenario:${i}`, s), values: ACTORS.map((a) => actorBlock(c.snap.results[i], a.id).addressable), total: c.snap.results[i].addressable, tone: `scen${i}` })),
    }),
  },
  {
    id: 'spreadByActor', title: 'Qui explique l\'écart entre scénarios ?', subtitle: 'Écart de demande adressable 2035 entre Haut et Bas, par acteur', kind: 'comparison', defaultChart: 'hbar',
    build: (c) => {
      const lo = c.snap.results[0]
      const hi = c.snap.results[2]
      return {
        id: 'spreadByActor', kind: 'comparison', format: 'power', stackable: false,
        categories: ACTORS.map((a) => actorName(c, a.id)), categoryIds: ACTORS.map((a) => a.id),
        series: [{ id: 'spread', name: c.label('series:spread', 'Écart Haut − Bas'), values: ACTORS.map((a) => actorBlock(hi, a.id).addressable - actorBlock(lo, a.id).addressable), total: hi.addressable - lo.addressable, tone: 'accent' }],
      }
    },
  },

  // ------------------------------------------------------------- pages Acteurs
  {
    id: 'actorBridge', title: 'Du besoin 2026 à la demande adressable', subtitle: 'Lecture en cascade pour cet acteur, scénario actif', kind: 'bridge', defaultChart: 'waterfall',
    build: (c) => {
      const b = c.actor ? actorBlock(c.snap.active, c.actor) : null
      if (!b) return noActor('actorBridge', 'bridge')
      const steps: { name: string; v: number; t: 'total' | 'delta' }[] = [
        { name: c.label('bridge:base', 'Besoin 2026'), v: b.base, t: 'total' },
        { name: c.label('bridge:act', 'Effectifs & activité'), v: b.dAct, t: 'delta' },
        { name: c.label('bridge:int', 'Intensité numérique'), v: b.dInt, t: 'delta' },
        { name: c.label('bridge:ia', 'Surcouche IA'), v: b.ia, t: 'delta' },
        { name: c.label('bridge:total', 'Besoin 2035'), v: b.total, t: 'total' },
        { name: c.label('bridge:out', 'Hors Monaco'), v: b.addressable - b.total, t: 'delta' },
        { name: c.label('bridge:addr', 'Adressable 2035'), v: b.addressable, t: 'total' },
      ]
      return { id: 'actorBridge', kind: 'bridge', format: 'power', stackable: false, categories: steps.map((x) => x.name), steps: steps.map((x) => x.t), series: [{ id: 'v', name: c.label('series:v', 'Puissance IT'), values: steps.map((x) => x.v) }] }
    },
  },
  {
    id: 'actorScenarios', title: 'Besoin et demande adressable', subtitle: 'Besoin 2026, besoin 2035 et demande adressable de cet acteur, par scénario', kind: 'comparison', defaultChart: 'bar',
    build: (c) => {
      if (!c.actor) return noActor('actorScenarios', 'comparison')
      const bs = c.snap.results.map((r) => actorBlock(r, c.actor!))
      return {
        id: 'actorScenarios', kind: 'comparison', format: 'power', stackable: false,
        categories: SCENARIOS.map((s, i) => c.label(`scenario:${i}`, s)),
        series: [
          { id: 'base', name: c.label('series:base', 'Besoin 2026'), values: bs.map((b) => b.base), tone: 'muted' },
          { id: 'need', name: c.label('series:need', 'Besoin total 2035'), values: bs.map((b) => b.total), tone: 'primary' },
          { id: 'addr', name: c.label('series:addr', 'Demande adressable 2035'), values: bs.map((b) => b.addressable), tone: 'accent' },
        ],
      }
    },
  },
  {
    id: 'actorTrajectory', title: 'Trajectoire de la demande adressable', subtitle: '2026 → 2035, par scénario (profil annuel interpolé)', kind: 'timeseries', defaultChart: 'line',
    build: (c) => {
      if (!c.actor) return noActor('actorTrajectory', 'timeseries')
      return {
        id: 'actorTrajectory', kind: 'timeseries', format: 'power', stackable: false, categories: years,
        series: SCENARIOS.map((s, i) => ({ id: `s${i}`, name: c.label(`scenario:${i}`, s), values: c.snap.trajectory[i].map((r) => actorBlock(r, c.actor!).addressable), total: actorBlock(c.snap.results[i], c.actor!).addressable, tone: `scen${i}` })),
      }
    },
  },
  {
    id: 'actorSensitivity', title: 'Quelles hypothèses comptent le plus ?', subtitle: 'Impact sur la demande adressable de cet acteur, de la valeur basse à la valeur haute', kind: 'sensitivity', defaultChart: 'tornado',
    build: (c) => {
      if (!c.actor) return noActor('actorSensitivity', 'sensitivity')
      const id = c.actor
      const rows = sensitivityFor(c.snap.params, c.snap.scenario, (r) => actorBlock(r, id).addressable).slice(0, 8)
      return {
        id: 'actorSensitivity', kind: 'sensitivity', format: 'power', stackable: false,
        categories: rows.map((r) => c.hypLabel(r.id)),
        series: [
          { id: 'low', name: c.label('series:low', 'Valeur basse'), values: rows.map((r) => r.low), tone: 'scen0' },
          { id: 'high', name: c.label('series:high', 'Valeur haute'), values: rows.map((r) => r.high), tone: 'scen2' },
        ],
        hints: rows.map((r) => `${c.fmtHypValue(r.id, r.lowVal)} → ${c.fmtHypValue(r.id, r.highVal)}`),
        empty: rows.length ? undefined : 'Aucune hypothèse du modèle ne fait varier cet acteur.',
      }
    },
  },
  {
    id: 'actorTable', title: 'Détail du calcul', subtitle: 'De la baseline à la demande adressable, par scénario', kind: 'matrix', defaultChart: 'table',
    build: (c) => {
      if (!c.actor) return noActor('actorTable', 'matrix')
      const bs = c.snap.results.map((r) => actorBlock(r, c.actor!))
      const rows: { name: string; f: (b: (typeof bs)[number]) => number }[] = [
        { name: 'Besoin 2026 (baseline)', f: (b) => b.base },
        { name: 'Besoin 2035 hors IA', f: (b) => b.need },
        { name: 'Surcouche IA', f: (b) => b.ia },
        { name: 'Besoin total 2035', f: (b) => b.total },
        { name: 'Adressable – socle', f: (b) => b.addrBase },
        { name: 'Adressable – IA', f: (b) => b.addrIa },
        { name: 'Demande adressable 2035', f: (b) => b.addressable },
      ]
      return {
        id: 'actorTable', kind: 'matrix', format: 'power', stackable: false,
        categories: rows.map((r) => r.name),
        series: SCENARIOS.map((s, i) => ({ id: `s${i}`, name: c.label(`scenario:${i}`, s), values: rows.map((r) => r.f(bs[i])), tone: `scen${i}` })),
      }
    },
  },
]

export const DATASET_BY_ID: Record<string, DatasetDef> = Object.fromEntries(DATASETS.map((d) => [d.id, d]))
