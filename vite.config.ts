import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3000,
    open: false,
    watch: {
      ignored: [
        '**/dist-desktop/**',
        '**/dist/**',
        '**/.git/**',
        '**/*.tmp/**',
        '**/*.exe',
        '**/win-unpacked/**',
        '**/win-unpacked.tmp/**'
      ],
    },
  },
});
