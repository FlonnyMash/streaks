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
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json,webp}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/\.well-known\//],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === 'style' ||
              request.destination === 'script' ||
              request.destination === 'worker',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets',
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
