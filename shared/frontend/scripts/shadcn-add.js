#!/usr/bin/env node
/**
 * Wrapper around `shadcn add` that rewrites @/ alias imports to relative paths.
 * shared/frontend is a library package, not a standalone app, so @/ aliases
 * would otherwise resolve to core/frontend/src/ at build time.
 */

import { execSync } from 'child_process'
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: pnpm ui:add <component> [component2 ...]')
  process.exit(1)
}

// 1. Run shadcn add
console.log(`\n▸ shadcn add ${args.join(' ')}\n`)
execSync(`pnpm dlx shadcn@latest add --overwrite ${args.join(' ')}`, { stdio: 'inherit' })

// 2. Rewrite @/ aliases to relative paths
console.log('\n▸ fixing @/ imports...')

const UI_DIR = new URL('../src/components/ui', import.meta.url).pathname

const REPLACEMENTS = [
  [/"@\/lib\/utils"/g, '"../../lib/utils"'],
  [/"@\/hooks\/([^"]+)"/g, '"../../hooks/$1"'],
  [/"@\/components\/ui\/([^"]+)"/g, '"./$1"'],
]

let changed = 0
for (const file of readdirSync(UI_DIR).filter(f => f.endsWith('.tsx'))) {
  const filePath = join(UI_DIR, file)
  let content = readFileSync(filePath, 'utf8')
  const original = content
  for (const [pattern, replacement] of REPLACEMENTS) {
    content = content.replace(pattern, replacement)
  }
  if (content !== original) {
    writeFileSync(filePath, content)
    console.log(`  fixed: src/components/ui/${file}`)
    changed++
  }
}

console.log(changed > 0 ? `\n  ${changed} file(s) fixed` : '  nothing to fix')
console.log('\n✓ done\n')
