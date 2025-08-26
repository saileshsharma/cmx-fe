// src/config.js
const config = {
  graphqlUri: import.meta.env.VITE_GRAPHQL_URI || "http://localhost:8080/graphql", // fallback
  graphqlWsUri: import.meta.env.VITE_GRAPHQL_WS_URI || "ws://localhost:8080/graphql", // fallback
  appName: "Claims MotorX",
};

export default config;
