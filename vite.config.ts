import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // Register immediately (not on window load) so auditors like PWABuilder detect the SW.
      injectRegister: null,
      manifest: false,
      includeAssets: [
        'favicon-32.png',
        'favicon-48.png',
        'favicon-64.png',
        'favicon.svg',
        'apple-touch-icon.png',
        'icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-512-maskable.png',
        'offline.html',
        'screenshots/narrow-1080x1920.png',
        'screenshots/wide-1920x1080.png',
      ],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json,webp}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
