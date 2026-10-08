import { describe, expect, it } from 'vitest'
import { parseFormula } from './parser'
import { Workbook } from './workbook'
import { XlError } from './functions'

import { fixture } from '../../test/withModel'
// Copie FIGÉE du classeur v5 : ces tests ne changent pas quand le classeur du dépôt est modifié.
// nombre de formules du classeur v5
const FORMULAS = 441
const buf = fixture('reference-v5.xlsx')

describe('formules Excel : analyse', () => {
  it('précédences d\'Excel', () => {
    const ev = (f: string) => {
      const wb = Workbook.fromBuffer(mini(f))
      return wb.evaluate().at('S', 'A1')
    }
    expect(ev('=2+3*4')).toBe(14)
    expect(ev('=-2^2')).toBe(4) // la négation est plus prioritaire que ^
    expect(ev('=2^3^2')).toBe(64) // ^ associatif à gauche
    expect(ev('=10%*3')).toBeCloseTo(0.3)
    expect(ev('=(1+2)*3')).toBe(9)
    expect(ev('="a"&"b"&1')).toBe('ab1')
    expect(ev('=IF(1<2,"oui","non")')).toBe('oui')
    expect(ev('=IFERROR(1/0,7)')).toBe(7)
    expect(ev('=SUM(1,2,3)')).toBe(6)
    expect(ev('=MAX(1,5,3)-MIN(4,2)')).toBe(3)
    expect(ev('=ROUND(2.345,2)')).toBeCloseTo(2.35)
    expect(ev('=XLOOKUP("b",{"a","b"},{1,2})')).toBeInstanceOf(XlError) // matrices littérales non gérées -> erreur explicite
  })
  it('RRI, SUMIFS et égalité à 15 chiffres (onglet 0_Sliding de l\'Excel v4)', () => {
    const ev = (f: string) => Workbook.fromBuffer(mini(f)).evaluate().at('S', 'A1')
    expect(ev('=RRI(9,100,200)')).toBeCloseTo(Math.pow(2, 1 / 9) - 1, 12)
    expect(ev('=RRI(0,100,200)')).toBeInstanceOf(XlError)
    expect(ev('=RRI(9,0,200)')).toBeInstanceOf(XlError)
    expect(ev('=1+RRI(9,5,5)')).toBe(1)
    expect(ev('=SUMIFS(B1:B1,B1:B1,">0")')).toBe(0)
    expect(ev('=(0.1+0.2)=0.3')).toBe(true)
    expect(ev('=(0.1+0.2)>0.3')).toBe(false)
  })
  it('analyse sans lever pour toutes les formes du fichier', () => {
    expect(() => parseFormula("(1+_xlfn.XLOOKUP($D$56,$F$33:$H$33,$F$34:$H$34))^9")).not.toThrow()
    expect(() => parseFormula("'1_Inputs&Hyp'!F59/'1_Inputs&Hyp'!F57*A1")).not.toThrow()
    expect(() => parseFormula('SUM(A:A, 1:2, B2:C3)')).not.toThrow()
  })
})

import * as XLSX from 'xlsx'
function mini(formula: string): Uint8Array {
  const ws: XLSX.WorkSheet = { '!ref': 'A1:A1', A1: { t: 'n', v: 0, f: formula.slice(1) } as XLSX.CellObject }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'S')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array
}

describe('classeur v5 (copie figée) : évaluateur contre les valeurs enregistrées par Excel', () => {
  const wb = Workbook.fromBuffer(buf)
  const cached = XLSX.read(buf, { type: 'buffer', cellFormula: true })

  it('aucune formule illisible ni fonction inconnue', () => {
    expect(wb.problems).toEqual([])
    expect(wb.formulaCount).toBe(FORMULAS)
  })

  it('CHAQUE formule recalculée = valeur enregistrée dans le fichier', () => {
    const run = wb.evaluate()
    let n = 0
    const bad: string[] = []
    for (const sh of wb.sheets) {
      const ws = cached.Sheets[sh.name]
      for (const key of Object.keys(ws)) {
        if (key[0] === '!') continue
        const c = ws[key] as XLSX.CellObject
        if (!c.f) continue
        const rc = XLSX.utils.decode_cell(key)
        const v = run.cell(sh, rc.r, rc.c)
        n++
        const want = c.v
        const ok = typeof want === 'number' ? typeof v === 'number' && Math.abs(v - want) <= 1e-9 * Math.max(1, Math.abs(want)) : v === want
        if (!ok) bad.push(`${sh.name}!${key}: calculé ${String(v)} / Excel ${String(want)}`)
      }
    }
    expect(n).toBe(FORMULAS)
    expect(bad).toEqual([])
  })

  it('les formules modifiées en v5 (CHPG, Pompiers) sont bien celles évaluées', () => {
    const sh = wb.sheet('2_Calculs')
    expect(wb.formulaOf(sh, 62, 8)).toBe('H$13*F63*G63+G$13*H63') // I63 (CHPG)
    expect(wb.formulaOf(sh, 60, 8)).toBe('H$11*F61*G61+G$11*H61') // I61 (Corps Sapeurs Pompiers)
  })
})
