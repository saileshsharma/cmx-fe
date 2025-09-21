// Environment Configuration System for CMX Frontend
// Provides type-safe access to environment variables with validation

// Environment variables interface
interface EnvironmentConfig {
  // Application metadata
  readonly APP_NAME: string;
  readonly APP_VERSION: string;
  readonly APP_TITLE: string;
  readonly NODE_ENV: string;

  // Server configuration
  readonly HOST: string;
  readonly PORT: number;

  // API endpoints
  readonly API_BASE_URL: string;
  readonly GRAPHQL_URI: string;
  readonly GRAPHQL_WS_URI: string;

  // Backend service URLs
  readonly CMX_BE_URL: string;
  readonly CMX_BFF_URL: string;
  readonly CMX_UPLOADER_URL: string;

  // File upload configuration
  readonly UPLOADER_PATH: string;
  readonly UPLOADER_FIELD: string;
  readonly MAX_FILE_SIZE: number;
  readonly ALLOWED_FILE_TYPES: string[];

  // Feature flags
  readonly ENABLE_DEVTOOLS: boolean;
  readonly ENABLE_MOCK_DATA: boolean;
  readonly ENABLE_DEBUG_LOGS: boolean;
  readonly ENABLE_PERFORMANCE_MONITORING: boolean;

  // External services
  readonly GOOGLE_MAPS_API_KEY: string;

  // Authentication
  readonly AUTH_ENABLED: boolean;
  readonly KEYCLOAK_URL: string;
  readonly KEYCLOAK_REALM: string;
  readonly KEYCLOAK_CLIENT_ID: string;

  // Cache and performance
  readonly CACHE_ENABLED: boolean;
  readonly CACHE_TTL: number;
  readonly GRAPHQL_CACHE_TTL: number;

  // Monitoring and analytics
  readonly SENTRY_DSN: string;
  readonly ANALYTICS_ENABLED: boolean;
  readonly LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';

  // Build-time constants
  readonly IS_DEV: boolean;
  readonly IS_PROD: boolean;
  readonly IS_STAGING: boolean;
}

// Helper function to get environment variable with fallback
function getEnvVar(key: string, fallback?: string): string {
  const value = import.meta.env[key] || fallback;
  if (value === undefined) {
    console.warn(`Environment variable ${key} is not defined and no fallback provided`);
    return '';
  }
  return value;
}

// Helper function to get boolean environment variable
function getBooleanEnvVar(key: string, fallback: boolean = false): boolean {
  const value = getEnvVar(key, fallback.toString());
  return value.toLowerCase() === 'true';
}

// Helper function to get number environment variable
function getNumberEnvVar(key: string, fallback: number): number {
  const value = getEnvVar(key, fallback.toString());
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

// Helper function to parse comma-separated string to array
function getArrayEnvVar(key: string, fallback: string[] = []): string[] {
  const value = getEnvVar(key);
  if (!value) return fallback;
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

// Validate log level
function getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
  const level = getEnvVar('VITE_LOG_LEVEL', 'info').toLowerCase();
  if (['debug', 'info', 'warn', 'error'].includes(level)) {
    return level as 'debug' | 'info' | 'warn' | 'error';
  }
  console.warn(`Invalid log level: ${level}, defaulting to 'info'`);
  return 'info';
}

// Build the configuration object
const config: EnvironmentConfig = {
  // Application metadata
  APP_NAME: getEnvVar('VITE_APP_NAME', 'ClaimsMotorX'),
  APP_VERSION: getEnvVar('VITE_APP_VERSION', '1.0.0'),
  APP_TITLE: getEnvVar('VITE_APP_TITLE', 'CMX - Claims Management'),
  NODE_ENV: getEnvVar('VITE_NODE_ENV', 'development'),

  // Server configuration
  HOST: getEnvVar('VITE_HOST', 'localhost'),
  PORT: getNumberEnvVar('VITE_PORT', 5173),

  // API endpoints
  API_BASE_URL: getEnvVar('VITE_API_BASE_URL', 'http://localhost:4000'),
  GRAPHQL_URI: getEnvVar('VITE_GRAPHQL_URI', 'http://localhost:4000/graphql'),
  GRAPHQL_WS_URI: getEnvVar('VITE_GRAPHQL_WS_URI', 'ws://localhost:4000/graphql'),

  // Backend service URLs
  CMX_BE_URL: getEnvVar('VITE_CMX_BE_URL', 'http://localhost:8080'),
  CMX_BFF_URL: getEnvVar('VITE_CMX_BFF_URL', 'http://localhost:4000'),
  CMX_UPLOADER_URL: getEnvVar('VITE_CMX_UPLOADER_URL', 'http://localhost:8081'),

  // File upload configuration
  UPLOADER_PATH: getEnvVar('VITE_UPLOADER_PATH', '/api/fnol/:fnolRef/images'),
  UPLOADER_FIELD: getEnvVar('VITE_UPLOADER_FIELD', 'file'),
  MAX_FILE_SIZE: getNumberEnvVar('VITE_MAX_FILE_SIZE', 10485760), // 10MB default
  ALLOWED_FILE_TYPES: getArrayEnvVar('VITE_ALLOWED_FILE_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),

  // Feature flags
  ENABLE_DEVTOOLS: getBooleanEnvVar('VITE_ENABLE_DEVTOOLS', false),
  ENABLE_MOCK_DATA: getBooleanEnvVar('VITE_ENABLE_MOCK_DATA', false),
  ENABLE_DEBUG_LOGS: getBooleanEnvVar('VITE_ENABLE_DEBUG_LOGS', false),
  ENABLE_PERFORMANCE_MONITORING: getBooleanEnvVar('VITE_ENABLE_PERFORMANCE_MONITORING', true),

  // External services
  GOOGLE_MAPS_API_KEY: getEnvVar('VITE_GOOGLE_MAPS_API_KEY', ''),

  // Authentication
  AUTH_ENABLED: getBooleanEnvVar('VITE_AUTH_ENABLED', false),
  KEYCLOAK_URL: getEnvVar('VITE_KEYCLOAK_URL', 'http://localhost:9091'),
  KEYCLOAK_REALM: getEnvVar('VITE_KEYCLOAK_REALM', 'auto-insurance'),
  KEYCLOAK_CLIENT_ID: getEnvVar('VITE_KEYCLOAK_CLIENT_ID', 'cmx-api'),

  // Cache and performance
  CACHE_ENABLED: getBooleanEnvVar('VITE_CACHE_ENABLED', true),
  CACHE_TTL: getNumberEnvVar('VITE_CACHE_TTL', 300000), // 5 minutes
  GRAPHQL_CACHE_TTL: getNumberEnvVar('VITE_GRAPHQL_CACHE_TTL', 600000), // 10 minutes

  // Monitoring and analytics
  SENTRY_DSN: getEnvVar('VITE_SENTRY_DSN', ''),
  ANALYTICS_ENABLED: getBooleanEnvVar('VITE_ANALYTICS_ENABLED', false),
  LOG_LEVEL: getLogLevel(),

  // Build-time constants (injected by Vite)
  IS_DEV: import.meta.env.DEV || false,
  IS_PROD: import.meta.env.PROD || false,
  IS_STAGING: import.meta.env.MODE === 'staging' || false,
};

// Environment validation
function validateConfig(): void {
  const errors: string[] = [];

  // Required fields validation
  if (!config.GRAPHQL_URI) {
    errors.push('VITE_GRAPHQL_URI is required');
  }

  if (!config.API_BASE_URL) {
    errors.push('VITE_API_BASE_URL is required');
  }

  // URL format validation
  try {
    new URL(config.GRAPHQL_URI);
    new URL(config.API_BASE_URL);
  } catch (error) {
    errors.push('Invalid URL format in API configuration');
  }

  // Port validation
  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push('VITE_PORT must be between 1 and 65535');
  }

  // File size validation
  if (config.MAX_FILE_SIZE < 0) {
    errors.push('VITE_MAX_FILE_SIZE must be positive');
  }

  // Google Maps API key validation for production
  if (config.IS_PROD && !config.GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key is not configured for production');
  }

  if (errors.length > 0) {
    console.error('Configuration validation errors:', errors);
    if (config.IS_PROD) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }
}

// Run validation
validateConfig();

// Log configuration in development
if (config.IS_DEV && config.ENABLE_DEBUG_LOGS) {
  console.log('Application Configuration:', {
    NODE_ENV: config.NODE_ENV,
    APP_NAME: config.APP_NAME,
    APP_VERSION: config.APP_VERSION,
    GRAPHQL_URI: config.GRAPHQL_URI,
    API_BASE_URL: config.API_BASE_URL,
    FEATURE_FLAGS: {
      ENABLE_DEVTOOLS: config.ENABLE_DEVTOOLS,
      ENABLE_MOCK_DATA: config.ENABLE_MOCK_DATA,
      ENABLE_DEBUG_LOGS: config.ENABLE_DEBUG_LOGS,
      AUTH_ENABLED: config.AUTH_ENABLED,
    }
  });
}

// Export configuration as default export
export default config;

// Export specific configuration sections for convenience
export const apiConfig = {
  baseUrl: config.API_BASE_URL,
  graphqlUri: config.GRAPHQL_URI,
  graphqlWsUri: config.GRAPHQL_WS_URI,
  cmxBeUrl: config.CMX_BE_URL,
  cmxBffUrl: config.CMX_BFF_URL,
  cmxUploaderUrl: config.CMX_UPLOADER_URL,
} as const;

export const authConfig = {
  enabled: config.AUTH_ENABLED,
  keycloakUrl: config.KEYCLOAK_URL,
  realm: config.KEYCLOAK_REALM,
  clientId: config.KEYCLOAK_CLIENT_ID,
} as const;

export const featureFlags = {
  devtools: config.ENABLE_DEVTOOLS,
  mockData: config.ENABLE_MOCK_DATA,
  debugLogs: config.ENABLE_DEBUG_LOGS,
  performanceMonitoring: config.ENABLE_PERFORMANCE_MONITORING,
  analytics: config.ANALYTICS_ENABLED,
} as const;

export const uploadConfig = {
  path: config.UPLOADER_PATH,
  field: config.UPLOADER_FIELD,
  maxSize: config.MAX_FILE_SIZE,
  allowedTypes: config.ALLOWED_FILE_TYPES,
} as const;

// Legacy export for backwards compatibility
export const legacyConfig = {
  graphqlUri: config.GRAPHQL_URI,
  graphqlWsUri: config.GRAPHQL_WS_URI,
  appName: config.APP_NAME,
} as const;