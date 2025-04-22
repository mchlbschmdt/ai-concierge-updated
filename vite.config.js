
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { componentTagger } from 'lovable-tagger/vite'

export default defineConfig({
  plugins: [
    react(),
    componentTagger()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8080
  }
})
