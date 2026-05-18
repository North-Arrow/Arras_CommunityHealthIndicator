import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { slideshowImagesPlugin } from './vite/slideshowImagesPlugin'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    slideshowImagesPlugin(path.join(rootDir, 'public/slideshow')),
  ],
  // Allow GitHub Pages deployments under a sub-path.
  // - main: VITE_BASE=/<repo>/
  // - dev:  VITE_BASE=/<repo>/dev/
  // Can also be overridden via `vite build --base=...`
  base: process.env.VITE_BASE || '/'
})
