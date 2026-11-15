import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  resolve: {
    alias: {
      '@manticore/project/types': fileURLToPath(new URL('../../packages/project/src/types.ts', import.meta.url)),
      '@manticore/project/constants': fileURLToPath(new URL('../../packages/project/src/constants.ts', import.meta.url)),
      '@manticore/project/image-polygon-settings': fileURLToPath(new URL('../../packages/project/src/image-polygon-settings.ts', import.meta.url)),
      '@manticore/project': fileURLToPath(new URL('../../packages/project/src/index.ts', import.meta.url)),
      'atlas-packer': fileURLToPath(new URL('../../packages/atlas-packer/src/index.ts', import.meta.url)),
      'texture-compressor': fileURLToPath(new URL('../../packages/texture-compressor/src/index.ts', import.meta.url)),
      'texture-atlas-clusterizer': fileURLToPath(new URL('../../packages/texture-atlas-clusterizer/src/index.ts', import.meta.url)),
      'image-polygonizer': fileURLToPath(new URL('../../packages/image-polygonizer/src/index.ts', import.meta.url)),
      'maxrects-packer/rectangles': fileURLToPath(new URL('../../packages/maxrects-packer/src/rectangles.ts', import.meta.url)),
      'maxrects-packer': fileURLToPath(new URL('../../packages/maxrects-packer/src/index.ts', import.meta.url))
    }
  },
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true
  }
});
