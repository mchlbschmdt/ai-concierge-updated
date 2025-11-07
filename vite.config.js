
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

let componentTagger = () => null;
const plugins = [react()];

// Try to dynamically import lovable-tagger/vite if it exists and push to plugins.
// This ensures the config doesn't break if the module is missing.
try {
  // Use dynamic import to avoid ESM build errors
  const taggerModule = await import('lovable-tagger/vite').then(m => m.default ? m.default : m).catch(() => null);
  if (taggerModule && taggerModule.componentTagger) {
    plugins.push(taggerModule.componentTagger());
  } else if (taggerModule) {
    plugins.push(taggerModule());
  }
} catch (e) {
  // Module not found, do nothing but warn
  console.warn('Lovable tagger not available, skipping');
}

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  server: {
    port: 8080,
  },
});
