import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue()
  ],
  // Allow GitHub Pages deployments under a sub-path.
  // - main: VITE_BASE=/<repo>/
  // - dev:  VITE_BASE=/<repo>/dev/
  // Can also be overridden via `vite build --base=...`
  base: process.env.VITE_BASE || '/'
})
