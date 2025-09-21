/// <reference types="vite/client" />

// Vite Environment Variables Type Definitions
interface ImportMetaEnv {
  // Application Configuration
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_NODE_ENV: string;

  // Server Configuration
  readonly VITE_HOST: string;
  readonly VITE_PORT: string;

  // API Endpoints
  readonly VITE_API_BASE_URL: string;
  readonly VITE_GRAPHQL_URI: string;
  readonly VITE_GRAPHQL_WS_URI: string;

  // Backend Service URLs
  readonly VITE_CMX_BE_URL: string;
  readonly VITE_CMX_BFF_URL: string;
  readonly VITE_CMX_UPLOADER_URL: string;

  // File Upload Configuration
  readonly VITE_UPLOADER_PATH: string;
  readonly VITE_UPLOADER_FIELD: string;
  readonly VITE_MAX_FILE_SIZE: string;
  readonly VITE_ALLOWED_FILE_TYPES: string;

  // Feature Flags
  readonly VITE_ENABLE_DEVTOOLS: string;
  readonly VITE_ENABLE_MOCK_DATA: string;
  readonly VITE_ENABLE_DEBUG_LOGS: string;
  readonly VITE_ENABLE_PERFORMANCE_MONITORING: string;

  // External Services
  readonly VITE_GOOGLE_MAPS_API_KEY: string;

  // Authentication
  readonly VITE_AUTH_ENABLED: string;
  readonly VITE_KEYCLOAK_URL: string;
  readonly VITE_KEYCLOAK_REALM: string;
  readonly VITE_KEYCLOAK_CLIENT_ID: string;

  // Cache and Performance
  readonly VITE_CACHE_ENABLED: string;
  readonly VITE_CACHE_TTL: string;
  readonly VITE_GRAPHQL_CACHE_TTL: string;

  // Monitoring and Analytics
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_ANALYTICS_ENABLED: string;
  readonly VITE_LOG_LEVEL: string;

  // Build Configuration
  readonly VITE_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global constants injected by Vite
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
declare const __IS_DEV__: boolean;
declare const __IS_PROD__: boolean;
declare const __IS_STAGING__: boolean;