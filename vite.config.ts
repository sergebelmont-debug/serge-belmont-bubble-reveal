import { defineConfig } from 'vite';

// base './' : le jeu fonctionne depuis n'importe quel sous-dossier (GitHub Pages inclus).
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: {
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
});
