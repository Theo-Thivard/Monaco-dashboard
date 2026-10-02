import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultConfig } from '../config/defaults'
import { branchName, REPO, saveConfigToBranch, savedFileContent } from './github'
import { sanitizeConfig, userDefaultConfig } from './store'

afterEach(() => vi.unstubAllGlobals())

describe('enregistrement GitHub', () => {
  it('nom de branche sûr et daté', () => {
    expect(branchName('Version client — Mars é!', new Date(2026, 2, 5, 9, 7))).toBe('affichage/version-client-mars-e-20260305-0907')
    expect(branchName('', new Date(2026, 0, 1, 0, 0))).toBe('affichage/preferences-20260101-0000')
  })
  it('crée la branche depuis main puis écrit le fichier dessus', async () => {
    const calls: { url: string; method: string; body?: any }[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(init.body as string) : undefined })
      const json = url.includes('/git/ref/') ? { object: { sha: 'abc' } } : url.includes('/contents/') && !init?.method ? { sha: 'old' } : {}
      return new Response(JSON.stringify(json), { status: 200 })
    }))
    const config = createDefaultConfig()
    const r = await saveConfigToBranch({ token: 't', label: 'test', message: 'm', config, now: new Date(2026, 0, 1, 10, 0) })
    expect(r.branch).toBe('affichage/test-20260101-1000')
    expect(calls.map((c) => c.method)).toEqual(['GET', 'POST', 'GET', 'PUT'])
    expect(calls[1].body).toEqual({ ref: 'refs/heads/affichage/test-20260101-1000', sha: 'abc' })
    expect(calls[3].body.branch).toBe(r.branch)
    expect(calls[3].body.sha).toBe('old')
    expect(JSON.parse(decodeURIComponent(escape(atob(calls[3].body.content))))).toEqual(JSON.parse(savedFileContent(config)))
    expect(r.compareUrl).toContain(`github.com/${REPO}/compare/main...affichage/test-20260101-1000`)
  })
  it('messages clairs : jeton refusé, branche existante', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })))
    await expect(saveConfigToBranch({ token: 'x', label: '', message: '', config: createDefaultConfig() })).rejects.toThrow(/Jeton refusé/)
  })
  it('sans affichage enregistré, le défaut est l\'affichage d\'origine ; un fichier enregistré se recharge à l\'identique', () => {
    expect(userDefaultConfig()).toEqual(sanitizeConfig(createDefaultConfig()))
    const c = createDefaultConfig()
    c.brand = 'Autre'
    c.pages.global.layout = c.pages.global.layout.map((l, i) => (i === 0 ? { ...l, h: 9 } : l))
    expect(sanitizeConfig(JSON.parse(savedFileContent(c)).config)).toEqual(c)
  })
})
