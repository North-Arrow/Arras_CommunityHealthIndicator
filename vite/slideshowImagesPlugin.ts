import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const VIRTUAL_ID = 'virtual:slideshow-images'
const RESOLVED_ID = '\0' + VIRTUAL_ID
const IMAGE_PATTERN = /\.(jpe?g|png)$/i

/**
 * Lists image filenames in public/slideshow at build/dev time without importing
 * them into the JS bundle (avoids duplicating public assets under dist/assets).
 */
export function slideshowImagesPlugin(slideshowDir: string): Plugin {
  const readFilenames = () => {
    if (!fs.existsSync(slideshowDir)) return [] as string[]
    return fs
      .readdirSync(slideshowDir)
      .filter((name) => IMAGE_PATTERN.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }

  return {
    name: 'slideshow-images',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id) {
      if (id !== RESOLVED_ID) return
      return `export default ${JSON.stringify(readFilenames())}`
    },
    configureServer(server) {
      if (!fs.existsSync(slideshowDir)) return
      server.watcher.add(slideshowDir)
      const reload = () => {
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', (file) => {
        if (file.startsWith(slideshowDir) && IMAGE_PATTERN.test(file)) reload()
      })
      server.watcher.on('unlink', (file) => {
        if (file.startsWith(slideshowDir) && IMAGE_PATTERN.test(file)) reload()
      })
    },
  }
}
