import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'copy-404',
      closeBundle() {
        // Copy index.html to 404.html after build for GitHub Pages SPA routing
        const distPath = resolve(__dirname, 'dist')
        copyFileSync(
          resolve(distPath, 'index.html'),
          resolve(distPath, '404.html')
        )
      }
    }
  ],
  base: process.env.NODE_ENV === 'production' ? '' : ''
})
