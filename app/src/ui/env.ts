import { useMemo } from 'react'
import { ACTOR_BY_ID } from '../core/actors'
import { resolveTokens, type Tokens } from '../config/theme'
import type { DashboardConfig } from '../config/types'
import { DATASET_BY_ID, type Dataset, type DatasetCtx } from '../core/datasets'
import { fmt, fmtHyp, unitLabel, type FmtOptions, type FormatSettings } from '../core/format'
import { HYP_BY_ID, type FormatKind } from '../core/hypotheses'
import type { Snapshot } from '../core/snapshot'
import type { Route } from '../state/route'
import { useAppState, useConfig, useSnapshot } from '../state/store'

export interface Env {
  config: DashboardConfig
  snap: Snapshot
  tokens: Tokens
  f: FormatSettings
  fmt: (kind: FormatKind, v: number, o?: FmtOptions) => string
  unit: (kind: FormatKind) => string
  label: (key: string, def: string) => string
  hypLabel: (id: string) => string
  fmtHypValue: (id: string, v: number) => string
  scenarioName: (i: number) => string
  /** libellé d'un acteur (complet ou court), personnalisable */
  actorLabel: (id: import('../core/engine').Entity, short?: boolean) => string
  route: Route
}

const SCEN = ['Bas', 'Central', 'Haut']

/** Tout ce dont un composant a besoin pour afficher une valeur de façon cohérente. */
export function useEnv(): Env {
  const config = useConfig()
  const snap = useSnapshot()
  const route = useAppState((s) => s.route)
  return useMemo(() => {
    const f = config.format
    const label = (key: string, def: string) => config.labels[key] ?? def
    const hypLabel = (id: string) => label(`hyp:${id}`, HYP_BY_ID[id]?.label ?? id)
    return {
      config, snap, f,
      tokens: resolveTokens(config.theme.preset, config.theme.tokens),
      fmt: (k, v, o) => fmt(k, v, f, o),
      unit: (k) => unitLabel(k, f),
      label, hypLabel,
      fmtHypValue: (id, v) => {
        const h = HYP_BY_ID[id]
        if (h.options) return h.options.find((o) => o.value === v)?.label ?? String(v)
        return fmtHyp(h.unit, v, f)
      },
      scenarioName: (i) => label(`scenario:${i}`, SCEN[i]),
      actorLabel: (id, short) => label(`actor:${id}`, short ? ACTOR_BY_ID[id].short : ACTOR_BY_ID[id].label),
      route,
    }
  }, [config, snap, route])
}

export function useDataset(id: string | undefined, env: Env): Dataset | null {
  return useMemo(() => {
    const def = id ? DATASET_BY_ID[id] : undefined
    if (!def) return null
    const ctx: DatasetCtx = { snap: env.snap, label: env.label, hypLabel: env.hypLabel, fmtHypValue: env.fmtHypValue, actors: env.config.actors, actor: env.route.kind === 'actor' ? env.route.actor : undefined }
    return def.build(ctx)
  }, [id, env])
}
