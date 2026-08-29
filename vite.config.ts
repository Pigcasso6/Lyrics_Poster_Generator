import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
return {
plugins: [react(), tailwindcss()],
resolve: {
  alias: {
    '@': path.resolve(__dirname, '.'),
  },
},
server: {
  host: '0.0.0.0', // 监听所有地址，防止本地环回限制
  allowedHosts: true as true, // 彻底关闭 Host 严格校验
  hmr: process.env.DISABLE_HMR !== 'true',
  watch: process.env.DISABLE_HMR === 'true' ? null : {},
},
preview: {
  host: '0.0.0.0',
  allowedHosts: true as true,
},
};
});