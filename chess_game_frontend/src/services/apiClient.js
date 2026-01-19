import { getAppEnv } from "../config/env";

// PUBLIC_INTERFACE
export function createApiClient() {
  /** Creates a small REST client with feature-flagged network calls. */
  const env = getAppEnv();

  async function safeFetch(path, options) {
    if (!env.networkEnabled || !env.apiBase) {
      return { ok: false, status: 0, json: async () => ({}) };
    }

    const url = `${env.apiBase.replace(/\/$/, "")}${path}`;
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        },
      });
      return res;
    } catch {
      // Treat as unreachable; caller should fallback to local state.
      return { ok: false, status: 0, json: async () => ({}) };
    }
  }

  return {
    // PUBLIC_INTERFACE
    async fetchGameState(gameId) {
      /** Fetch game state from backend. TODO: align with backend API once available. */
      const res = await safeFetch(`/games/${encodeURIComponent(gameId)}`, { method: "GET" });
      if (!res.ok) return null;
      return res.json();
    },

    // PUBLIC_INTERFACE
    async submitMove(gameId, move) {
      /** Submit a move to backend. TODO: align with backend API once available. */
      const res = await safeFetch(`/games/${encodeURIComponent(gameId)}/moves`, {
        method: "POST",
        body: JSON.stringify(move),
      });
      if (!res.ok) return null;
      return res.json();
    },
  };
}
