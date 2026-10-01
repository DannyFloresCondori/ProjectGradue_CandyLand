import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// La configuración de pruebas está en vitest.config.ts: Vitest usa una versión de Vite
// distinta y sus tipos no son compatibles con los del plugin de React para Vite 8.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
