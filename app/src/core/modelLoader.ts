// Chargement du classeur Excel à chaque lancement du dashboard.
// 1) version « en ligne » (fichier du dépôt GitHub, branche main) : une modification de l'Excel est visible dès le lancement suivant ;
// 2) à défaut (hors ligne, pare-feu…), copie embarquée au dernier déploiement ;
// si le fichier en ligne est illisible ou ne correspond plus au dashboard, on retombe sur la copie embarquée en le signalant.

import { buildModel, ModelError, type Model } from './model'

async function fetchBuffer(url: string, timeoutMs: number): Promise<{ buf: ArrayBuffer; lastModified?: string }> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { cache: 'no-store', signal: ctl.signal })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return { buf: await r.arrayBuffer(), lastModified: r.headers.get('last-modified') ?? undefined }
  } finally { clearTimeout(t) }
}

export interface LoadResult { model: Model }

export async function loadModel(): Promise<Model> {
  const forceBundled = /[?&]source=bundled\b/.test(location.search)
  const bundledUrl = `${import.meta.env.BASE_URL}model.xlsx?v=${Date.now()}`
  const bundled = fetchBuffer(bundledUrl, 15000)
  bundled.catch(() => undefined) // évite l'alerte « rejet non géré » tant qu'on n'en a pas besoin

  let liveProblem: string | null = null
  if (!forceBundled) {
    try {
      const live = await fetchBuffer(`${__MODEL_LIVE_URL__}?t=${Date.now()}`, 2500)
      try {
        return buildModel(live.buf, { fileName: __MODEL_FILE__, source: 'github', loadedAt: Date.now(), lastModified: live.lastModified })
      } catch (e) {
        liveProblem = e instanceof ModelError ? e.message : String(e)
        const d = (e as { diagnostics?: { message: string }[] }).diagnostics
        if (d?.length) liveProblem += ' ' + d.slice(0, 3).map((x) => x.message).join(' ')
      }
    } catch { /* GitHub inaccessible : copie embarquée */ }
  }
  const b = await bundled
  const m = buildModel(b.buf, { fileName: __MODEL_FILE__, source: 'bundled', loadedAt: Date.now(), lastModified: b.lastModified })
  if (liveProblem) m.diagnostics.unshift({ level: 'warning', message: `La version en ligne de l'Excel n'a pas pu être utilisée (${liveProblem}). Copie déployée utilisée à la place.` })
  return m
}
