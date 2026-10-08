import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { computeAll } from '../engine'
import { defaultParams } from '../hypotheses'
import { buildModel, getModel, setModel } from '../model'
import { fixture } from '../../test/withModel'
import { addr } from './workbook'

// Copie FIGÉE de l'Excel v4 (nouvel onglet 0_Sliding : RRI, SUMIFS ; hypothèses revues ; DPP dans « Autres entités publiques »)
describe('classeur Excel v4', () => {
  const buf = fixture('reference-v4.xlsx')
  const cached = XLSX.read(buf, { type: 'buffer', cellFormula: true })
  const withV4 = (fn: (m: ReturnType<typeof buildModel>) => void) => {
    const before = getModel()
    const m = buildModel(buf, { fileName: 'v4', source: 'file', loadedAt: 0 })
    setModel(m)
    try { fn(m) } finally { setModel(before) }
  }

  it('se charge sans erreur et toutes les formules (641) = valeurs enregistrées par Excel', () => {
    withV4((m) => {
      expect(m.diagnostics.filter((d) => d.level === 'error')).toEqual([])
      const run = m.wb.evaluate()
      const bad: string[] = []
      let n = 0
      for (const sh of m.wb.sheets) for (let r = 0; r < sh.rows; r++) for (let c = 0; c < sh.cols; c++) {
        if (!m.wb.isFormula(sh.id(r, c))) continue
        const w = cached.Sheets[sh.name][XLSX.utils.encode_cell({ r, c })]?.v
        if (w === undefined) continue
        n++
        const v = run.cell(sh, r, c)
        const ok = typeof w === 'number' ? typeof v === 'number' && Math.abs(v - w) <= 1e-9 * Math.max(1, Math.abs(w)) : v === w
        if (!ok) bad.push(`${sh.name}!${addr(r, c)}: ${String(v)} / ${String(w)}`)
      }
      expect(n).toBe(641)
      expect(bad).toEqual([])
    })
  })

  it('le dashboard donne les totaux et les valeurs par acteur de l\'Excel (2026 et 2035, Bas/Central/Haut)', () => {
    withV4((m) => {
      const out = cached.Sheets['3_Output']
      const r = computeAll(defaultParams())
      ;['C', 'D', 'E'].forEach((col, i) => {
        expect(r[i].base / 1000).toBeCloseTo(out[`${col}8`].v, 9)
        expect(r[i].total / 1000).toBeCloseTo(out[`${col}9`].v, 9)
        expect(r[i].addressable / 1000).toBeCloseTo(out[`${col}10`].v, 9)
      })
      expect(r.map((s) => s.addressable / 1000)).toEqual([1.2489, 2.5576, 4.9433].map((x) => expect.closeTo(x, 3)))
      const run = m.wb.evaluate()
      r.forEach((s, i) => s.blocks.forEach((b) => {
        const cells = m.scenarios[i].blocks[b.id]
        for (const k of ['base', 'need', 'ia', 'total', 'addressable'] as const) expect(b[k]).toBeCloseTo(run.get(cells[k]) as number, 6)
      }))
    })
  })
})
