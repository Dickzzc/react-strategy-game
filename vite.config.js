import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the strategy game.  We enable the React plugin
// to support JSX files and fast refresh during development.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});