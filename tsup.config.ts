import { defineConfig } from 'tsup';

export default defineConfig(({ watch }) => ({
  entry: ['src/main.ts', 'src/workers/**/*.ts', 'src/db/migrations/**/*.*'],
  splitting: true,
  sourcemap: true,
  clean: true,
  format: ['esm'],
  platform: 'node',
  minify: false,
  dts: true,
  bundle: true,
  metafile: true,
  onSuccess: watch
    ? 'node --enable-source-maps --inspect dist/main'
    : undefined,
  loader: {
    '.sql': 'copy',
    '.json': 'copy',
  },
}));
