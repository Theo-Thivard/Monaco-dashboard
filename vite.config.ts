import { readdirSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Fichier Excel du modèle : Monaco_Besoins_IT_v<N>.xlsx (version la plus élevée du dépôt)
const modelFile =
  readdirSync('.')
    .filter((f) => /^Monaco_Besoins_IT_v\d+\.xlsx$/.test(f))
    .sort((a, b) => Number(b.match(/v(\d+)/)![1]) - Number(a.match(/v(\d+)/)![1]))[0] ?? 'Monaco_Besoins_IT_v3.xlsx'

// base = nom du dépôt GitHub pour GitHub Pages
export default defineConfig({
  base: '/Monaco-dashboard/',
  plugins: [react()],
  define: {
    __MODEL_FILE__: JSON.stringify(modelFile),
    // version « en ligne » du fichier, lue à chaque lancement (reflète immédiatement une modification sur GitHub)
    __MODEL_LIVE_URL__: JSON.stringify(process.env.MODEL_LIVE_URL ?? `https://raw.githubusercontent.com/Theo-Thivard/Monaco-dashboard/main/${modelFile}`),
    __MODEL_REPO_URL__: JSON.stringify(`https://github.com/Theo-Thivard/Monaco-dashboard/blob/main/${modelFile}`),
  },
  test: { environment: 'node', setupFiles: ['src/test/setup.ts'] },
})
