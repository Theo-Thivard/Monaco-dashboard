import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base = nom du dépôt GitHub pour GitHub Pages
export default defineConfig({
  base: '/Monaco-dashboard/',
  plugins: [react()],
  test: { environment: 'node' },
})
