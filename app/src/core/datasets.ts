// Jeux de données : chaque graphique / tableau du dashboard lit UN jeu de
// données construit ici à partir de l'instantané. Aucune valeur n'est
// recalculée côté affichage ; les types de graphiques compatibles dépendent
// de la nature (kind) du jeu de données.

import { ACTORS, actorBlock, arrangeActors, type ActorPrefs } from './actors'
import { groupBlocks, HORIZON, OUTPUT_GROUPS, SCENARIOS, type Entity, type ScenarioResult } from './engine'
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
  /** repère (valeur initiale 2026) tracé comme un trait sur chaque catégorie, sans être une barre ; exclu des totaux */
  marker?: boolean
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
  /** catégories grisées en arrière-plan (situation actuelle 2026, par opposition aux projections 2035) : indices + légende */
  shaded?: { from: number; to: number; label: string }
}

export interface DatasetCtx {
  snap: Snapshot
  /** libellé personnalisable : label(clé, défaut) */
  label: (key: string, def: string) => string
  /** libellé d'une hypothèse */
  hypLabel: (id: string) => string
  /** formateur d'une valeur d'hypothèse (pour les infobulles) */
  fmtHypValue: (id: string, v: number) => string
  /** ordre / visibilité des acteurs choisis par l'utilisateur */
  actors?: ActorPrefs
  /** acteur de la page courante (jeux de données « acteur ») */
  actor?: Entity
  /** « Valeur initiale » cochée sur le graphique : repères 2026, barre 2026… (jeux de données qui la gèrent) */
  showInitial?: boolean
}

export interface DatasetDef {
  id: string
  title: string
  subtitle: string
  kind: DatasetKind
  defaultChart: ChartType
  /** le graphique sait afficher la valeur initiale (2026) quand on coche « Valeur initiale » */
  supportsInitial?: boolean
  build: (c: DatasetCtx) => Dataset
}

/** Libellé d'un acteur (personnalisable) */
const actorName = (c: DatasetCtx, id: Entity) => c.label(`actor:${id}`, ACTORS.find((a) => a.id === id)!.short)
const noActor = (id: string, kind: DatasetKind): Dataset => ({ id, kind, format: 'power', stackable: false, categories: [], series: [{ id: 'v', name: '', values: [] }], steps: kind === 'bridge' ? [] : undefined, empty: 'Sélectionnez un acteur pour afficher ces données.' })

/** Valeur d'un résultat (scénario ou bloc) dans la lentille courante : besoin généré ou demande adressable. */
const lv = (c: DatasetCtx) => (x: { total: number; addressable: number }) => lensValue(x, c.snap.lens)
const lensSeriesName = (c: DatasetCtx) => (c.snap.lens === 'need' ? c.label('series:need', 'Besoin total 2035') : c.label('series:addr', 'Demande adressable 2035'))

/** Acteurs affichés dans les graphiques « tous les acteurs » : classés par valeur décroissante (scénario central) sauf ordre manuel. */
const actorIds = (c: DatasetCtx, value: (r: ScenarioResult, id: Entity) => number): Entity[] => arrangeActors(c.actors, (id) => value(c.snap.results[1], id))

/** Repère « valeur initiale » : la valeur 2026 de chaque catégorie (profil annuel du dashboard : t = 0), dans la lecture courante. */
const initialSeries = (c: DatasetCtx, values: number[]): DataSeries => ({ id: 'initial', name: c.label('series:initial', 'Valeur initiale (2026)'), values, tone: 'initial', marker: true })

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
    id: 'addrByBlock', title: 'Où se situe la demande ? [{unité} ; 2035]', subtitle: 'Par bloc, scénario affiché', kind: 'composition', defaultChart: 'hbar', supportsInitial: true,
    build: (c) => {
      const v = lv(c)
      const g = groupBlocks(c.snap.active).sort((a, b) => v(b) - v(a))
      const start = groupBlocks(c.snap.trajectory[c.snap.scenario][0])
      return {
        id: 'addrByBlock', kind: 'composition', format: 'power', stackable: false,
        categories: g.map((x) => blockName(c, x.id, x.label)), categoryIds: g.map((x) => x.id),
        series: [
          { id: 'addr', name: lensSeriesName(c), values: g.map(v), total: v(c.snap.active) },
          ...(c.showInitial ? [initialSeries(c, g.map((x) => v(start.find((y) => y.id === x.id)!)))] : []),
        ],
      }
    },
  },
  {
    id: 'scenarios', title: 'Besoin par scénario [{unité} ; 2026 et 2035]', subtitle: 'Avec la demande adressable en lecture adressable', kind: 'comparison', defaultChart: 'bar',
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
    id: 'trajectory', title: 'Évolution du besoin [{unité} ; 2026-2035]', subtitle: 'Par scénario (profil annuel interpolé)', kind: 'timeseries', defaultChart: 'line', supportsInitial: true,
    build: (c) => ({
      id: 'trajectory', kind: 'timeseries', format: 'power', stackable: false, categories: years,
      series: SCENARIOS.map((s, i) => ({ id: `s${i}`, name: c.label(`scenario:${i}`, s), values: c.snap.trajectory[i].map(lv(c)), total: lv(c)(c.snap.results[i]), tone: `scen${i}` })),
    }),
  },
  {
    id: 'trajectoryBlocks', title: 'Évolution du besoin par bloc [{unité} ; 2026-2035]', subtitle: 'Scénario affiché', kind: 'timeseries', defaultChart: 'stackedArea',
    build: (c) => {
      const t = c.snap.trajectory[c.snap.scenario].map(groupBlocks)
      const idx = OUTPUT_GROUPS.map((_, i) => i).sort((a, b) => lv(c)(groupBlocks(c.snap.active)[b]) - lv(c)(groupBlocks(c.snap.active)[a]))
      return {
        id: 'trajectoryBlocks', kind: 'timeseries', format: 'power', stackable: true, categories: years,
        series: idx.map((i) => { const g = OUTPUT_GROUPS[i]; return { id: g.id, name: blockName(c, g.id, g.label), values: t.map((x) => lv(c)(x[i])), total: lv(c)(groupBlocks(c.snap.active)[i]) } }),
      }
    },
  },
  {
    id: 'addrByBlockScenario', title: 'Répartition par bloc et par scénario [{unité} ; 2035]', subtitle: '', kind: 'comparison', defaultChart: 'stackedBar', supportsInitial: true,
    build: (c) => {
      const g = c.snap.results.map(groupBlocks)
      const idx = OUTPUT_GROUPS.map((_, i) => i).sort((a, b) => lv(c)(g[1][b]) - lv(c)(g[1][a]))
      // « Valeur initiale » : la répartition actuelle (2026) en première barre, grisée en arrière-plan pour la distinguer des trois projections 2035
      const start = groupBlocks(c.snap.trajectory[1][0])
      const initial = !!c.showInitial
      const names = SCENARIOS.map((s, i) => c.label(`scenario:${i}`, s))
      return {
        id: 'addrByBlockScenario', kind: 'comparison', format: 'power', stackable: true,
        categories: [...(initial ? [c.label('series:initialBar', '2026 · actuel')] : []), ...names.map((n) => (initial ? `${n} · 2035` : n))],
        shaded: initial ? { from: 0, to: 0, label: c.label('series:initialBand', 'Situation actuelle') } : undefined,
        series: idx.map((i) => { const og = OUTPUT_GROUPS[i]; return { id: og.id, name: blockName(c, og.id, og.label), values: [...(initial ? [lv(c)(start[i])] : []), ...g.map((x) => lv(c)(x[i]))] } }),
      }
    },
  },
  {
    id: 'bridge', title: 'Lecture en cascade [{unité} ; 2026-2035]', subtitle: 'Du besoin 2026 au besoin 2035 (puis à la demande adressable en lecture adressable)', kind: 'bridge', defaultChart: 'waterfall',
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
    id: 'sensitivity', title: 'Quelles hypothèses comptent le plus ? [{unité} ; 2035]', subtitle: 'Impact en passant de la valeur basse à la valeur haute', kind: 'sensitivity', defaultChart: 'tornado',
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
    id: 'socleAi', title: 'Socle et intelligence artificielle [{unité} ; 2035]', subtitle: 'Besoin hors IA et surcouche IA', kind: 'comparison', defaultChart: 'stackedBar',
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
    id: 'rateByBlock', title: 'Taux par bloc [{unité} ; 2035]', subtitle: 'Croissance du besoin 2026 → 2035, ou part captable en lecture adressable', kind: 'composition', defaultChart: 'hbar',
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
    id: 'blockOverview', title: 'Besoin par bloc [{unité} ; 2026 et 2035]', subtitle: 'Scénario affiché', kind: 'comparison', defaultChart: 'bar',
    build: (c) => {
      const g = groupBlocks(c.snap.active).sort((a, b) => b.total - a.total)
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
    id: 'detailTable', title: 'Détail par bloc et par scénario [{unité} ; 2026 et 2035]', subtitle: 'Avec la demande adressable en lecture adressable', kind: 'matrix', defaultChart: 'table',
    build: (c) => {
      const g0 = c.snap.results.map(groupBlocks)
      const idx = OUTPUT_GROUPS.map((_, i) => i).sort((a, b) => lv(c)(g0[1][b]) - lv(c)(g0[1][a]))
      const g = g0.map((x) => idx.map((i) => x[i]))
      const names = SCENARIOS.map((s, i) => c.label(`scenario:${i}`, s))
      return {
        id: 'detailTable', kind: 'matrix', format: 'power', stackable: false,
        categories: idx.map((i) => blockName(c, OUTPUT_GROUPS[i].id, OUTPUT_GROUPS[i].label)),
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
    id: 'actorsAddr', title: 'Qui porte la demande ? [{unité} ; 2035]', subtitle: 'Par acteur et par scénario', kind: 'comparison', defaultChart: 'hbar', supportsInitial: true,
    build: (c) => {
      const ids = actorIds(c, (r, id) => lv(c)(actorBlock(r, id)))
      return {
        id: 'actorsAddr', kind: 'comparison', format: 'power', stackable: false,
        categories: ids.map((id) => actorName(c, id)), categoryIds: ids,
        series: [
          ...SCENARIOS.map((s, i) => ({ id: `s${i}`, name: c.label(`scenario:${i}`, s), values: ids.map((id) => lv(c)(actorBlock(c.snap.results[i], id))), total: lv(c)(c.snap.results[i]), tone: `scen${i}` })),
          ...(c.showInitial ? [initialSeries(c, ids.map((id) => lv(c)(actorBlock(c.snap.trajectory[1][0], id))))] : []),
        ],
      }
    },
  },
  {
    id: 'spreadByActor', title: 'Qui explique l\'écart entre scénarios ? [{unité} ; 2035]', subtitle: 'Écart Haut − Bas, par acteur', kind: 'comparison', defaultChart: 'hbar',
    build: (c) => {
      const lo = c.snap.results[0]
      const hi = c.snap.results[2]
      const spread = (id: Entity) => lv(c)(actorBlock(hi, id)) - lv(c)(actorBlock(lo, id))
      const ids = arrangeActors(c.actors, spread)
      return {
        id: 'spreadByActor', kind: 'comparison', format: 'power', stackable: false,
        categories: ids.map((id) => actorName(c, id)), categoryIds: ids,
        series: [{ id: 'spread', name: c.label('series:spread', 'Écart Haut − Bas'), values: ids.map(spread), total: lv(c)(hi) - lv(c)(lo), tone: 'accent' }],
      }
    },
  },

  // ------------------------------------------------------------- pages Acteurs
  {
    id: 'actorBridge', title: 'Lecture en cascade [{unité} ; 2026-2035]', subtitle: 'De la baseline 2026 à 2035 pour cet acteur, scénario affiché', kind: 'bridge', defaultChart: 'waterfall',
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
    id: 'actorScenarios', title: 'Besoin par scénario [{unité} ; 2026 et 2035]', subtitle: 'Avec la demande adressable en lecture adressable', kind: 'comparison', defaultChart: 'bar',
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
    id: 'actorTrajectory', title: 'Évolution du besoin [{unité} ; 2026-2035]', subtitle: 'Par scénario (profil annuel interpolé)', kind: 'timeseries', defaultChart: 'line', supportsInitial: true,
    build: (c) => {
      if (!c.actor) return noActor('actorTrajectory', 'timeseries')
      return {
        id: 'actorTrajectory', kind: 'timeseries', format: 'power', stackable: false, categories: years,
        series: SCENARIOS.map((s, i) => ({ id: `s${i}`, name: c.label(`scenario:${i}`, s), values: c.snap.trajectory[i].map((r) => lv(c)(actorBlock(r, c.actor!))), total: lv(c)(actorBlock(c.snap.results[i], c.actor!)), tone: `scen${i}` })),
      }
    },
  },
  {
    id: 'actorSensitivity', title: 'Quelles hypothèses comptent le plus ? [{unité} ; 2035]', subtitle: 'Impact sur cet acteur, de la valeur basse à la valeur haute', kind: 'sensitivity', defaultChart: 'tornado',
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
    id: 'actorTable', title: 'Détail du calcul [{unité} ; 2026-2035]', subtitle: 'De la baseline à 2035, par scénario', kind: 'matrix', defaultChart: 'table',
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
