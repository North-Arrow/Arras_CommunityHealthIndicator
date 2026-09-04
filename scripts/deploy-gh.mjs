#!/usr/bin/env node
/**
 * Safe local deploy to gh-pages.
 *
 * Replaces the old `git subtree push --prefix dist` flow, which only published
 * *tracked* files under dist/ — so a newly built index.html could ship while
 * gitignored hashed assets (index-*.js/css) were left behind (live 404s).
 *
 * This script always:
 *  1. Builds with --base=/
 *  2. Verifies index.html asset hashes exist on disk
 *  3. Publishes the full dist/ directory via gh-pages (filesystem), keeping
 *     existing gh-pages files (e.g. /dev/) with --add
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function run(command, args, opts = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function main() {
  const cnamePath = path.join(rootDir, 'public', 'CNAME')
  const cname = fs.existsSync(cnamePath)
    ? fs.readFileSync(cnamePath, 'utf8').trim()
    : 'arras.north-arrow.org'

  console.log('deploy-gh: building production bundle (base=/)…')
  run('npm', ['run', 'build', '--', '--base=/'])

  console.log('deploy-gh: verifying dist asset references…')
  run('node', ['scripts/verify-dist-assets.mjs'])

  console.log(
    'deploy-gh: publishing full dist/ to origin/gh-pages (keep existing files, including /dev/)…'
  )
  // --add ≈ keep_files: do not delete unrelated paths such as /dev/
  // --dist publishes from the filesystem, including gitignored build hashes
  run('npx', [
    '--yes',
    'gh-pages@6',
    '--dist',
    'dist',
    '--branch',
    'gh-pages',
    '--dotfiles',
    '--add',
    '--message',
    'deploy: production build (full dist)',
    '--cname',
    cname,
  ])

  console.log(
    `\ndeploy-gh: done. Custom domain: https://${cname}/ (allow a minute for Pages to update).`
  )
}

main()
