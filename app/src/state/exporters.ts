// Exports : CSV (ouvrable dans Excel) et impression PDF. Les valeurs exportées
// sont les valeurs BRUTES du modèle (pleine précision), pas les valeurs arrondies de l'affichage.

import { DATASET_BY_ID } from '../core/datasets'
import { HYPS } from '../core/hypotheses'
import { KPI_DEFS, kpiValue } from '../core/kpis'
import type { Env } from '../ui/env'

const cell = (v: string | number) => (typeof v === 'number' ? String(v).replace('.', ',') : `"${String(v).replace(/"/g, '""')}"`)
const row = (...v: (string | number)[]) => v.map(cell).join(';')

export function buildCSV(env: Env): string {
  const { snap } = env
  const out: string[] = []
  out.push(row('Hypothèses'))
  out.push(row('Libellé', 'Unité', 'Bas', 'Central', 'Haut', 'Défaut Bas', 'Défaut Central', 'Défaut Haut', 'Source'))
  for (const h of HYPS) {
    const p = snap.params[h.id]
    const d = h.def
    const three = (a: number[]) => (a.length === 1 ? [a[0], a[0], a[0]] : a)
    out.push(row(env.hypLabel(h.id), h.unit === 'pct' ? 'fraction' : h.unit, ...three(p), ...three(d), h.source))
  }
  out.push('')
  out.push(row('Indicateurs 2035 (kW pour les puissances)'))
  out.push(row('Indicateur', ...[0, 1, 2].map((i) => env.scenarioName(i))))
  for (const k of KPI_DEFS) out.push(row(env.label(`kpi:${k.id}`, k.label), ...snap.results.map((r) => kpiValue(k, r, snap.results))))
  out.push('')
  const ds = DATASET_BY_ID.detailTable.build({ snap, label: env.label, hypLabel: env.hypLabel, fmtHypValue: env.fmtHypValue })
  out.push(row(DATASET_BY_ID.detailTable.title.replace(/\s*\[.*\]/, '') + ' (kW)'))
  out.push(row('Bloc', ...ds.series.map((s) => s.name)))
  ds.categories.forEach((c, i) => out.push(row(c, ...ds.series.map((s) => s.values[i]))))
  out.push(row('Total', ...ds.series.map((s) => s.total ?? '')))
  return '﻿' + out.join('\r\n')
}

export function download(name: string, text: string, mime: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: mime }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export const printPage = () => window.print()
