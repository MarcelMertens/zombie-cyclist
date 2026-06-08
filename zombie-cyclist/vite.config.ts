import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT ?? '4173'),
  },
});
