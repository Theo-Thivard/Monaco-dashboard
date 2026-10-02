import { describe, expect, it } from 'vitest'
import { ACTORS } from '../core/actors'
import { DEFAULT_ROUTE, formatRoute, parseRoute, type Route } from './route'

const ALL: Route[] = [
  { kind: 'global' },
  ...[0, 1, 2].map((scenario): Route => ({ kind: 'scenario', scenario })),
  ...ACTORS.map((a): Route => ({ kind: 'actor', actor: a.id })),
]

describe('routes', () => {
  it('11 pages : Globale, 3 scénarios, 8 acteurs', () => expect(ALL).toHaveLength(12))
  it.each(ALL)('aller-retour %j', (r) => {
    const h = formatRoute(r)
    expect(h.startsWith('#/')).toBe(true)
    expect(parseRoute(h)).toEqual(r)
  })
  it('adresses lisibles', () => {
    expect(formatRoute({ kind: 'global' })).toBe('#/globale')
    expect(formatRoute({ kind: 'scenario', scenario: 1 })).toBe('#/scenario/central')
    expect(formatRoute({ kind: 'actor', actor: 'MT' })).toBe('#/acteur/monaco-telecom')
  })
  it('tolérant : inconnu, vide, requête de partage', () => {
    expect(parseRoute('')).toEqual(DEFAULT_ROUTE)
    expect(parseRoute('#/scenario/inconnu')).toEqual(DEFAULT_ROUTE)
    expect(parseRoute('#/acteur/xyz')).toEqual(DEFAULT_ROUTE)
    expect(parseRoute('#/scenario/haut?s=abc')).toEqual({ kind: 'scenario', scenario: 2 })
    expect(parseRoute('#s=abc')).toEqual(DEFAULT_ROUTE) // ancien format de partage -> Globale
  })
  it('une seule route par page (adresses uniques)', () => expect(new Set(ALL.map(formatRoute)).size).toBe(ALL.length))
})
