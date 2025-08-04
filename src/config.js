// src/config.js
const config = {
  graphqlUri: import.meta.env.VITE_GRAPHQL_URI, // ✅ Loaded from .env
  appName: "Claims MotorX",
};

export default config;