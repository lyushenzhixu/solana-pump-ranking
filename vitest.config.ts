import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['dotenv/config'],
    passWithNoTests: true,
    // server-only throws when imported outside Next.js runtime; stub it for vitest
    server: {
      deps: {
        inline: ['server-only'],
      },
    },
  },
  resolve: {
    alias: {
      '@': new URL('.', import.meta.url).pathname,
      'server-only': new URL('./test/__mocks__/server-only.ts', import.meta.url).pathname,
    },
  },
})
