import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { computeAll } from '../engine'
import { defaultParams } from '../hypotheses'
import { buildModel, getModel, ModelError, setModel } from '../model'
import { addr, Workbook } from './workbook'

const fixture = (f: string) => readFileSync(new URL(`../../test/fixtures/${f}`, import.meta.url))
const expected: Record<string, number | string | boolean> = JSON.parse(fixture('modified.expected.json').toString())

describe('évaluateur de formules contre LibreOffice (classeur modifié : entrées + formules changées)', () => {
  const wb = Workbook.fromBuffer(fixture('modified.xlsx')) // sans valeurs enregistrées : tout est recalculé
  it('toutes les formules (427) = valeurs LibreOffice', () => {
    expect(wb.problems).toEqual([])
    const run = wb.evaluate()
    const bad: string[] = []
    let n = 0
    for (const sh of wb.sheets) for (let r = 0; r < sh.rows; r++) for (let c = 0; c < sh.cols; c++) {
      if (!wb.isFormula(sh.id(r, c))) continue
      const key = `${sh.name}!${addr(r, c)}`
      const want = expected[key]
      n++
      const v = run.cell(sh, r, c)
      const ok = typeof want === 'number' ? typeof v === 'number' && Math.abs(v - want) <= 1e-9 * Math.max(1, Math.abs(want)) : v === want
      if (!ok) bad.push(`${key}: ${String(v)} / ${String(want)}`)
    }
    expect(n).toBe(427)
    expect(bad).toEqual([])
  })

  it('le dashboard suit un classeur v5 modifié : résultats = onglet de synthèse recalculé par l\'évaluateur', () => {
    const x = XLSX.read(fixture('reference-v5.xlsx'), { type: 'buffer', cellFormula: true, sheetStubs: true })
    const inp = x.Sheets['1_Inputs&Hyp']
    inp['G47'] = { t: 'n', v: 0.42 } // part adressable finance (Central)
    inp['H40'] = { t: 'n', v: 0.35 } // surcouche IA public (Haut)
    inp['F57'] = { t: 'n', v: 1500 } // caméras 2026
    inp['G74'] = { t: 'n', v: 0.3 } // surcroît métier Pompiers (Central)
    const buf = XLSX.write(x, { type: 'array', bookType: 'xlsx' })
    const before = getModel()
    try {
      const m = buildModel(buf, { fileName: 'v5-modifie.xlsx', source: 'file', loadedAt: 0 })
      setModel(m)
      const r = computeAll(defaultParams())
      const run = m.wb.evaluate()
      const out = m.wb.sheet('3_Output')
      // 3_Output : C10:E10 = demande adressable 2035 (MW), C9:E9 = besoin total 2035 (MW)
      ;[2, 3, 4].forEach((col, i) => {
        expect(r[i].addressable / 1000).toBeCloseTo(run.cell(out, 9, col) as number, 9)
        expect(r[i].total / 1000).toBeCloseTo(run.cell(out, 8, col) as number, 9)
      })
      const p = defaultParams()
      expect(p.adrFin[1]).toBe(0.42)
      expect(p.iaPub[2]).toBe(0.35)
      expect(p.camBase[0]).toBe(1500)
      expect(p.santePomp[1]).toBe(0.3)
      // la valeur modifiée change bien le résultat par rapport au classeur d'origine
      expect(r[1].addressable / 1000).not.toBeCloseTo(1.9062276569738026, 3)
    } finally { setModel(before) }
  })
})

describe('liaison par intitulés', () => {
  it('un intitulé renommé dans l\'Excel est signalé clairement (pas de résultat faux en silence)', () => {
    const x = XLSX.read(fixture('reference-v5.xlsx'), { type: 'buffer', cellFormula: true, sheetStubs: true })
    const ws = x.Sheets['1_Inputs&Hyp']
    ws['D34'] = { t: 's', v: 'Croissance des effectifs du public' }
    const buf = XLSX.write(x, { type: 'array', bookType: 'xlsx' })
    let err: unknown
    try { buildModel(buf, { fileName: 'x.xlsx', source: 'file', loadedAt: 0 }) } catch (e) { err = e }
    expect(err).toBeInstanceOf(ModelError)
    expect(JSON.stringify((err as { diagnostics: unknown }).diagnostics)).toContain('Croissance annuelle effectifs publics')
  })
  it('une fonction Excel inconnue est signalée', () => {
    const x = XLSX.read(fixture('reference-v5.xlsx'), { type: 'buffer', cellFormula: true, sheetStubs: true })
    x.Sheets['2_Calculs']['I60'] = { t: 'n', v: 0, f: 'FONCTIONINCONNUE(E60)' }
    const buf = XLSX.write(x, { type: 'array', bookType: 'xlsx' })
    let err: unknown
    try { buildModel(buf, { fileName: 'x.xlsx', source: 'file', loadedAt: 0 }) } catch (e) { err = e }
    expect(JSON.stringify((err as { diagnostics: unknown }).diagnostics)).toMatch(/FONCTIONINCONNUE/)
  })
})
