import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { createApiClient } from "../services/apiClient";
import { getAppEnv } from "../config/env";
import { useToast } from "../components/ToastProvider";

const LobbyContext = createContext(null);

// PUBLIC_INTERFACE
export function LobbyProvider({ children }) {
  /** Holds lobby state: list of public games + actions to create/join. */
  const env = getAppEnv();
  const api = useMemo(() => createApiClient(), []);
  const toast = useToast();

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setLastError("");

    const data = await api.listGames({ status: "open" });
    if (!data) {
      setLoading(false);
      setGames([]);
      if (env.networkEnabled) {
        const msg = "Backend unavailable. Lobby list is disabled, but local play still works.";
        setLastError(msg);
        toast.pushToast({ kind: "error", title: "Lobby", message: msg });
      }
      return;
    }

    // Support a couple of shapes:
    // - { games: [...] }
    // - [...] directly
    const list = Array.isArray(data) ? data : Array.isArray(data?.games) ? data.games : [];
    setGames(list);
    setLoading(false);
  }, [api, env.networkEnabled, toast]);

  const createGame = useCallback(
    async ({ isPublic = true } = {}) => {
      const data = await api.createGame({ isPublic });
      if (!data) {
        if (env.networkEnabled) toast.pushToast({ kind: "error", title: "Create game", message: "Failed to create game (backend unreachable)." });
        return null;
      }
      return data;
    },
    [api, env.networkEnabled, toast]
  );

  const joinGame = useCallback(
    async (gameId, { code } = {}) => {
      const data = await api.joinGame(gameId, { code });
      if (!data) {
        if (env.networkEnabled) toast.pushToast({ kind: "error", title: "Join game", message: "Failed to join game (check ID/code)." });
        return null;
      }
      return data;
    },
    [api, env.networkEnabled, toast]
  );

  const value = useMemo(
    () => ({
      env,
      games,
      loading,
      lastError,
      // PUBLIC_INTERFACE
      refresh,
      // PUBLIC_INTERFACE
      createGame,
      // PUBLIC_INTERFACE
      joinGame,
    }),
    [env, games, loading, lastError, refresh, createGame, joinGame]
  );

  return <LobbyContext.Provider value={value}>{children}</LobbyContext.Provider>;
}

// PUBLIC_INTERFACE
export function useLobby() {
  /** Hook to access lobby state/actions. */
  const ctx = useContext(LobbyContext);
  if (!ctx) throw new Error("useLobby must be used within LobbyProvider");
  return ctx;
}

