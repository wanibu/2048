import { defineConfig } from 'vite';
import pkg from './package.json';

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    port: 7001,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      // V2 平台集成接口 /game/auth/login + /game/game/* + /game/2048/*
      '/game': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
