// src/apolloClient.js
import { ApolloClient, InMemoryCache, split, HttpLink, from } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";
import { onError } from "@apollo/client/link/error";

/** -----------------------------------------------------------
 * Resolve URIs (env → sensible defaults) and auto-derive WS
 * ----------------------------------------------------------*/
const envHttp = import.meta.env.VITE_GRAPHQL_URI;
const envWs   = import.meta.env.VITE_GRAPHQL_WS_URI;

// Point to BFF (Backend-for-Frontend) service instead of direct backend
// BFF runs on port 4000 and proxies requests to cmx-be
const httpUri =
  envHttp ||
  (import.meta.env.DEV ? "http://localhost:4000/graphql" : "http://localhost:4000/graphql");

// Derive WS from HTTP when not supplied (http→ws, https→wss)
function deriveWsFromHttp(httpUrl) {
  try {
    const absolute = httpUrl.startsWith("/")
      ? new URL(httpUrl, window.location.origin).toString()
      : httpUrl;
    const u = new URL(absolute);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    return u.toString();
  } catch {
    return null;
  }
}

const wsUri = envWs || (typeof window !== "undefined" ? deriveWsFromHttp(httpUri) : null);

// Optional: toggle cookie sending via env (include | same-origin | omit)
const credentials = import.meta.env.VITE_GRAPHQL_CREDENTIALS || "include";

/** -----------------------------------------------------------
 * HTTP link
 * ----------------------------------------------------------*/
const httpLink = new HttpLink({
  uri: httpUri,
  credentials,
  fetchOptions: { mode: "cors" },
});

/** -----------------------------------------------------------
 * Error handling (HTTP/Query/Mutation)
 * (Note: WS errors won’t flow through this; see ws client 'on' below)
 * ----------------------------------------------------------*/
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors?.length) {
    graphQLErrors.forEach(({ message, extensions }) => {
      window.dispatchEvent(
        new CustomEvent("app:error", {
          detail: { message: message || "GraphQL request failed", code: extensions?.code },
        })
      );
    });
  }
  if (networkError) {
    window.dispatchEvent(
      new CustomEvent("app:error", {
        detail: { message: "Network error. Please try again.", code: "NETWORK" },
      })
    );
  }
});

/** -----------------------------------------------------------
 * WebSocket link (browser only)
 * - Filters benign closes (1000/1005, client cancel)
 * - Exponential backoff retry for real failures
 * - Emits app:ws events (optional to hook in UI)
 * ----------------------------------------------------------*/
let wsLink = null;
if (wsUri && typeof window !== "undefined" && window.location.protocol !== "file:") {
  const wsClient = createClient({
    url: wsUri,
    lazy: true,                 // don't connect until first subscription
    keepAlive: 15_000,          // ping every 15s to keep proxies happy
    // If you need auth over WS, put headers/tokens here:
    // connectionParams: async () => ({ Authorization: `Bearer ${token}` }),
    connectionParams: async () => ({}),

    // Retry policy — back off up to 30s
    retryAttempts: Infinity,
    retryWait: async (retries) => {
      const ms = Math.min(30_000, 500 * 2 ** retries);
      await new Promise((r) => setTimeout(r, ms));
    },

    // Only retry on *abnormal* closes or actual errors.
    // Ignore normal close (1000/1005) and client-initiated cancel.
    shouldRetry: (errOrCloseEvent) => {
      try {
        // CloseEvent path
        if (typeof errOrCloseEvent?.code === "number") {
          const code = errOrCloseEvent.code;
          if (code === 1000 || code === 1005) return false; // normal closes
          return true; // other codes are worth retrying
        }
        // Error path
        const msg = String(errOrCloseEvent?.message || "").toLowerCase();
        if (
          msg.includes("client cancelled") ||
          msg.includes("observable cancelled") ||
          msg.includes("socket closed") ||
          msg.includes("websocket is not open")
        ) {
          return false;
        }
      } catch {
        // fall through
      }
      return true;
    },

    // Lightweight lifecycle hooks → optional UI wiring
    on: {
      opened: () => {
        window.dispatchEvent(new CustomEvent("app:ws", { detail: { state: "open" } }));
      },
      closed: (e) => {
        window.dispatchEvent(
          new CustomEvent("app:ws", {
            detail: { state: "closed", code: e?.code, reason: e?.reason },
          })
        );
      },
      error: (e) => {
        window.dispatchEvent(
          new CustomEvent("app:ws", {
            detail: { state: "error", message: e?.message },
          })
        );
      },
    },
  });

  wsLink = new GraphQLWsLink(wsClient);
}

/** -----------------------------------------------------------
 * Split: WS for subscriptions, HTTP for the rest
 * ----------------------------------------------------------*/
const link = wsLink
  ? split(
      ({ query }) => {
        const def = getMainDefinition(query);
        return def.kind === "OperationDefinition" && def.operation === "subscription";
      },
      wsLink,
      from([errorLink, httpLink])
    )
  : from([errorLink, httpLink]);

/** -----------------------------------------------------------
 * Apollo Client
 * ----------------------------------------------------------*/
const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-and-network", errorPolicy: "all" },
    query:       { fetchPolicy: "network-only",     errorPolicy: "all" },
    mutate:      {                                  errorPolicy: "all" },
  },
});

// One-time helpful log
(() => {
  // eslint-disable-next-line no-console
  console.info("[Apollo] HTTP:", httpUri, "| WS:", wsUri || "(disabled)", "| credentials:", credentials);
})();

export default client;
