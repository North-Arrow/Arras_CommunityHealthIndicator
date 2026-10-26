#!/usr/bin/env node
/**
 * Fail if any public/config/*.json file is not valid JSON. These files are
 * fetched at runtime, so a stray comma would otherwise ship and break the
 * site (vite build does not parse them).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const configDir = path.join(rootDir, 'public', 'config')

const files = fs
  .readdirSync(configDir)
  .filter((f) => f.endsWith('.json'))
  .sort()

let failures = 0
for (const file of files) {
  const rel = path.posix.join('public/config', file)
  try {
    JSON.parse(fs.readFileSync(path.join(configDir, file), 'utf8'))
    console.log(`ok    ${rel}`)
  } catch (err) {
    failures++
    // ::error:: annotates the file in the GitHub Actions UI; harmless locally.
    console.log(`::error file=${rel}::Invalid JSON: ${err.message}`)
  }
}

if (files.length === 0) {
  console.log('::error::No JSON files found in public/config')
  process.exit(1)
}
if (failures > 0) {
  console.log(`\n${failures} of ${files.length} config file(s) are invalid JSON.`)
  process.exit(1)
}
console.log(`\nAll ${files.length} config files are valid JSON.`)
