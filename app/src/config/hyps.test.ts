import { describe, expect, it } from 'vitest'
import { ACTORS } from '../core/actors'
import { DATASET_BY_ID } from '../core/datasets'
import { HYP_BY_ID } from '../core/hypotheses'
import { fillUnit } from '../core/titles'
import { buildSnapshot } from '../core/snapshot'
import { defaultParams } from '../core/hypotheses'
import { createDefaultConfig } from './defaults'
import { defaultHypSet, hypContext, hypsOf } from './hyps'

describe('bandeaux d\'hypothèses indépendants', () => {
  it('Besoins générés : intensités numériques et surcouches IA ; Besoins adressables : toutes les parts captables', () => {
    const need = defaultHypSet('need')
    expect(need.length).toBe(6)
    expect(need.every((id) => ['intensity', 'ai'].includes(HYP_BY_ID[id].role ?? ''))).toBe(true)
    const addr = defaultHypSet('addressable')
    expect(addr.length).toBe(6)
    expect(addr.every((id) => HYP_BY_ID[id].role === 'capture')).toBe(true)
  })
  it('chaque acteur a son propre bandeau (hypothèses qui le font varier)', () => {
    for (const a of ACTORS) {
      const set = defaultHypSet(`actor:${a.id}`)
      expect(set.length).toBeGreaterThan(0)
      expect(set.every((id) => HYP_BY_ID[id])).toBe(true)
    }
    expect(defaultHypSet('actor:FIN')).not.toEqual(defaultHypSet('actor:DSP'))
  })
  it('le contexte suit la page et la lecture', () => {
    expect(hypContext({ kind: 'global' }, 'need')).toBe('need')
    expect(hypContext({ kind: 'scenario', scenario: 0 }, 'addressable')).toBe('addressable')
    expect(hypContext({ kind: 'actor', actor: 'MT' }, 'addressable')).toBe('actor:MT')
  })
  it('modifier un bandeau ne touche pas les autres', async () => {
    const { toggleHypVisible, resetHypSet, getState } = await import('../state/store')
    const before = hypsOf(getState().config, 'addressable')
    toggleHypVisible('need', 'wPriv')
    expect(hypsOf(getState().config, 'need')).toContain('wPriv')
    expect(hypsOf(getState().config, 'addressable')).toEqual(before)
    expect(hypsOf(getState().config, 'actor:FIN')).toEqual(defaultHypSet('actor:FIN'))
    resetHypSet('need')
    expect(hypsOf(getState().config, 'need')).toEqual(defaultHypSet('need'))
  })
  it('config par défaut : aucun bandeau enregistré (ils suivent l\'Excel)', () => {
    expect(createDefaultConfig().hyps.sets).toEqual({})
  })
})

describe('légende « [unité ; date] »', () => {
  it('l\'unité remplace le jeton ; sans unité le séparateur disparaît', () => {
    expect(fillUnit('Évolution du besoin [{unité} ; 2026-2035]', 'MW IT')).toBe('Évolution du besoin [MW IT ; 2026-2035]')
    expect(fillUnit('Évolution du besoin [{unité} ; 2026-2035]', '')).toBe('Évolution du besoin [2026-2035]')
    expect(fillUnit('Sans jeton', 'MW')).toBe('Sans jeton')
  })
  it('tous les jeux de données ont une légende [unité ; date] sauf avis contraire', () => {
    for (const d of Object.values(DATASET_BY_ID)) expect(d.title, d.id).toMatch(/\[\{unité\} ; [\d\- et]+\]$/)
  })
})

describe('valeur initiale', () => {
  const ctx = (showInitial: boolean, lens: 'need' | 'addressable' = 'need') => ({ snap: buildSnapshot(defaultParams(), 1, lens), label: (_k: string, d: string) => d, hypLabel: (id: string) => id, fmtHypValue: (_id: string, v: number) => String(v), showInitial })
  it('répartition par bloc et par scénario : la barre 2026 vient en premier, grisée ; 3 barres 2035 ensuite', () => {
    const off = DATASET_BY_ID.addrByBlockScenario.build(ctx(false))
    const on = DATASET_BY_ID.addrByBlockScenario.build(ctx(true))
    expect(off.categories).toHaveLength(3)
    expect(on.categories).toHaveLength(4)
    expect(on.categories[0]).toContain('2026')
    expect(on.categories.slice(1).every((c) => c.includes('2035'))).toBe(true)
    expect(on.shaded).toMatchObject({ from: 0, to: 0 })
    // la barre 2026 = besoin 2026 du modèle (total de la première colonne = besoin de départ)
    const total2026 = on.series.reduce((a, s) => a + s.values[0], 0)
    expect(total2026).toBeCloseTo(buildSnapshot(defaultParams(), 1, 'need').results[1].base, 6)
    // les barres 2035 sont inchangées
    off.series.forEach((s, i) => expect(on.series[i].values.slice(1)).toEqual(s.values))
  })
  it('repère 2026 : un trait par catégorie, exclu des barres', () => {
    for (const id of ['addrByBlock', 'actorsAddr']) {
      const ds = DATASET_BY_ID[id].build(ctx(true))
      const m = ds.series.find((s) => s.marker)!
      expect(m.values).toHaveLength(ds.categories.length)
      expect(DATASET_BY_ID[id].build(ctx(false)).series.some((s) => s.marker)).toBe(false)
    }
  })
})
