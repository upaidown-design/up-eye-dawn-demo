import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import react from '@vitejs/plugin-react';
import {defineConfig, loadEnv, type Plugin} from 'vite';

const require = createRequire(import.meta.url);

function maplibreWorkerDependencies(): Plugin {
  return {
    name: 'maplibre-worker-dependencies',
    apply: 'build',
    buildStart() {
      const sharedModule = require.resolve('maplibre-gl/dist/maplibre-gl-shared.mjs');
      this.emitFile({
        type: 'asset',
        fileName: 'assets/maplibre-gl-shared.mjs',
        source: readFileSync(sharedModule),
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiTarget = env.VITE_DEV_API_TARGET ?? 'http://127.0.0.1:4010';
  return {
    plugins: [react(), maplibreWorkerDependencies()],
    base: '/demo/',
    optimizeDeps: {exclude: ['maplibre-gl']},
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {target: apiTarget, changeOrigin: true},
        '/socket.io': {target: apiTarget, ws: true, changeOrigin: true},
      },
    },
    build: {target: 'es2022'},
  };
});
