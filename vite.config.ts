import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  const isDev = mode === 'development';
  const isProd = mode === 'production';
  const isStaging = mode === 'staging';

  return {
    // Plugin configuration
    plugins: [
      react({
        // Enable Fast Refresh in development
        fastRefresh: isDev,
        // Production optimizations
        babel: isProd ? {
          plugins: [
            ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }]
          ]
        } : undefined
      })
    ],

    // Path resolution
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "@components": resolve(__dirname, "./src/components"),
        "@features": resolve(__dirname, "./src/features"),
        "@graphql": resolve(__dirname, "./src/graphql"),
        "@lib": resolve(__dirname, "./src/lib"),
        "@utils": resolve(__dirname, "./src/utils"),
        "@types": resolve(__dirname, "./src/types"),
        "@assets": resolve(__dirname, "./src/assets"),
        "@hooks": resolve(__dirname, "./src/hooks"),
        "@contexts": resolve(__dirname, "./src/contexts"),
      }
    },

    // Environment variable configuration
    envPrefix: ['VITE_', 'REACT_APP_'],

    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __IS_DEV__: isDev,
      __IS_PROD__: isProd,
      __IS_STAGING__: isStaging,
    },

    // Development server configuration
    server: {
      host: env.VITE_HOST || '0.0.0.0',
      port: parseInt(env.VITE_PORT) || 5173,
      strictPort: true,
      open: isDev ? true : false,
      cors: true,

      // HMR configuration
      hmr: {
        host: "localhost",
        protocol: "ws",
        port: parseInt(env.VITE_PORT) || 5173,
      },

      // Proxy configuration for API calls
      proxy: {
        // GraphQL endpoint proxy
        '/graphql': {
          target: env.VITE_CMX_BFF_URL || 'http://localhost:4000',
          changeOrigin: true,
          ws: true, // WebSocket support for subscriptions
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              if (isDev) {
                console.log('Proxying request:', req.method, req.url);
              }
            });
          }
        },

        // API endpoint proxy
        '/api': {
          target: env.VITE_CMX_BE_URL || 'http://localhost:8080',
          changeOrigin: true,
        },

        // File upload proxy
        '/upload': {
          target: env.VITE_CMX_UPLOADER_URL || 'http://localhost:8081',
          changeOrigin: true,
        }
      }
    },

    // Preview server configuration (for production builds)
    preview: {
      host: env.VITE_HOST || '0.0.0.0',
      port: parseInt(env.VITE_PORT) || 4173,
      strictPort: true,
    },

    // Build configuration
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: isDev || isStaging,
      minify: isProd ? 'esbuild' : false,

      // Chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks
            vendor: ['react', 'react-dom'],
            apollo: ['@apollo/client', 'graphql'],
            router: ['react-router-dom'],
            ui: ['react-icons', 'react-toastify'],
            charts: ['chart.js', 'react-chartjs-2', 'recharts'],
            maps: ['@react-google-maps/api'],
          },

          // Asset naming
          chunkFileNames: isProd ? 'assets/js/[name]-[hash].js' : 'assets/js/[name].js',
          entryFileNames: isProd ? 'assets/js/[name]-[hash].js' : 'assets/js/[name].js',
          assetFileNames: isProd ? 'assets/[ext]/[name]-[hash].[ext]' : 'assets/[ext]/[name].[ext]',
        }
      },

      // Bundle analysis
      reportCompressedSize: isProd,

      // Asset optimization
      assetsInlineLimit: 4096, // 4kb

      // CSS optimization
      cssCodeSplit: true,
      cssMinify: isProd,
    },

    // CSS configuration
    css: {
      devSourcemap: isDev,
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      }
    },

    // Optimization configuration
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@apollo/client',
        'graphql',
        'react-router-dom',
        'react-icons',
        'chart.js',
        'react-chartjs-2'
      ],
      exclude: []
    },

    // ESBuild configuration
    esbuild: {
      target: 'es2020',
      legalComments: isProd ? 'none' : 'inline',
      drop: isProd ? ['console', 'debugger'] : [],
    },

    // Base URL configuration
    base: env.VITE_BASE_URL || '/',
  };
});
