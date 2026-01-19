import { getAppEnv } from "../config/env";

/**
 * The backend API is intentionally treated as "best-effort".
 * All functions return null/false on failure so the UI can gracefully fallback.
 *
 * Endpoint paths are conventional and may need aligning to your backend:
 * - POST   /games                create game
 * - GET    /games?status=open    list public open games
 * - POST   /games/:id/join       join game
 * - POST   /games/:id/leave      leave game
 * - POST   /games/:id/ready      mark player ready
 * - GET    /games/:id            fetch state (fen, players, etc.)
 * - POST   /games/:id/moves      submit move (from,to,promotion,san,fenBefore,fenAfter)
 * - POST   /games/:id/chat       send chat message
 * - POST   /games/:id/offer      offer draw/resign/accept/decline (optional)
 */

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

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  return {
    // PUBLIC_INTERFACE
    async listGames({ status = "open" } = {}) {
      /** List joinable public games (best-effort). */
      const qs = status ? `?status=${encodeURIComponent(status)}` : "";
      const res = await safeFetch(`/games${qs}`, { method: "GET" });
      if (!res.ok) return null;
      return safeJson(res);
    },

    // PUBLIC_INTERFACE
    async createGame({ isPublic = true } = {}) {
      /** Create a new game; returns {gameId, ...} (best-effort). */
      const res = await safeFetch(`/games`, {
        method: "POST",
        body: JSON.stringify({ public: Boolean(isPublic) }),
      });
      if (!res.ok) return null;
      return safeJson(res);
    },

    // PUBLIC_INTERFACE
    async joinGame(gameId, { code } = {}) {
      /** Join a game by ID (and optional invite code). */
      const res = await safeFetch(`/games/${encodeURIComponent(gameId)}/join`, {
        method: "POST",
        body: JSON.stringify({ code: code || null }),
      });
      if (!res.ok) return null;
      return safeJson(res);
    },

    // PUBLIC_INTERFACE
    async leaveGame(gameId) {
      /** Leave a game. */
      const res = await safeFetch(`/games/${encodeURIComponent(gameId)}/leave`, { method: "POST" });
      if (!res.ok) return false;
      return true;
    },

    // PUBLIC_INTERFACE
    async setReady(gameId, ready) {
      /** Mark local player ready/unready (best-effort). */
      const res = await safeFetch(`/games/${encodeURIComponent(gameId)}/ready`, {
        method: "POST",
        body: JSON.stringify({ ready: Boolean(ready) }),
      });
      if (!res.ok) return false;
      return true;
    },

    // PUBLIC_INTERFACE
    async fetchGameState(gameId) {
      /** Fetch game state from backend. */
      const res = await safeFetch(`/games/${encodeURIComponent(gameId)}`, { method: "GET" });
      if (!res.ok) return null;
      return safeJson(res);
    },

    // PUBLIC_INTERFACE
    async submitMove(gameId, move) {
      /** Submit a move to backend (best-effort). */
      const res = await safeFetch(`/games/${encodeURIComponent(gameId)}/moves`, {
        method: "POST",
        body: JSON.stringify(move),
      });
      if (!res.ok) return null;
      return safeJson(res);
    },

    // PUBLIC_INTERFACE
    async sendChat(gameId, message) {
      /** Send chat message (best-effort). */
      const res = await safeFetch(`/games/${encodeURIComponent(gameId)}/chat`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      if (!res.ok) return null;
      return safeJson(res);
    },

    // PUBLIC_INTERFACE
    async sendOffer(gameId, offer) {
      /** Send offer/action like resign/draw/accept (best-effort). */
      const res = await safeFetch(`/games/${encodeURIComponent(gameId)}/offer`, {
        method: "POST",
        body: JSON.stringify(offer),
      });
      if (!res.ok) return null;
      return safeJson(res);
    },
  };
}

