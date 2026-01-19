import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { createApiClient } from "../services/apiClient";
import { createWsClient } from "../services/wsClient";
import { getAppEnv } from "../config/env";
import { useToast } from "../components/ToastProvider";

const MatchContext = createContext(null);

function normalizeColor(c) {
  if (c === "w" || c === "b") return c;
  if (c === "white") return "w";
  if (c === "black") return "b";
  return null;
}

function inferOpponentPresent(players) {
  if (!players) return false;
  const w = players.white || players.w;
  const b = players.black || players.b;
  return Boolean(w && b);
}

// PUBLIC_INTERFACE
export function MatchProvider({ gameId, children }) {
  /** Manages per-match state: WS connection + current FEN/history + players/ready/chat. */
  const env = getAppEnv();
  const api = useMemo(() => createApiClient(), []);
  const ws = useMemo(() => createWsClient(), []);
  const toast = useToast();

  const connRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);

  const chessRef = useRef(new Chess());

  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("offline"); // offline|connecting|connected|reconnecting|error
  const [playerColor, setPlayerColor] = useState(null); // "w" | "b"
  const [players, setPlayers] = useState({ white: null, black: null });
  const [ready, setReady] = useState({ white: false, black: false });
  const [chat, setChat] = useState([]);

  const [fen, setFen] = useState(chessRef.current.fen());
  const [history, setHistory] = useState(chessRef.current.history({ verbose: true }));
  const [lastMove, setLastMove] = useState(null);

  const opponentPresent = useMemo(() => inferOpponentPresent(players), [players]);

  const applyAuthoritativeState = useCallback((state) => {
    // Accept {fen, moves?, players?, ready?, youColor?} best-effort.
    const nextFen = state?.fen;
    if (typeof nextFen === "string" && nextFen.length > 0) {
      try {
        chessRef.current.load(nextFen);
        setFen(chessRef.current.fen());
        setHistory(chessRef.current.history({ verbose: true }));
      } catch {
        // ignore invalid fen
      }
    }

    if (state?.players) setPlayers((prev) => ({ ...prev, ...state.players }));
    if (state?.ready) setReady((prev) => ({ ...prev, ...state.ready }));
    const c = normalizeColor(state?.youColor || state?.playerColor);
    if (c) setPlayerColor(c);
  }, []);

  const fetchInitialState = useCallback(async () => {
    const state = await api.fetchGameState(gameId);
    if (state) {
      applyAuthoritativeState(state);
      // Some backends return color assignment here
      const c = normalizeColor(state?.youColor || state?.playerColor);
      if (c) setPlayerColor(c);
    }
  }, [api, applyAuthoritativeState, gameId]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    connRef.current?.close?.();
    connRef.current = null;
    setConnected(false);
    setConnectionStatus("offline");
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!env.networkEnabled || !env.wsUrl) return;
    if (reconnectTimerRef.current) return;

    reconnectAttemptRef.current += 1;
    const attempt = reconnectAttemptRef.current;

    setConnectionStatus(attempt <= 1 ? "reconnecting" : "reconnecting");
    const backoff = Math.min(8000, 800 + attempt * 700);

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      // eslint-disable-next-line no-use-before-define
      connect();
    }, backoff);
  }, [env.networkEnabled, env.wsUrl]);

  const onWsMessage = useCallback(
    (data) => {
      try {
        const evt = JSON.parse(data);

        // Expected examples (best-effort):
        // {type:"game_state", payload:{fen, players, ready, youColor}}
        // {type:"move", payload:{from,to,promotion,fen,san,by}}
        // {type:"player_join", payload:{players}}
        // {type:"player_leave", payload:{players}}
        // {type:"ready", payload:{ready}}
        // {type:"chat", payload:{id, from, message, ts}}
        // {type:"offer", payload:{kind:"draw"|"resign"|...}}
        const type = evt?.type;
        const payload = evt?.payload || evt;

        if (type === "game_state" || payload?.fen) {
          applyAuthoritativeState(payload);
          return;
        }

        if (type === "player_join" || type === "player_leave") {
          if (payload?.players) setPlayers((prev) => ({ ...prev, ...payload.players }));
          if (payload?.ready) setReady((prev) => ({ ...prev, ...payload.ready }));
          return;
        }

        if (type === "ready") {
          if (payload?.ready) setReady((prev) => ({ ...prev, ...payload.ready }));
          return;
        }

        if (type === "chat") {
          const msg = payload?.message;
          if (msg) setChat((prev) => [...prev, { ...payload, ts: payload?.ts || Date.now() }].slice(-200));
          return;
        }

        if (type === "move") {
          // If fen is provided, prefer authoritative load.
          if (payload?.fen) {
            applyAuthoritativeState(payload);
          } else if (payload?.from && payload?.to) {
            // Fallback: attempt to apply move locally.
            try {
              const move = chessRef.current.move({
                from: payload.from,
                to: payload.to,
                promotion: payload.promotion || undefined,
              });
              if (move) {
                setFen(chessRef.current.fen());
                setHistory(chessRef.current.history({ verbose: true }));
                setLastMove({ from: payload.from, to: payload.to });
              }
            } catch {
              // ignore
            }
          }
          return;
        }

        if (type === "offer") {
          toast.pushToast({ kind: "info", title: "Match", message: "Received an offer/action from opponent." });
        }
      } catch {
        // ignore non-JSON
      }
    },
    [applyAuthoritativeState, toast]
  );

  const connect = useCallback(() => {
    if (!env.networkEnabled || !env.wsUrl) return;
    if (!gameId) return;

    setConnectionStatus((prev) => (prev === "connected" ? "connected" : "connecting"));

    connRef.current?.close?.();
    connRef.current = ws.connectToGame({
      gameId,
      onOpen: () => {
        reconnectAttemptRef.current = 0;
        setConnected(true);
        setConnectionStatus("connected");
      },
      onClose: () => {
        setConnected(false);
        setConnectionStatus("offline");
        scheduleReconnect();
      },
      onError: () => {
        setConnected(false);
        setConnectionStatus("error");
        scheduleReconnect();
      },
      onMessage: onWsMessage,
    });
  }, [env.networkEnabled, env.wsUrl, gameId, onWsMessage, scheduleReconnect, ws]);

  useEffect(() => {
    // Always fetch initial state if networking is enabled; if not, match room still runs in local-only mode.
    if (env.networkEnabled && env.apiBase) {
      fetchInitialState().catch(() => {});
    }
  }, [env.apiBase, env.networkEnabled, fetchInitialState]);

  useEffect(() => {
    if (!env.networkEnabled) return;
    connect();
    return () => disconnect();
  }, [connect, disconnect, env.networkEnabled]);

  const setLocalReady = useCallback(
    async (nextReady) => {
      setReady((prev) => {
        const key = playerColor === "b" ? "black" : "white";
        return { ...prev, [key]: Boolean(nextReady) };
      });
      if (!env.networkEnabled) return false;
      return api.setReady(gameId, nextReady);
    },
    [api, env.networkEnabled, gameId, playerColor]
  );

  const sendChat = useCallback(
    async (message) => {
      const text = String(message || "").trim();
      if (!text) return false;

      // Optimistic append
      setChat((prev) => [...prev, { id: `local-${Date.now()}`, from: "you", message: text, ts: Date.now() }].slice(-200));

      // Prefer WS broadcast, but also provide REST fallback
      const sentWs = connRef.current?.sendJson?.({ type: "chat", payload: { message: text } }) || false;
      if (!sentWs && env.networkEnabled) {
        await api.sendChat(gameId, text);
      }
      return true;
    },
    [api, env.networkEnabled, gameId]
  );

  const submitMove = useCallback(
    async ({ from, to, promotion, san, fenBefore, fenAfter }) => {
      // Prefer WS send, then REST.
      const payload = { from, to, promotion: promotion || null, san: san || null, fenBefore: fenBefore || null, fenAfter: fenAfter || null };

      const sentWs = connRef.current?.sendJson?.({ type: "move", payload }) || false;
      if (!sentWs && env.networkEnabled) {
        await api.submitMove(gameId, payload);
      }
      return true;
    },
    [api, env.networkEnabled, gameId]
  );

  const value = useMemo(
    () => ({
      env,
      gameId,

      connected,
      connectionStatus,

      playerColor,
      players,
      ready,
      opponentPresent,

      chess: chessRef.current,
      fen,
      history,
      lastMove,

      chat,

      // PUBLIC_INTERFACE
      connect,
      // PUBLIC_INTERFACE
      disconnect,
      // PUBLIC_INTERFACE
      setLocalReady,
      // PUBLIC_INTERFACE
      sendChat,
      // PUBLIC_INTERFACE
      submitMove,
      // PUBLIC_INTERFACE
      applyAuthoritativeState,
    }),
    [
      applyAuthoritativeState,
      chat,
      connect,
      connected,
      connectionStatus,
      disconnect,
      env,
      fen,
      gameId,
      history,
      lastMove,
      opponentPresent,
      playerColor,
      players,
      ready,
      sendChat,
      setLocalReady,
      submitMove,
    ]
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

// PUBLIC_INTERFACE
export function useMatch() {
  /** Hook to access per-match multiplayer state. */
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error("useMatch must be used within MatchProvider");
  return ctx;
}

