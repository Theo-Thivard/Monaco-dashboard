import { readdirSync, readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { computeAll } from '../engine'
import { defaultParams, HYP_BY_ID } from '../hypotheses'
import { buildModel, ModelError, setModel, type Model } from '../model'
import { fixture } from '../../test/withModel'

// Un nouvel Excel ne doit pas faire tomber tout le dashboard : seules les anomalies qui touchent le calcul sont bloquantes.
const repoRoot = new URL('../../../../', import.meta.url)
const repoFile = readdirSync(repoRoot).filter((f) => /^Monaco_Besoins_IT_v\d+\.xlsx$/.test(f)).sort((a, b) => Number(b.match(/v(\d+)/)![1]) - Number(a.match(/v(\d+)/)![1]))[0]
const repoBuf = readFileSync(new URL(repoFile, repoRoot))

/** Charge une variante modifiée du classeur v5 (`edit` reçoit le classeur SheetJS). */
function load(edit: (x: XLSX.WorkBook, m: Model) => void): Model {
  const ref = buildModel(fixture('reference-v5b.xlsx'), { fileName: 'ref', source: 'file', loadedAt: 0 })
  const x = XLSX.read(fixture('reference-v5b.xlsx'), { type: 'buffer', cellFormula: true })
  edit(x, ref)
  const buf = XLSX.write(x, { type: 'buffer', bookType: 'xlsx' })
  const m = buildModel(buf, { fileName: 'variante', source: 'file', loadedAt: 0 })
  setModel(m)
  return m
}
const label = (x: XLSX.WorkBook, text: string): string => {
  const ws = x.Sheets['1_Inputs&Hyp']
  const k = Object.keys(ws).find((c) => c[0] !== '!' && ws[c].t === 's' && ws[c].v === text)
  if (!k) throw new Error('intitulé absent de la fixture : ' + text)
  return k
}
const totals = () => computeAll(defaultParams()).map((r) => [r.total / 1000, r.addressable / 1000])

afterEach(() => { setModel(buildModel(repoBuf, { fileName: repoFile, source: 'file', loadedAt: 0 })) })

describe('lecture robuste de l\'Excel', () => {
  const expected = (() => { load(() => {}); return totals() })()

  it('un onglet de slides avec des fonctions inconnues ne bloque pas le chargement ni les chiffres', () => {
    const m = load((x) => {
      XLSX.utils.book_append_sheet(x, XLSX.utils.aoa_to_sheet([['slide'], [1]]), '4_Slides')
      const ws = x.Sheets['4_Slides']
      ws.B1 = { t: 'n', v: 0, f: 'FONCTION_INCONNUE(A2)' }
      ws.B2 = { t: 'n', v: 0, f: "LAMBDA_BIZARRE('1_Inputs&Hyp'!A1)" }
      ws['!ref'] = 'A1:B2'
    })
    expect(m.diagnostics.filter((d) => d.level === 'error')).toEqual([])
    const w = m.diagnostics.find((d) => /non prises en charge/.test(d.message))
    expect(w?.message).toMatch(/4_Slides!B1/)
    expect(totals()).toEqual(expected)
  })

  it('une formule illisible dans une cellule inutilisée de l\'onglet des hypothèses reste un simple avertissement', () => {
    const m = load((x) => { x.Sheets['1_Inputs&Hyp'].ZZ200 = { t: 'n', v: 0, f: 'SI((' }; x.Sheets['1_Inputs&Hyp']['!ref'] = 'A1:ZZ200' })
    expect(m.diagnostics.filter((d) => d.level === 'error')).toEqual([])
    expect(totals()).toEqual(expected)
  })

  it('une fonction inconnue dans une cellule qui sert au calcul est refusée avec la cellule et la fonction en cause', () => {
    let target = ''
    expect(() => load((x, ref) => {
      const g = ref.scenarios[0].blocks.DSP.total
      target = ref.wb.where(g)
      const [sh, a] = target.split('!')
      x.Sheets[sh][a] = { t: 'n', v: 1, f: 'FONCTION_INCONNUE(1)' }
    })).toThrowError(ModelError)
    try { load((x, ref) => { const [sh, a] = ref.wb.where(ref.scenarios[0].blocks.DSP.total).split('!'); x.Sheets[sh][a] = { t: 'n', v: 1, f: 'FONCTION_INCONNUE(1)' } }) } catch (e) {
      const d = (e as { diagnostics: { message: string; where?: string }[] }).diagnostics
      expect(d[0].message).toMatch(/FONCTION_INCONNUE/)
      expect(d[0].where).toBe(target)
    }
  })

  it('une hypothèse renommée garde son identifiant (réglages enregistrés) et prend le nom de l\'Excel', () => {
    const m = load((x) => {
      const k = label(x, 'Croissance annuelle effectifs finance')
      x.Sheets['1_Inputs&Hyp'][k].v = 'Croissance annuelle des effectifs de la finance (2026-2035)'
    })
    expect(m.diagnostics.filter((d) => d.level === 'error')).toEqual([])
    expect(HYP_BY_ID.gEffFin.label).toBe('Croissance annuelle des effectifs de la finance (2026-2035)')
    expect(Object.keys(m.hypCells)).toHaveLength(24)
    expect(totals()).toEqual(expected)
  })

  it('une hypothèse entièrement renommée devient une nouvelle hypothèse (nom de l\'Excel), les chiffres ne bougent pas', () => {
    const m = load((x) => { x.Sheets['1_Inputs&Hyp'][label(x, 'Ajout annuel de caméras')].v = 'Rythme de pose des caméras' })
    expect(m.diagnostics.filter((d) => d.level === 'error')).toEqual([])
    const h = m.hypDefs.find((d) => d.label === 'Rythme de pose des caméras')
    expect(h?.id).toBe('rythme-de-pose-des-cameras')
    expect(HYP_BY_ID.camAdd).toBeUndefined()
    expect(m.hypDefs).toHaveLength(24)
    expect(totals()).toEqual(expected)
  })

  it('une hypothèse ajoutée dans l\'Excel apparaît toute seule (curseur, unité, groupe), une ligne qui ne sert à rien est signalée', () => {
    const m = load((x) => {
      const ws = x.Sheets['1_Inputs&Hyp']
      ws.D63 = { t: 's', v: 'Caméras supplémentaires en 2035' }
      ws.E63 = { t: 's', v: 'caméras' }
      ws.F63 = { t: 'n', v: 0 }
      ws.F59 = { t: 'n', v: 1750, f: 'F57+9*F58+F63' }
      ws['!ref'] = 'A1:P120'
    })
    expect(m.diagnostics.filter((d) => d.level === 'error')).toEqual([])
    const h = m.hypDefs.find((d) => d.label === 'Caméras supplémentaires en 2035')!
    expect(h).toMatchObject({ unit: 'count', single: true, def: [0], id: 'cameras-supplementaires-en-2035' })
    expect(m.hypDefs).toHaveLength(25)
    expect(m.hypCategories.find((c) => c.id === h.category)?.title).toMatch(/Hypothèses DSP/)
    expect(m.diagnostics.some((d) => /n'alimentent aucun résultat/.test(d.message) && /Résolution actuelle/.test(d.message))).toBe(true)
    expect(totals()).toEqual(expected)
  })

  it('une hypothèse retirée de l\'Excel disparaît du dashboard sans le casser', () => {
    const m = load((x) => { delete x.Sheets['1_Inputs&Hyp'][label(x, 'Ajout annuel de caméras')] })
    expect(m.diagnostics.filter((d) => d.level === 'error')).toEqual([])
    expect(HYP_BY_ID.camAdd).toBeUndefined()
    expect(m.hypDefs).toHaveLength(23)
  })

  it('la plage du curseur peut être fixée dans l\'Excel (colonnes Min / Max / Pas)', () => {
    const m = load((x) => {
      const ws = x.Sheets['1_Inputs&Hyp']
      ws.K33 = { t: 's', v: 'Min' }; ws.L33 = { t: 's', v: 'Max' }; ws.M33 = { t: 's', v: 'Pas' }
      ws.K47 = { t: 'n', v: 0.1 }; ws.L47 = { t: 'n', v: 0.8 }; ws.M47 = { t: 'n', v: 0.05 }
    })
    expect(HYP_BY_ID.adrFin).toMatchObject({ min: 0.1, max: 0.8, step: 0.05 })
    expect(m.hypDefs).toHaveLength(24)
  })

  it('un fichier qui n\'est pas un classeur donne un message clair', () => {
    expect(() => buildModel(new Uint8Array([1, 2, 3, 4]), { fileName: 'x', source: 'file', loadedAt: 0 })).toThrowError(/illisible|introuvable/)
  })

  it('v5 : chiffres inchangés (2026 = 2,47 ; 2035 : besoin 3,91 / 6,17 / 8,21 ; adressable 1,22 / 2,37 / 4,48 MW IT)', () => {
    load(() => {})
    const r = computeAll(defaultParams())
    expect(r.map((s) => s.base / 1000)).toEqual([2.4703, 2.4703, 2.4703].map((v) => expect.closeTo(v, 3)))
    expect(r.map((s) => s.total / 1000)).toEqual([3.9124, 6.1675, 8.2069].map((v) => expect.closeTo(v, 3)))
    expect(r.map((s) => s.addressable / 1000)).toEqual([1.2196, 2.3722, 4.4783].map((v) => expect.closeTo(v, 3)))
  })

  it('réglages enregistrés : les identifiants d\'avant (v4, v5) sont conservés, ceux d\'hypothèses disparues sont ignorés', async () => {
    const { sanitizeConfig } = await import('../../state/store')
    load(() => {})
    const c = sanitizeConfig({ hyps: { sets: { need: ['gIntPub', 'gPomp', 'inconnue'], addressable: ['adrFin'] }, notes: {} } })
    expect(c.hyps.sets.need).toEqual(['gIntPub'])
    expect(c.hyps.sets.addressable).toEqual(['adrFin'])
  })

  it('v4 et v5 donnent les mêmes identifiants d\'hypothèses (mêmes réglages enregistrés) avec chacun les noms de son Excel', () => {
    const v4 = buildModel(fixture('reference-v4.xlsx'), { fileName: 'v4', source: 'file', loadedAt: 0 })
    const v5 = buildModel(fixture('reference-v5b.xlsx'), { fileName: 'v5', source: 'file', loadedAt: 0 })
    expect(v4.hypDefs.map((h) => h.id).sort()).toEqual(v5.hypDefs.map((h) => h.id).sort())
    expect(v4.hypDefs.find((h) => h.id === 'gIntPub')!.label).toMatch(/intensité numérique/)
    expect(v5.hypDefs.find((h) => h.id === 'gIntPub')!.label).toMatch(/besoins IT hors IA/)
  })
})
