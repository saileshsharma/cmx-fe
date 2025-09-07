
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Read env safely (Node context)
const HOST = process.env.VITE_HOST?.trim() || "0.0.0.0";
const PORT = Number(process.env.VITE_PORT || 5173);

// Optional HMR host if you test from another device on LAN.
// e.g. set HMR_HOST=192.168.1.50 in .env.local
const HMR_HOST = process.env.HMR_HOST?.trim(); // no default

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // binds to 0.0.0.0 (external LAN access)
    port: PORT,
    strictPort: true,
    // HMR config without using window/location
    hmr: {
      protocol: "ws",
      // Only set host if provided; otherwise Vite uses the page origin
      ...(HMR_HOST ? { host: HMR_HOST } : {}),
      port: PORT,
    },
    proxy: {
      // Proxy BOTH HTTP and WebSocket traffic for GraphQL
      "/graphql": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
        ws: true,
        // If backend path differs, uncomment:
        // rewrite: (path) => path.replace(/^\/graphql/, "/graphql"),
      },
    },
  },
});
