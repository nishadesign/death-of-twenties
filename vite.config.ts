import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(({ mode }) => ({
  base: mode === 'github-pages' ? '/death-of-twenties/' : '/',
  plugins: [react(), tailwindcss()],
}));
