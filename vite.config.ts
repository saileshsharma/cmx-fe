// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,            // 0.0.0.0
    port: 5173,
    strictPort: true,
    hmr: {
      host: "localhost",  // your LAN IP of the UI machine
      protocol: "ws",
      port: 5173,
    },
    proxy: {
      // ⬇️ Proxy BOTH HTTP and WebSocket traffic for GraphQL
      "/graphql": {
        target: "http://localhost:8080", // <-- Spring GraphQL server
        changeOrigin: true,
        ws: true,                        // <-- CRITICAL for subscriptions
        // If your BE path differs, also set rewrite:
        // rewrite: (path) => path.replace(/^\/graphql/, "/graphql"),
      },
    },
  },
});
