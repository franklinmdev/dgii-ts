import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/validators/index.ts',
        'src/soap/index.ts',
        'src/bulk/index.ts',
      ],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
