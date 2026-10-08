import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { computeAll } from '../engine'
import { defaultParams } from '../hypotheses'
import { buildModel, getModel, setModel } from '../model'
import { fixture } from '../../test/withModel'

// Copie FIGÉE de l'Excel déposé le 08/10/2026 (soir) : public scindé en « DSP » et « hors DSP » (croissance et IA), lignes insérées dans 1_Inputs&Hyp.
describe('classeur Excel du 08/10/2026 (soir) : public DSP / hors DSP', () => {
  const buf = fixture('reference-v5c.xlsx')
  const cached = XLSX.read(buf, { type: 'buffer', cellFormula: true })
  const withIt = (fn: (m: ReturnType<typeof buildModel>) => void) => {
    const before = getModel()
    const m = buildModel(buf, { fileName: 'v5c', source: 'file', loadedAt: 0 })
    setModel(m)
    try { fn(m) } finally { setModel(before) }
  }

  it('se charge sans erreur ; « IA public hors DSP » garde les anciens réglages « IA public », « public DSP » est une nouvelle hypothèse', () => {
    withIt((m) => {
      expect(m.diagnostics.filter((d) => d.level === 'error')).toEqual([])
      const ia = m.hypDefs.find((h) => h.id === 'iaPub')!
      expect(ia.label).toBe('Besoins IT additionnels liés à l’IA – public hors DSP')
      expect(m.hypDefs.some((h) => h.label === 'Besoins IT additionnels liés à l’IA – public DSP' && h.id !== 'iaPub')).toBe(true)
      expect(m.hypDefs.some((h) => h.label === 'Croissance annuelle des besoins IT hors IA – public DSP' && h.id !== 'gIntPub')).toBe(true)
      expect(defaultParams().iaPub).toEqual([0.05, 0.1, 0.15])
    })
  })

  it('formules = valeurs enregistrées par Excel ; totaux et valeurs par acteur identiques (2026 et 2035)', () => {
    withIt((m) => {
      const run = m.wb.evaluate()
      for (const sh of m.wb.sheets) for (let r = 0; r < sh.rows; r++) for (let c = 0; c < sh.cols; c++) {
        if (!m.wb.isFormula(sh.id(r, c))) continue
        const w = cached.Sheets[sh.name][XLSX.utils.encode_cell({ r, c })]?.v
        if (typeof w !== 'number') continue
        const v = run.cell(sh, r, c)
        expect(typeof v === 'number' && Math.abs(v - w) <= 1e-9 * Math.max(1, Math.abs(w))).toBe(true)
      }
      const out = cached.Sheets['3_Output']
      const r = computeAll(defaultParams())
      ;['C', 'D', 'E'].forEach((col, i) => {
        expect(r[i].base / 1000).toBeCloseTo(out[`${col}8`].v, 9)
        expect(r[i].total / 1000).toBeCloseTo(out[`${col}9`].v, 9)
        expect(r[i].addressable / 1000).toBeCloseTo(out[`${col}10`].v, 9)
        r[i].blocks.forEach((b, j) => expect(b.addressable / 1000).toBeCloseTo(out[`${col}${19 + j}`].v, 9))
      })
      expect(r.map((s) => s.total / 1000)).toEqual([3.9779, 6.2004, 8.2134].map((x) => expect.closeTo(x, 3)))
      expect(r.map((s) => s.addressable / 1000)).toEqual([1.2687, 2.4039, 4.4849].map((x) => expect.closeTo(x, 3)))
    })
  })
})
