import { describe, expect, it } from 'vitest'
import { computeAll, computeScenario, groupBlocks } from './engine'
import { defaultParams } from './hypotheses'
import { getModel } from './model'

// Valeurs de référence : onglet « 3_Output » du fichier Excel (valeurs enregistrées par Excel lui-même), lues à la volée.
function excelOutput() {
  const m = getModel()
  const out = m.wb.sheets.find((s) => /output/i.test(s.name))!
  const find = (re: RegExp) => { for (let r = 0; r < out.rows; r++) { const v = m.wb.consts[out.id(r, 1)]; if (typeof v === 'string' && re.test(v)) return r } throw new Error('ligne introuvable') }
  const rNeed = find(/Besoin IT total généré 2035/), rAdr = find(/Demande adressable Monaco 2035/), rBase = find(/Besoin IT total généré 2026/)
  const get = (r: number) => [2, 3, 4].map((c) => m.wb.consts[out.id(r, c)] as number)
  return { need: get(rNeed), adr: get(rAdr), base: get(rBase) }
}

describe('modèle = Excel (valeurs enregistrées dans le fichier)', () => {
  const r = computeAll(defaultParams())
  const x = excelOutput()
  it('besoin total 2035 (MW)', () => r.forEach((s, i) => expect(s.total / 1000).toBeCloseTo(x.need[i], 9)))
  it('demande adressable 2035 (MW)', () => r.forEach((s, i) => expect(s.addressable / 1000).toBeCloseTo(x.adr[i], 9)))
  it('baseline 2026 (MW)', () => r.forEach((s, i) => expect(s.base / 1000).toBeCloseTo(x.base[i], 9)))
  it('détail par groupe : somme = total adressable', () => {
    for (const s of r) expect(groupBlocks(s).reduce((a, g) => a + g.addressable, 0)).toBeCloseTo(s.addressable, 6)
  })
  it('trajectoire : 2026 = baseline, 2035 = Excel', () => {
    for (const s of [0, 1, 2]) {
      expect(computeScenario(defaultParams(), s, 0).base).toBeCloseTo(r[s].base, 6)
      expect(computeScenario(defaultParams(), s, 9).total).toBe(r[s].total)
    }
  })
  it('les valeurs par défaut viennent bien de l\'Excel (pas du code)', () => {
    const p = defaultParams()
    expect(p.adrFin).toEqual([0.2, 0.35, 0.5])
    expect(p.camBase).toEqual([1300])
  })
})
