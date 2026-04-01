#!/usr/bin/env node
/**
 * Rewrite @/ alias imports in generated shadcn components to relative paths.
 * shared/frontend is a library package, not a standalone app, so @/ aliases
 * would otherwise resolve to core/frontend/src/ at build time.
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

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

if (changed === 0) {
  console.log('  nothing to fix')
} else {
  console.log(`\n  ${changed} file(s) updated`)
}
