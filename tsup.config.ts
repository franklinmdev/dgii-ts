import { defineConfig } from 'tsup';

export default defineConfig({
  tsconfig: 'tsconfig.build.json',
  entry: {
    index: 'src/index.ts',
    validators: 'src/validators/index.ts',
    soap: 'src/soap/index.ts',
    bulk: 'src/bulk/index.ts',
    scraping: 'src/scraping/index.ts',
    client: 'src/client/index.ts',
    errors: 'src/errors/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: false,
  target: 'es2020',
});
