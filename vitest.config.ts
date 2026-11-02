import { defineConfig } from 'vitest/config';

try {
  process.loadEnvFile(".env");
} catch {
  /* pas de .env : rien à faire */
}

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Les tests HTTP partagent une même base : on exécute les fichiers un par un.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
