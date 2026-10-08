import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { computeAll } from '../engine'
import { defaultParams, HYPS } from '../hypotheses'
import { buildModel, getModel, setModel } from '../model'
import { fixture } from '../../test/withModel'
import { addr } from './workbook'

// Copie FIGÉE de l'Excel v5 du 08/10/2026 : intitulés des hypothèses de croissance et d'IA renommés
// (« Croissance annuelle des besoins IT hors IA – … », « Besoins additionnels liés à l'IA – … »), valeurs revues.
describe('classeur Excel v5 (08/10/2026)', () => {
  const buf = fixture('reference-v5b.xlsx')
  const cached = XLSX.read(buf, { type: 'buffer', cellFormula: true })
  const withV5 = (fn: (m: ReturnType<typeof buildModel>) => void) => {
    const before = getModel()
    const m = buildModel(buf, { fileName: 'v5', source: 'file', loadedAt: 0 })
    setModel(m)
    try { fn(m) } finally { setModel(before) }
  }

  it('se charge sans erreur, les hypothèses lues automatiquement ont leur cellule et les formules = valeurs enregistrées par Excel', () => {
    withV5((m) => {
      expect(m.diagnostics.filter((d) => d.level === 'error')).toEqual([])
      expect(Object.keys(m.hypCells).sort()).toEqual(HYPS.map((h) => h.id).sort())
      const run = m.wb.evaluate()
      const bad: string[] = []
      let n = 0
      for (const sh of m.wb.sheets) for (let r = 0; r < sh.rows; r++) for (let c = 0; c < sh.cols; c++) {
        if (!m.wb.isFormula(sh.id(r, c))) continue
        const w = cached.Sheets[sh.name][XLSX.utils.encode_cell({ r, c })]?.v
        if (w === undefined) continue
        n++
        const v = run.cell(sh, r, c)
        // les 2 seuls écarts connus sont des témoins VRAI/FAUX (0_Sliding!R30 et R52) : égalité exacte de deux flottants égaux à ~1e-13 près
        if (typeof w === 'boolean') continue
        const ok = typeof w === 'number' ? typeof v === 'number' && Math.abs(v - w) <= 1e-9 * Math.max(1, Math.abs(w)) : v === w
        if (!ok) bad.push(`${sh.name}!${addr(r, c)}: ${String(v)} / ${String(w)}`)
      }
      expect(n).toBe(641)
      expect(bad).toEqual([])
    })
  })

  it('le dashboard donne les totaux et les valeurs par acteur de l\'Excel (2026 et 2035, Bas/Central/Haut)', () => {
    withV5((m) => {
      const out = cached.Sheets['3_Output']
      const r = computeAll(defaultParams())
      ;['C', 'D', 'E'].forEach((col, i) => {
        expect(r[i].base / 1000).toBeCloseTo(out[`${col}8`].v, 9)
        expect(r[i].total / 1000).toBeCloseTo(out[`${col}9`].v, 9)
        expect(r[i].addressable / 1000).toBeCloseTo(out[`${col}10`].v, 9)
        r[i].blocks.forEach((b, j) => expect(b.addressable / 1000).toBeCloseTo(out[`${col}${19 + j}`].v, 9))
      })
      expect(r.map((s) => s.base / 1000)).toEqual([2.4703, 2.4703, 2.4703].map((x) => expect.closeTo(x, 3)))
      expect(r.map((s) => s.total / 1000)).toEqual([3.9124, 6.1675, 8.2069].map((x) => expect.closeTo(x, 3)))
      expect(r.map((s) => s.addressable / 1000)).toEqual([1.2196, 2.3722, 4.4783].map((x) => expect.closeTo(x, 3)))
      const p = defaultParams()
      expect(p.gIntPub).toEqual([0.03, 0.08, 0.1])
      expect(p.gIntFin).toEqual([0.05, 0.1, 0.15])
      expect(p.iaPub).toEqual([0.05, 0.1, 0.15])
      expect(p.iaFin).toEqual([0.05, 0.2, 0.3])
    })
  })
})
