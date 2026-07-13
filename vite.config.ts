import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // URL del backend (Kong). Por defecto el docker-compose local; se
  // sobreescribe con BACKEND_URL en .env.<mode> (ej. .env.aws) o en el shell.
  // Sin prefijo VITE_ a proposito: solo la usa el proxy, no se expone al cliente.
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.BACKEND_URL || 'http://localhost:8000'

  return {
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
        target: backendUrl,
        changeOrigin: true,
      },
      '/ws': {
        target: backendUrl,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  }
})
