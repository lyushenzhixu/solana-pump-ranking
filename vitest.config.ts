import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['dotenv/config'],
    passWithNoTests: true,
  },
  resolve: { alias: { '@': new URL('.', import.meta.url).pathname } },
})
