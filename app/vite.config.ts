import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Fichier Excel du modèle : Monaco_Besoins_IT_v<N>.xlsx (version la plus élevée du dépôt)
// (à la racine du dépôt, un niveau au-dessus de ce dossier ; ou ici pour les anciennes dispositions)
const modelDir = ['..', '.'].find((d) => readdirSync(d).some((f) => /^Monaco_Besoins_IT_v\d+\.xlsx$/.test(f))) ?? '..'
const modelFile =
  readdirSync(modelDir)
    .filter((f) => /^Monaco_Besoins_IT_v\d+\.xlsx$/.test(f))
    .sort((a, b) => Number(b.match(/v(\d+)/)![1]) - Number(a.match(/v(\d+)/)![1]))[0] ?? 'Monaco_Besoins_IT_v3.xlsx'

// Version du code, affichages enregistrés (variants/) et anciennes versions : registre affiché dans le menu « Versions ».
const readJson = <T,>(p: string, fallback: T): T => { try { return JSON.parse(readFileSync(p, 'utf8')) as T } catch { return fallback } }
const registryRoot = process.env.REGISTRY_ROOT ?? '.'
const current = readJson<{ slug: string; label: string }>(`${registryRoot}/version.json`, { slug: 'v4', label: 'V4' })
const archived = readJson<{ slug: string; label: string }[]>(`${registryRoot}/versions.json`, [])
const variants = readJson<{ slug: string; label: string }[]>(`${registryRoot}/variants/index.json`, [])
const registry = [
  { slug: current.slug, label: current.label, path: '', kind: 'version' },
  ...variants.map((v) => ({ slug: v.slug, label: v.label, path: `${v.slug}/`, kind: 'affichage' })),
  ...archived.slice().reverse().map((v) => ({ slug: v.slug, label: v.label, path: `${v.slug}/`, kind: 'version' })),
]
// affichage enregistré appliqué par défaut à cette version (build « variante »)
// sans affichage enregistré, la version courante s'ouvre sur son affichage par défaut (default-display.json) ; pas pendant les tests
const variantFile = process.env.VARIANT_CONFIG ?? (process.env.VITEST ? undefined : `${registryRoot}/default-display.json`)
const variantConfig = variantFile && existsSync(variantFile) ? (readJson<{ config?: unknown }>(variantFile, {}).config ?? null) : null

// base = nom du dépôt GitHub pour GitHub Pages
export default defineConfig({
  base: '/Monaco-dashboard/',
  plugins: [react()],
  define: {
    __MODEL_FILE__: JSON.stringify(modelFile),
    __APP_BASE__: JSON.stringify(current.slug),
    __APP_SLUG__: JSON.stringify(process.env.APP_SLUG ?? current.slug),
    __VARIANT_CONFIG__: JSON.stringify(variantConfig),
    __REGISTRY__: JSON.stringify(registry),
    __SITE_ROOT__: JSON.stringify(process.env.SITE_ROOT ?? '/Monaco-dashboard/'),
    // version « en ligne » du fichier, lue à chaque lancement (reflète immédiatement une modification sur GitHub)
    __MODEL_LIVE_URL__: JSON.stringify(process.env.MODEL_LIVE_URL ?? `https://raw.githubusercontent.com/Theo-Thivard/Monaco-dashboard/main/${modelFile}`),
    __MODEL_REPO_URL__: JSON.stringify(`https://github.com/Theo-Thivard/Monaco-dashboard/blob/main/${modelFile}`),
  },
  test: { environment: 'node', setupFiles: ['src/test/setup.ts'] },
})
