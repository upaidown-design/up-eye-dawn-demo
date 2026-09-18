import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],base:'./',build:{target:'es2022',rollupOptions:{output:{manualChunks(id){if(id.includes('/three/'))return 'three';if(id.includes('/echarts/')||id.includes('/zrender/'))return 'charts'}}}}});
