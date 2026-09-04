#!/usr/bin/env node
/**
 * Fail if dist/index.html (and optional HTML entrypoints) reference
 * /assets/* files that are missing on disk. Catches the classic
 * "committed/pushed new index.html hashes without uploading the JS/CSS" break.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(rootDir, 'dist')

const entryHtmlFiles = ['index.html', '404.html'].map((f) => path.join(distDir, f))

function collectAssetRefs(html) {
  const refs = new Set()
  const re =
    /(?:src|href)=["']([^"']*\/assets\/[^"']+\.(?:js|css|mjs|map))["']/gi
  let m
  while ((m = re.exec(html)) !== null) {
    refs.add(m[1])
  }
  return [...refs]
}

function resolveDistPath(ref) {
  // "/assets/foo.js" or "./assets/foo.js" or "assets/foo.js" or "/dev/assets/foo.js"
  const normalized = ref.replace(/^\.\//, '')
  const assetsIdx = normalized.indexOf('/assets/')
  if (assetsIdx >= 0) {
    return path.join(distDir, normalized.slice(assetsIdx + 1))
  }
  if (normalized.startsWith('assets/')) {
    return path.join(distDir, normalized)
  }
  return path.join(distDir, normalized.replace(/^\//, ''))
}

function main() {
  if (!fs.existsSync(distDir)) {
    console.error('verify-dist-assets: dist/ does not exist. Run a build first.')
    process.exit(1)
  }

  let missing = 0
  let checked = 0

  for (const htmlPath of entryHtmlFiles) {
    if (!fs.existsSync(htmlPath)) continue
    const html = fs.readFileSync(htmlPath, 'utf8')
    const refs = collectAssetRefs(html)
    if (refs.length === 0 && path.basename(htmlPath) === 'index.html') {
      console.error(
        `verify-dist-assets: ${path.relative(rootDir, htmlPath)} has no /assets/*.js|css references (build may have failed).`
      )
      process.exit(1)
    }
    for (const ref of refs) {
      checked++
      const filePath = resolveDistPath(ref)
      if (!fs.existsSync(filePath)) {
        missing++
        console.error(
          `MISSING  ${ref}  (expected ${path.relative(rootDir, filePath)})`
        )
      } else {
        console.log(`ok       ${ref}`)
      }
    }
  }

  // Sanity: at least one main JS and CSS under dist/assets
  const assetFiles = fs.existsSync(path.join(distDir, 'assets'))
    ? fs.readdirSync(path.join(distDir, 'assets'))
    : []
  const hasIndexJs = assetFiles.some((f) => /^index-.*\.js$/.test(f))
  const hasIndexCss = assetFiles.some((f) => /^index-.*\.css$/.test(f))
  if (!hasIndexJs || !hasIndexCss) {
    console.error(
      'verify-dist-assets: dist/assets is missing index-*.js and/or index-*.css from the Vite build.'
    )
    process.exit(1)
  }

  if (missing > 0) {
    console.error(
      `\nverify-dist-assets: ${missing}/${checked} referenced asset(s) missing.`
    )
    console.error(
      'Refusing to continue. Rebuild and deploy the full dist/ folder (CI or npm run deploy-gh) — do not subtree-push tracked dist files alone.'
    )
    process.exit(1)
  }

  console.log(`\nverify-dist-assets: ${checked} asset reference(s) present on disk.`)
}

main()
