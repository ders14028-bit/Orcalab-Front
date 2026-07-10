import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    // NOTA: Vite 8 (Rolldown) marca esbuildOptions como deprecado a favor de
    // rolldownOptions, pero rolldownOptions.define no es una key válida en esta
    // versión ("Expected never but received define"). esbuildOptions.define sigue
    // funcionando como shim de compatibilidad y es lo que efectivamente resuelve
    // el "global is not defined" de sockjs-client en el pre-bundle de deps.
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
