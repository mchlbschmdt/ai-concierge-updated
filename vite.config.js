
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Only try to import the tagger if it's available
let componentTagger = () => null
try {
  const taggerModule = require('lovable-tagger/vite')
  componentTagger = taggerModule.componentTagger
} catch (e) {
  console.warn('Lovable tagger not available, skipping')
}

export default defineConfig({
  plugins: [
    react(),
    componentTagger && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8080
  }
})
