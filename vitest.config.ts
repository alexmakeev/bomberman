import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    // Use different environments for different test types
    environmentMatchGlobs: [
      ['tests/frontend/**', 'happy-dom'], // Frontend tests use DOM
      ['tests/**', 'node'] // Backend tests use Node.js
    ],
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'], // Global test setup
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'client/',
        'tests/',
        '**/*.d.ts',
        'vitest.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/frontend': path.resolve(__dirname, './src/frontend'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/components': path.resolve(__dirname, './src/frontend/components'),
      '@interfaces': path.resolve(__dirname, './src/interfaces'),
    },
  },
});