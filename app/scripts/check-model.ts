// Vérifie que l'Excel qui va être mis en ligne (public/model.xlsx, copié par sync-model.mjs) est lisible par le dashboard.
// Échoue (code 1) avec un message précis (cellule, fonction, intitulé) s'il ne l'est pas : la publication s'arrête alors,
// et le site en ligne reste celui qui fonctionne. Les avertissements sont affichés mais ne bloquent pas.
// Usage : npx vite-node scripts/check-model.ts [fichier.xlsx]
import { readFileSync } from 'node:fs'
import { buildModel, ModelError, type Diagnostic } from '../src/core/model'

const file = process.argv[2] ?? new URL('../public/model.xlsx', import.meta.url).pathname
const fmt = (d: Diagnostic) => `${d.message}${d.where ? ` (${d.where})` : ''}`
const ci = !!process.env.GITHUB_ACTIONS
const out = (level: 'error' | 'warning', msg: string) => console.log(ci ? `::${level}::${msg.replace(/\n/g, ' ')}` : `${level === 'error' ? '✕' : '⚠'} ${msg}`)

try {
  const m = buildModel(readFileSync(file), { fileName: file, source: 'file', loadedAt: 0 })
  for (const d of m.diagnostics) out('warning', fmt(d))
  console.log(`Excel lisible par le dashboard : ${m.wb.sheets.length} onglets, ${m.wb.formulaCount} formules, ${Object.keys(m.hypCells).length} hypothèses reliées.`)
} catch (e) {
  const diag = (e as { diagnostics?: Diagnostic[] }).diagnostics ?? []
  out('error', e instanceof ModelError ? e.message : String(e))
  for (const d of diag.filter((x) => x.level === 'error')) out('error', fmt(d))
  console.log("\nL'Excel ne peut pas être lu par le dashboard : publication annulée, le site en ligne n'est pas modifié.")
  process.exit(1)
}
