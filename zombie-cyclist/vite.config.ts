import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // listen on 0.0.0.0 → reachable in LAN
  },
});
