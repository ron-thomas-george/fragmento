import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        ui: 'index.html',
        plugin: 'src/plugin/controller.ts'
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'plugin') return 'dist/plugin.js';
          return 'dist/ui.js';
        },
        assetFileNames: 'dist/[name][extname]'
      }
    }
  }
});
