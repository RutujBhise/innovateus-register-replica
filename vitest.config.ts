import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * Explicit config so this project does not inherit the unrelated Vite/Vitest
 * setup that lives in the parent directory (its `include` points at `src/**`,
 * which does not exist here).
 *
 * The suite covers pure modules only - no Nuxt runtime, no DOM - so it needs no
 * environment beyond node and stays fast.
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    reporters: 'default'
  }
})
