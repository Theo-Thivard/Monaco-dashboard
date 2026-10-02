import { readFileSync } from 'node:fs'
import { buildModel, getModel, setModel } from '../core/model'

export const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url))

/** Exécute `fn` avec un autre classeur chargé comme modèle, puis rétablit le modèle du dépôt. */
export function withModel<T>(file: string, fn: () => T): T {
  const before = getModel()
  setModel(buildModel(fixture(file), { fileName: file, source: 'file', loadedAt: 0 }))
  try { return fn() } finally { setModel(before) }
}
