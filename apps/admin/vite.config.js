import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@cafe/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5176,
    host: '0.0.0.0',
  },
  preview: {
    host: '0.0.0.0',
    port: 4176,
  },
});
