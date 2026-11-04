import pkg from './package.json'
import { gitVersionPlugin } from './plugins/gitVersionPlugin'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  app: {
    head: {
      title: 'Tetris Battle',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'theme-color', content: '#0f0c29' }
      ],
      link: [
        { rel: 'apple-touch-icon', href: '/pwa-192x192.png' }
      ]
    }
  },

  runtimeConfig: {
    public: {
      appVersion: pkg.version,
      wsUrl: process.env.NUXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws',
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID
    }
  },

  vite: {
    plugins: [gitVersionPlugin()],
    server: {
      allowedHosts: true  // Allow ngrok and other tunnels
    }
  },

  modules: ['@vite-pwa/nuxt'],

  pwa: {
    disable: process.env.TETRIS_DESKTOP === '1',
    registerType: 'autoUpdate',
    manifest: {
      name: 'Tetris Battle',
      short_name: 'Tetris',
      description: 'Competitive Tetris Battle Game',
      theme_color: '#0f0c29',
      background_color: '#0f0c29',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      cleanupOutdatedCaches: true
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      navigateFallback: '/',
      type: 'module',
    },
  },

  css: ['~/assets/css/global.css']
})
