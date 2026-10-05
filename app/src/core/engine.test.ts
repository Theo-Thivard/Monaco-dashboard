import { describe, expect, it } from 'vitest'
import { computeAll, computeScenario, groupBlocks } from './engine'
import { defaultParams } from './hypotheses'
import { getModel } from './model'
import { withModel } from '../test/withModel'

// Valeurs de référence : onglet « 3_Output » du fichier Excel (valeurs enregistrées par Excel lui-même), lues à la volée.
function excelOutput() {
  const m = getModel()
  const out = m.wb.sheets.find((s) => /output/i.test(s.name))!
  const find = (re: RegExp) => { for (let r = 0; r < out.rows; r++) { const v = m.wb.consts[out.id(r, 1)]; if (typeof v === 'string' && re.test(v)) return r } throw new Error('ligne introuvable') }
  const rNeed = find(/Besoin IT total généré 2035/), rAdr = find(/Demande adressable Monaco 2035/), rBase = find(/Besoin IT total généré 2026/)
  const get = (r: number) => [2, 3, 4].map((c) => m.wb.consts[out.id(r, c)] as number)
  return { need: get(rNeed), adr: get(rAdr), base: get(rBase) }
}

// Si le fichier a été enregistré sans valeurs calculées (outil qui ne recalcule pas), cette comparaison est sans objet.
const x = excelOutput()
const hasCache = [...x.need, ...x.adr, ...x.base].every((v) => typeof v === 'number')

describe.skipIf(!hasCache)('modèle = Excel (valeurs enregistrées dans le fichier)', () => {
  const r = computeAll(defaultParams())
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
  it('les valeurs par défaut sont exactement celles des cellules de l\'Excel (pas du code)', () => {
    const m = getModel()
    const run = m.wb.evaluate()
    const p = defaultParams()
    for (const [id, cells] of Object.entries(m.hypCells)) expect(p[id]).toEqual(cells.map((g) => run.get(g)))
  })
})

describe('valeurs de référence figées (copie du classeur v5 du 05/10/2026)', () => {
  it('résultats 2035 et hypothèses lues', () => {
    withModel('reference-v5.xlsx', () => {
      const r = computeAll(defaultParams())
      expect(r.map((s) => s.addressable / 1000)).toEqual([1.1213760384678262, 1.9062276569738026, 3.9300297029725657].map((x) => expect.closeTo(x, 9)))
      expect(r.map((s) => s.total / 1000)).toEqual([3.466290394887882, 4.705153308014733, 6.799060319493886].map((x) => expect.closeTo(x, 9)))
      expect(defaultParams().adrFin).toEqual([0.2, 0.35, 0.5])
      expect(defaultParams().camBase).toEqual([1300])
      expect(defaultParams().santePomp).toEqual([0.075, 0.12, 0.25]) // bloc « Hypothèses Pompiers » (distinct de celui du CHPG)
      expect(defaultParams().santeChpg).toEqual([0.05, 0.1, 0.2])
      expect(r[0].blocks.map((b) => b.id)).toEqual(['DSP', 'AUTRES', 'POMP', 'DITN', 'CHPG', 'MT', 'FIN', 'PRIV'])
    })
  })
})
