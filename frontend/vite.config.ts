import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // GOOGLE_CLIENT_ID lives in the repo-root .env, shared with the backend (docker compose).
  const root = loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), '')
  return {
    plugins: [react(), tailwindcss()],
    // The API only allows this origin (CORS_ORIGINS), so fail instead of silently moving to 5174.
    server: { port: 5173, strictPort: true },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    define: {
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(process.env.VITE_GOOGLE_CLIENT_ID ?? root.GOOGLE_CLIENT_ID ?? ''),
    },
  }
})
