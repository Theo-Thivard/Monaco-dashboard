// Jeux de données : chaque graphique / tableau du dashboard lit UN jeu de
// données construit ici à partir de l'instantané. Aucune valeur n'est
// recalculée côté affichage ; les types de graphiques compatibles dépendent
// de la nature (kind) du jeu de données.

import { ACTORS, actorBlock } from './actors'
import { groupBlocks, HORIZON, OUTPUT_GROUPS, SCENARIOS, type Entity } from './engine'
import { type FormatKind } from './hypotheses'
import { lensValue } from './lens'
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

/** Valeur d'un résultat (scénario ou bloc) dans la lentille courante : besoin généré ou demande adressable. */
const lv = (c: DatasetCtx) => (x: { total: number; addressable: number }) => lensValue(x, c.snap.lens)
const lensSeriesName = (c: DatasetCtx) => (c.snap.lens === 'need' ? c.label('series:need', 'Besoin total 2035') : c.label('series:addr', 'Demande adressable 2035'))

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
    id: 'addrByBlock', title: 'Où se situe la demande ?', subtitle: 'Répartition 2035 par bloc, scénario actif', kind: 'composition', defaultChart: 'hbar',
    build: (c) => {
      const v = lv(c)
      const g = groupBlocks(c.snap.active).sort((a, b) => v(b) - v(a))
      return {
        id: 'addrByBlock', kind: 'composition', format: 'power', stackable: false,
        categories: g.map((x) => blockName(c, x.id, x.label)), categoryIds: g.map((x) => x.id),
        series: [{ id: 'addr', name: lensSeriesName(c), values: g.map(v), total: v(c.snap.active) }],
      }
    },
  },
  {
    id: 'scenarios', title: 'Trois scénarios, un même point de départ', subtitle: 'Besoin 2026 et 2035 (et demande adressable en vue adressable)', kind: 'comparison', defaultChart: 'bar',
    build: (c) => ({
      id: 'scenarios', kind: 'comparison', format: 'power', stackable: false,
      categories: SCENARIOS.map((s, i) => c.label(`scenario:${i}`, s)),
      series: [
        { id: 'base', name: c.label('series:base', 'Besoin 2026'), values: c.snap.results.map((r) => r.base), tone: 'muted' },
        { id: 'need', name: c.label('series:need', 'Besoin total 2035'), values: c.snap.results.map((r) => r.total), tone: 'primary' },
        ...(c.snap.lens === 'addressable' ? [{ id: 'addr', name: c.label('series:addr', 'Demande adressable 2035'), values: c.snap.results.map((r) => r.addressable), tone: 'accent' }] : []),
      ],
    }),
  },
  {
    id: 'trajectory', title: 'Trajectoire 2026 → 2035', subtitle: 'Par scénario (profil annuel interpolé)', kind: 'timeseries', defaultChart: 'line',
    build: (c) => ({
      id: 'trajectory', kind: 'timeseries', format: 'power', stackable: false, categories: years,
      series: SCENARIOS.map((s, i) => ({ id: `s${i}`, name: c.label(`scenario:${i}`, s), values: c.snap.trajectory[i].map(lv(c)), total: lv(c)(c.snap.results[i]), tone: `scen${i}` })),
    }),
  },
  {
    id: 'trajectoryBlocks', title: 'Trajectoire par bloc', subtitle: '2026 → 2035, scénario actif', kind: 'timeseries', defaultChart: 'stackedArea',
    build: (c) => {
      const t = c.snap.trajectory[c.snap.scenario].map(groupBlocks)
      return {
        id: 'trajectoryBlocks', kind: 'timeseries', format: 'power', stackable: true, categories: years,
        series: OUTPUT_GROUPS.map((g, i) => ({ id: g.id, name: blockName(c, g.id, g.label), values: t.map((x) => lv(c)(x[i])), total: lv(c)(groupBlocks(c.snap.active)[i]) })),
      }
    },
  },
  {
    id: 'addrByBlockScenario', title: 'Répartition par bloc et par scénario', subtitle: '2035', kind: 'comparison', defaultChart: 'stackedBar',
    build: (c) => {
      const g = c.snap.results.map(groupBlocks)
      return {
        id: 'addrByBlockScenario', kind: 'comparison', format: 'power', stackable: true,
        categories: SCENARIOS.map((s, i) => c.label(`scenario:${i}`, s)),
        series: OUTPUT_GROUPS.map((og, i) => ({ id: og.id, name: blockName(c, og.id, og.label), values: g.map((x) => lv(c)(x[i])) })),
      }
    },
  },
  {
    id: 'bridge', title: 'Lecture en cascade', subtitle: 'Du besoin 2026 au besoin 2035 (puis à la demande adressable en vue adressable), scénario actif', kind: 'bridge', defaultChart: 'waterfall',
    build: (c) => {
      const r = c.snap.active
      const steps: { name: string; v: number; t: 'total' | 'delta' }[] = [
        { name: c.label('bridge:base', 'Besoin 2026'), v: r.base, t: 'total' },
        { name: c.label('bridge:act', 'Effectifs & activité'), v: r.dAct, t: 'delta' },
        { name: c.label('bridge:int', 'Intensité numérique'), v: r.dInt, t: 'delta' },
        { name: c.label('bridge:ia', 'Surcouche IA'), v: r.ia, t: 'delta' },
        ...(Math.abs(r.other) > 1e-9 ? [{ name: c.label('bridge:other', 'Autres effets (Excel)'), v: r.other, t: 'delta' as const }] : []),
        { name: c.label('bridge:total', 'Besoin 2035'), v: r.total, t: 'total' },
        ...(c.snap.lens === 'addressable' ? [
          { name: c.label('bridge:out', 'Hors Monaco'), v: r.addressable - r.total, t: 'delta' as const },
          { name: c.label('bridge:addr', 'Adressable 2035'), v: r.addressable, t: 'total' as const },
        ] : []),
      ]
      return {
        id: 'bridge', kind: 'bridge', format: 'power', stackable: false, categories: steps.map((s) => s.name), steps: steps.map((s) => s.t),
        series: [{ id: 'v', name: c.label('series:v', 'Puissance IT'), values: steps.map((s) => s.v) }],
      }
    },
  },
  {
    id: 'sensitivity', title: 'Quelles hypothèses comptent le plus ?', subtitle: 'Impact 2035 en passant de la valeur basse à la valeur haute', kind: 'sensitivity', defaultChart: 'tornado',
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
    id: 'socleAi', title: 'Socle et intelligence artificielle', subtitle: '2035 : besoin hors IA vs surcouche IA', kind: 'comparison', defaultChart: 'stackedBar',
    build: (c) => {
      const need = c.snap.lens === 'need'
      return {
        id: 'socleAi', kind: 'comparison', format: 'power', stackable: true,
        categories: SCENARIOS.map((s, i) => c.label(`scenario:${i}`, s)),
        series: [
          { id: 'socle', name: c.label('series:socle', 'Socle hors IA'), values: c.snap.results.map((r) => (need ? r.need : r.addrBase)), total: undefined },
          { id: 'ai', name: c.label('series:ai', 'Surcouche IA'), values: c.snap.results.map((r) => (need ? r.ia : r.addrIa)) },
        ],
      }
    },
  },
  {
    id: 'rateByBlock', title: 'Taux par bloc', subtitle: 'Croissance du besoin 2026 → 2035, ou part captable en vue adressable', kind: 'composition', defaultChart: 'hbar',
    build: (c) => {
      const need = c.snap.lens === 'need'
      const f = (x: { base: number; total: number; addressable: number }) => (need ? (x.base ? x.total / x.base : 0) : x.total ? x.addressable / x.total : 0)
      const g = groupBlocks(c.snap.active).sort((a, b) => f(b) - f(a))
      const r = c.snap.active
      return {
        id: 'rateByBlock', kind: 'composition', format: need ? 'ratio' : 'pct', stackable: false,
        categories: g.map((x) => blockName(c, x.id, x.label)), categoryIds: g.map((x) => x.id),
        series: [{ id: 'rate', name: need ? c.label('series:growth', 'Multiplicateur 2026 → 2035') : c.label('series:rate', 'Taux adressable'), values: g.map(f), total: need ? r.growth : r.rate }],
      }
    },
  },
  {
    id: 'blockOverview', title: 'Par bloc : 2026 et 2035', subtitle: 'Scénario actif', kind: 'comparison', defaultChart: 'bar',
    build: (c) => {
      const g = groupBlocks(c.snap.active)
      return {
        id: 'blockOverview', kind: 'comparison', format: 'power', stackable: false,
        categories: g.map((x) => blockName(c, x.id, x.label)), categoryIds: g.map((x) => x.id),
        series: [
          { id: 'base', name: c.label('series:base', 'Besoin 2026'), values: g.map((x) => x.base), total: c.snap.active.base, tone: 'muted' },
          { id: 'need', name: c.label('series:need', 'Besoin total 2035'), values: g.map((x) => x.total), total: c.snap.active.total, tone: 'primary' },
          ...(c.snap.lens === 'addressable' ? [{ id: 'addr', name: c.label('series:addr', 'Demande adressable 2035'), values: g.map((x) => x.addressable), total: c.snap.active.addressable, tone: 'accent' }] : []),
        ],
      }
    },
  },
  {
    id: 'detailTable', title: 'Détail par bloc et par scénario', subtitle: 'Besoin 2035 (et demande adressable en vue adressable)', kind: 'matrix', defaultChart: 'table',
    build: (c) => {
      const g = c.snap.results.map(groupBlocks)
      const names = SCENARIOS.map((s, i) => c.label(`scenario:${i}`, s))
      return {
        id: 'detailTable', kind: 'matrix', format: 'power', stackable: false,
        categories: OUTPUT_GROUPS.map((og) => blockName(c, og.id, og.label)),
        series: [
          { id: 'base', name: c.label('series:base', 'Besoin 2026'), values: g[1].map((x) => x.base), total: c.snap.results[1].base },
          ...names.map((n, i) => ({ id: `need${i}`, name: `${c.label('series:need', 'Besoin total 2035')} – ${n}`, values: g[i].map((x) => x.total), total: c.snap.results[i].total })),
          ...(c.snap.lens === 'addressable' ? names.map((n, i) => ({ id: `addr${i}`, name: `${c.label('series:addr', 'Demande adressable 2035')} – ${n}`, values: g[i].map((x) => x.addressable), total: c.snap.results[i].addressable })) : []),
        ],
      }
    },
  },

  // ------------------------------------------------------------- page Globale
  {
    id: 'actorsAddr', title: 'Qui porte la demande ?', subtitle: '2035, par acteur et par scénario', kind: 'comparison', defaultChart: 'hbar',
    build: (c) => ({
      id: 'actorsAddr', kind: 'comparison', format: 'power', stackable: false,
      categories: ACTORS.map((a) => actorName(c, a.id)), categoryIds: ACTORS.map((a) => a.id),
      series: SCENARIOS.map((s, i) => ({ id: `s${i}`, name: c.label(`scenario:${i}`, s), values: ACTORS.map((a) => lv(c)(actorBlock(c.snap.results[i], a.id))), total: lv(c)(c.snap.results[i]), tone: `scen${i}` })),
    }),
  },
  {
    id: 'spreadByActor', title: 'Qui explique l\'écart entre scénarios ?', subtitle: 'Écart 2035 entre Haut et Bas, par acteur', kind: 'comparison', defaultChart: 'hbar',
    build: (c) => {
      const lo = c.snap.results[0]
      const hi = c.snap.results[2]
      return {
        id: 'spreadByActor', kind: 'comparison', format: 'power', stackable: false,
        categories: ACTORS.map((a) => actorName(c, a.id)), categoryIds: ACTORS.map((a) => a.id),
        series: [{ id: 'spread', name: c.label('series:spread', 'Écart Haut − Bas'), values: ACTORS.map((a) => lv(c)(actorBlock(hi, a.id)) - lv(c)(actorBlock(lo, a.id))), total: lv(c)(hi) - lv(c)(lo), tone: 'accent' }],
      }
    },
  },

  // ------------------------------------------------------------- pages Acteurs
  {
    id: 'actorBridge', title: 'Lecture en cascade', subtitle: 'De la baseline 2026 à 2035 pour cet acteur, scénario actif', kind: 'bridge', defaultChart: 'waterfall',
    build: (c) => {
      const b = c.actor ? actorBlock(c.snap.active, c.actor) : null
      if (!b) return noActor('actorBridge', 'bridge')
      const steps: { name: string; v: number; t: 'total' | 'delta' }[] = [
        { name: c.label('bridge:base', 'Besoin 2026'), v: b.base, t: 'total' },
        { name: c.label('bridge:act', 'Effectifs & activité'), v: b.dAct, t: 'delta' },
        { name: c.label('bridge:int', 'Intensité numérique'), v: b.dInt, t: 'delta' },
        { name: c.label('bridge:ia', 'Surcouche IA'), v: b.ia, t: 'delta' },
        ...(Math.abs(b.other) > 1e-9 ? [{ name: c.label('bridge:other', 'Autres effets (Excel)'), v: b.other, t: 'delta' as const }] : []),
        { name: c.label('bridge:total', 'Besoin 2035'), v: b.total, t: 'total' },
        ...(c.snap.lens === 'addressable' ? [
          { name: c.label('bridge:out', 'Hors Monaco'), v: b.addressable - b.total, t: 'delta' as const },
          { name: c.label('bridge:addr', 'Adressable 2035'), v: b.addressable, t: 'total' as const },
        ] : []),
      ]
      return { id: 'actorBridge', kind: 'bridge', format: 'power', stackable: false, categories: steps.map((x) => x.name), steps: steps.map((x) => x.t), series: [{ id: 'v', name: c.label('series:v', 'Puissance IT'), values: steps.map((x) => x.v) }] }
    },
  },
  {
    id: 'actorScenarios', title: 'Besoin par scénario', subtitle: 'Besoin 2026 et 2035 de cet acteur (et demande adressable en vue adressable)', kind: 'comparison', defaultChart: 'bar',
    build: (c) => {
      if (!c.actor) return noActor('actorScenarios', 'comparison')
      const bs = c.snap.results.map((r) => actorBlock(r, c.actor!))
      return {
        id: 'actorScenarios', kind: 'comparison', format: 'power', stackable: false,
        categories: SCENARIOS.map((s, i) => c.label(`scenario:${i}`, s)),
        series: [
          { id: 'base', name: c.label('series:base', 'Besoin 2026'), values: bs.map((b) => b.base), tone: 'muted' },
          { id: 'need', name: c.label('series:need', 'Besoin total 2035'), values: bs.map((b) => b.total), tone: 'primary' },
          ...(c.snap.lens === 'addressable' ? [{ id: 'addr', name: c.label('series:addr', 'Demande adressable 2035'), values: bs.map((b) => b.addressable), tone: 'accent' }] : []),
        ],
      }
    },
  },
  {
    id: 'actorTrajectory', title: 'Trajectoire 2026 → 2035', subtitle: 'Par scénario (profil annuel interpolé)', kind: 'timeseries', defaultChart: 'line',
    build: (c) => {
      if (!c.actor) return noActor('actorTrajectory', 'timeseries')
      return {
        id: 'actorTrajectory', kind: 'timeseries', format: 'power', stackable: false, categories: years,
        series: SCENARIOS.map((s, i) => ({ id: `s${i}`, name: c.label(`scenario:${i}`, s), values: c.snap.trajectory[i].map((r) => lv(c)(actorBlock(r, c.actor!))), total: lv(c)(actorBlock(c.snap.results[i], c.actor!)), tone: `scen${i}` })),
      }
    },
  },
  {
    id: 'actorSensitivity', title: 'Quelles hypothèses comptent le plus ?', subtitle: 'Impact 2035 sur cet acteur, de la valeur basse à la valeur haute', kind: 'sensitivity', defaultChart: 'tornado',
    build: (c) => {
      if (!c.actor) return noActor('actorSensitivity', 'sensitivity')
      const id = c.actor
      const rows = sensitivityFor(c.snap.params, c.snap.scenario, (r) => lv(c)(actorBlock(r, id))).slice(0, 8)
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
    id: 'actorTable', title: 'Détail du calcul', subtitle: 'De la baseline à 2035, par scénario', kind: 'matrix', defaultChart: 'table',
    build: (c) => {
      if (!c.actor) return noActor('actorTable', 'matrix')
      const bs = c.snap.results.map((r) => actorBlock(r, c.actor!))
      const rows: { name: string; f: (b: (typeof bs)[number]) => number }[] = [
        { name: 'Besoin 2026 (baseline)', f: (b) => b.base },
        { name: 'Besoin 2035 hors IA', f: (b) => b.need },
        { name: 'Surcouche IA', f: (b) => b.ia },
        { name: 'Besoin total 2035', f: (b) => b.total },
        ...(c.snap.lens === 'addressable' ? [
          { name: 'Adressable – socle', f: (b: (typeof bs)[number]) => b.addrBase },
          { name: 'Adressable – IA', f: (b: (typeof bs)[number]) => b.addrIa },
          { name: 'Demande adressable 2035', f: (b: (typeof bs)[number]) => b.addressable },
        ] : []),
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
