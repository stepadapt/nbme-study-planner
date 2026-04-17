import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Inject build timestamp so every production deploy auto-increments the plan engine version.
  // Dev builds use the string 'dev' so local hot-reloads don't trigger constant plan regens.
  define: {
    __BUILD_TIME__: JSON.stringify(mode === 'production' ? String(Date.now()) : 'dev'),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}));
