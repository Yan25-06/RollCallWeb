import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/RollCallWeb/',
  build: {
    outDir: 'docs',
  },
  plugins: [react()],
  resolve: {
    alias: { '@': '/src' }
  }
})
