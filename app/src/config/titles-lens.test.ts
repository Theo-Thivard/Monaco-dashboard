import { describe, expect, it } from 'vitest'
import { lensTextKey, resolveEntityText, resolveWidget } from './resolve'
import type { WidgetConfig } from './types'

const base: WidgetConfig = {
  id: 'c', kind: 'chart', tier: 'client', visible: true, title: 'Commun',
  lensOverrides: { addressable: { title: 'Adressable', subtitle: 'Sous-titre adressable' } },
  entityText: { 'scenario:0': { title: 'Bas' }, [lensTextKey('scenario:0', 'addressable')]: { title: 'Bas adressable' } },
}

describe('titres selon la lecture', () => {
  it('indépendants : chaque lecture a son titre', () => {
    expect(resolveWidget(base, 'need').title).toBe('Commun')
    expect(resolveWidget(base, 'addressable').title).toBe('Adressable')
    expect(resolveWidget(base, 'addressable').subtitle).toBe('Sous-titre adressable')
  })
  it('liés : le titre propre à la lecture est ignoré', () => {
    expect(resolveWidget(base, 'addressable', true).title).toBe('Commun')
    expect(resolveWidget(base, 'addressable', true).subtitle).toBeUndefined()
  })
  it('texte propre à un scénario : par lecture quand indépendants, commun quand liés', () => {
    expect(resolveEntityText(base, 'scenario:0', 'need', false).title).toBe('Bas')
    expect(resolveEntityText(base, 'scenario:0', 'addressable', false).title).toBe('Bas adressable')
    expect(resolveEntityText(base, 'scenario:0', 'addressable', true).title).toBe('Bas')
  })
})
