// Legacy config.js - DEPRECATED
// This file is kept for backwards compatibility
// Please use src/config/index.ts for new code

import { legacyConfig } from './config/index';

// Re-export the legacy configuration format
const config = {
  graphqlUri: legacyConfig.graphqlUri,
  graphqlWsUri: legacyConfig.graphqlWsUri,
  appName: legacyConfig.appName,
};

export default config;
