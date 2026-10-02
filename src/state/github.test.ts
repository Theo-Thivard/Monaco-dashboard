import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultConfig } from '../config/defaults'
import { PAGES_URL, saveVariant, variantFileContent, variantSlug } from './github'
import { sanitizeConfig, userDefaultConfig } from './store'

afterEach(() => vi.unstubAllGlobals())

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)))
type Call = { url: string; method: string; body?: any }

function stub(opts: { index?: unknown[]; mergeStatus?: number } = {}) {
  const calls: Call[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    calls.push({ url, method, body: init?.body ? JSON.parse(init.body as string) : undefined })
    if (url.includes('/git/ref/')) return new Response(JSON.stringify({ object: { sha: 'abc' } }))
    if (method === 'GET' && url.includes('variants/index.json')) return new Response(JSON.stringify({ sha: 'idx', content: b64(JSON.stringify(opts.index ?? [])) }))
    if (url.endsWith('/pulls')) return new Response(JSON.stringify({ number: 7, html_url: 'https://github.com/x/pull/7' }))
    if (url.includes('/merge')) return new Response('{}', { status: opts.mergeStatus ?? 200 })
    return new Response('{}')
  }))
  return calls
}

describe('enregistrement d\'un affichage comme nouvelle publication', () => {
  it('nom unique et lisible', () => {
    expect(variantSlug('v6', 'Vue client — Mars é!')).toBe('v6-vue-client-mars-e')
    expect(variantSlug('v6', '', [])).toBe('v6-affichage')
    expect(variantSlug('v6', 'Client', ['v6-client', 'v6-client-2'])).toBe('v6-client-3')
  })
  it('branche, fichiers, pull request puis fusion ; l\'existant n\'est jamais écrasé', async () => {
    const calls = stub({ index: [{ slug: 'v6-ancien', label: 'V6 · ancien', base: 'v6', created: '2026-01-01' }] })
    const config = createDefaultConfig()
    const r = await saveVariant({ token: 't', name: 'Client', base: { slug: 'v6', label: 'V6' }, config, now: new Date('2026-10-02T10:00:00Z') })
    expect(r).toMatchObject({ slug: 'v6-client', label: 'V6 · Client', merged: true, prUrl: 'https://github.com/x/pull/7', url: `${PAGES_URL}v6-client/` })
    const puts = calls.filter((c) => c.method === 'PUT' && c.url.includes('/contents/'))
    expect(puts.map((c) => c.url.split('/contents/')[1])).toEqual(['variants/v6-client.json', 'variants/index.json'])
    expect(JSON.parse(decodeURIComponent(escape(atob(puts[0].body.content))))).toEqual(JSON.parse(variantFileContent(config)))
    const idx = JSON.parse(decodeURIComponent(escape(atob(puts[1].body.content))))
    expect(idx.map((e: { slug: string }) => e.slug)).toEqual(['v6-ancien', 'v6-client']) // l'ancien affichage reste dans la liste
    expect(puts[1].body.sha).toBe('idx')
    expect(calls.some((c) => c.url.endsWith('/pulls') && c.body.base === 'main' && c.body.head === 'affichage/v6-client')).toBe(true)
    expect(calls[calls.length - 1].url).toContain('/pulls/7/merge')
  })
  it('fusion refusée : la pull request reste ouverte et on le dit', async () => {
    stub({ mergeStatus: 403 })
    const r = await saveVariant({ token: 't', name: 'X', base: { slug: 'v6', label: 'V6' }, config: createDefaultConfig() })
    expect(r.merged).toBe(false)
    expect(r.mergeError).toMatch(/Accès refusé/)
  })
  it('jeton refusé', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })))
    await expect(saveVariant({ token: 'x', name: '', base: { slug: 'v6', label: 'V6' }, config: createDefaultConfig() })).rejects.toThrow(/Jeton refusé/)
  })
  it('sans affichage enregistré : défaut d\'origine ; un fichier enregistré se recharge à l\'identique', () => {
    expect(userDefaultConfig()).toEqual(createDefaultConfig())
    const c = createDefaultConfig()
    c.brand = 'Autre'
    c.pages.global.layout = c.pages.global.layout.map((l, i) => (i === 0 ? { ...l, h: 9 } : l))
    expect(sanitizeConfig(JSON.parse(variantFileContent(c)).config)).toEqual(c)
  })
})
