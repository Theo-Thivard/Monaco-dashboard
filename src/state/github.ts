// Enregistrement de l'affichage (configuration du dashboard) dans une NOUVELLE branche du dépôt GitHub.
// Appel direct à l'API GitHub depuis le navigateur avec un jeton personnel de l'utilisateur
// (jamais stocké dans le dépôt). La fusion de la branche dans `main` fait de cet affichage le défaut du site.

import type { DashboardConfig } from '../config/types'

export const REPO = 'Theo-Thivard/Monaco-dashboard'
export const BASE_BRANCH = 'main'
/** Fichier lu au build : s'il contient une configuration, elle devient l'affichage par défaut. */
export const SAVED_PATH = 'src/config/saved.json'
export const TOKEN_HELP_URL = 'https://github.com/settings/personal-access-tokens/new'

export interface SaveResult { branch: string; branchUrl: string; compareUrl: string }

const api = (path: string) => `https://api.github.com/repos/${REPO}${path}`

/** Nom de branche sûr : « affichage/<mots-séparés-par-des-tirets> ». */
export function branchName(label: string, now = new Date()): string {
  const slug = label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
  return `affichage/${slug || 'preferences'}-${stamp}`
}

export function savedFileContent(config: DashboardConfig): string {
  return JSON.stringify({ app: 'monaco-dashboard', config }, null, 2) + '\n'
}

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)))

async function call<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(api(path), {
      ...init,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
    })
  } catch {
    throw new Error('GitHub est injoignable (connexion ou pare-feu).')
  }
  if (!res.ok) {
    if (res.status === 401) throw new Error('Jeton refusé : vérifiez-le ou recréez-en un.')
    if (res.status === 403 || res.status === 404) throw new Error('Accès refusé au dépôt : le jeton doit avoir la permission « Contents : Read and write » sur ce dépôt.')
    if (res.status === 422) throw new Error('Cette branche existe déjà : choisissez un autre nom.')
    throw new Error(`GitHub a répondu ${res.status}.`)
  }
  return (await res.json()) as T
}

/** Crée la branche à partir de `main`, y enregistre la configuration, renvoie les liens utiles. */
export async function saveConfigToBranch(opts: { token: string; label: string; message: string; config: DashboardConfig; now?: Date }): Promise<SaveResult> {
  const { token, config } = opts
  const branch = branchName(opts.label, opts.now)
  const base = await call<{ object: { sha: string } }>(token, `/git/ref/heads/${BASE_BRANCH}`)
  await call(token, '/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: base.object.sha }) })
  const existing = await call<{ sha: string }>(token, `/contents/${SAVED_PATH}?ref=${encodeURIComponent(branch)}`).catch(() => null)
  await call(token, `/contents/${SAVED_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({ message: opts.message || 'Enregistrer l\'affichage du dashboard', content: b64(savedFileContent(config)), branch, ...(existing ? { sha: existing.sha } : {}) }),
  })
  const enc = branch.split('/').map(encodeURIComponent).join('/')
  return {
    branch,
    branchUrl: `https://github.com/${REPO}/tree/${enc}`,
    compareUrl: `https://github.com/${REPO}/compare/${BASE_BRANCH}...${enc}?expand=1`,
  }
}
