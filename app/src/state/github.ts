// Enregistrement d'un affichage comme NOUVELLE publication du tableau de bord (« V4 · nom »), sans toucher à l'existante.
// Appels directs à l'API GitHub depuis le navigateur avec un jeton personnel de l'utilisateur (jamais stocké dans le dépôt) :
// branche → fichiers `app/variants/` → pull request → fusion. Le déploiement publie ensuite https://…/<slug>/.

import type { DashboardConfig } from '../config/types'

export const REPO = 'Theo-Thivard/Monaco-dashboard'
export const BASE_BRANCH = 'main'
export const PAGES_URL = 'https://theo-thivard.github.io/Monaco-dashboard/'
export const TOKEN_HELP_URL = 'https://github.com/settings/personal-access-tokens/new'

export interface VariantEntry { slug: string; label: string; base: string; created: string }
export interface SaveResult {
  slug: string
  label: string
  /** adresse de la nouvelle publication (disponible après le déploiement) */
  url: string
  prUrl: string
  /** la pull request a-t-elle été fusionnée automatiquement ? */
  merged: boolean
  mergeError?: string
}

const api = (path: string) => `https://api.github.com/repos/${REPO}${path}`

/** « v4 » + « Vue client — Mars » → « v6-vue-client-mars » (unique parmi `taken`). */
export function variantSlug(base: string, name: string, taken: string[] = []): string {
  const clean = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'affichage'
  let slug = `${base}-${clean}`
  for (let i = 2; taken.includes(slug); i++) slug = `${base}-${clean}-${i}`
  return slug
}

export function variantFileContent(config: DashboardConfig): string {
  return JSON.stringify({ app: 'monaco-dashboard', config }, null, 2) + '\n'
}

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)))
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/\s/g, ''))))

class GhError extends Error { constructor(msg: string, readonly status: number) { super(msg) } }

async function call<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(api(path), {
      ...init,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
    })
  } catch {
    throw new GhError('GitHub est injoignable (connexion ou pare-feu).', 0)
  }
  if (!res.ok) {
    if (res.status === 401) throw new GhError('Jeton refusé : vérifiez-le ou recréez-en un.', 401)
    if (res.status === 403 || res.status === 404) throw new GhError('Accès refusé : le jeton doit avoir « Contents » et « Pull requests » en Read and write sur ce dépôt.', res.status)
    if (res.status === 422) throw new GhError('Cette publication existe déjà : choisissez un autre nom.', 422)
    throw new GhError(`GitHub a répondu ${res.status}.`, res.status)
  }
  return (await res.json()) as T
}

/** Crée « <version>.<nom> » : branche, fichiers, pull request, fusion automatique si possible. */
export async function saveVariant(opts: { token: string; name: string; base: { slug: string; label: string }; config: DashboardConfig; now?: Date }): Promise<SaveResult> {
  const { token, config, base } = opts
  const name = opts.name.trim() || 'Affichage'
  const now = opts.now ?? new Date()

  const ref = await call<{ object: { sha: string } }>(token, `/git/ref/heads/${BASE_BRANCH}`)
  const idx = await call<{ sha: string; content: string }>(token, `/contents/app/variants/index.json?ref=${BASE_BRANCH}`).catch(() => null)
  const entries: VariantEntry[] = idx ? (JSON.parse(unb64(idx.content)) as VariantEntry[]) : []
  const slug = variantSlug(base.slug, name, entries.map((e) => e.slug))
  const label = `${base.label} · ${name}`
  const entry: VariantEntry = { slug, label, base: base.slug, created: now.toISOString().slice(0, 10) }

  const branch = `affichage/${slug}`
  await call(token, '/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: ref.object.sha }) })
  const put = (path: string, content: string, message: string, sha?: string) =>
    call(token, `/contents/${path}`, { method: 'PUT', body: JSON.stringify({ message, content: b64(content), branch, ...(sha ? { sha } : {}) }) })
  await put(`app/variants/${slug}.json`, variantFileContent(config), `Affichage « ${label} »`)
  await put('app/variants/index.json', JSON.stringify([...entries, entry], null, 2) + '\n', `Ajouter « ${label} » à la liste des affichages`, idx?.sha)

  const pr = await call<{ number: number; html_url: string }>(token, '/pulls', {
    method: 'POST',
    body: JSON.stringify({ title: `Affichage « ${label} »`, head: branch, base: BASE_BRANCH, body: `Nouvelle publication du tableau de bord : **${label}**, accessible en \`/${slug}/\` après déploiement. La version d'origine reste inchangée.` }),
  })
  let merged = false
  let mergeError: string | undefined
  try {
    await call(token, `/pulls/${pr.number}/merge`, { method: 'PUT', body: JSON.stringify({ merge_method: 'merge' }) })
    merged = true
  } catch (e) { mergeError = e instanceof Error ? e.message : 'Fusion impossible.' }
  return { slug, label, url: `${PAGES_URL}${slug}/`, prUrl: pr.html_url, merged, mergeError }
}
