import { getAppEnv } from "../config/env";

function joinUrl(base, path) {
  const b = (base || "").replace(/\/$/, "");
  const p = (path || "").startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

// PUBLIC_INTERFACE
export function createWsClient() {
  /** Creates a small WebSocket client. Safe to use even if WS is unreachable. */
  const env = getAppEnv();

  function canConnect() {
    return Boolean(env.networkEnabled && env.wsUrl);
  }

  return {
    // PUBLIC_INTERFACE
    connectToGame({ gameId, onMessage, onOpen, onClose, onError }) {
      /**
       * Connect to a per-game WebSocket channel.
       * Convention: `${REACT_APP_WS_URL}/ws/game/:gameId`
       *
       * If your backend expects a different route, adjust REACT_APP_WS_URL accordingly
       * (e.g. set it to `wss://host` and we will append `/ws/game/:id`).
       */
      if (!canConnect() || !gameId) return { socket: null, close: () => {}, sendJson: () => false };

      const url = joinUrl(env.wsUrl, `/ws/game/${encodeURIComponent(gameId)}`);

      let socket;
      try {
        socket = new WebSocket(url);
      } catch (e) {
        onError?.(e);
        return { socket: null, close: () => {}, sendJson: () => false };
      }

      socket.onopen = () => onOpen?.();
      socket.onmessage = (evt) => onMessage?.(evt.data);
      socket.onclose = () => onClose?.();
      socket.onerror = (evt) => onError?.(evt);

      return {
        socket,
        sendJson: (obj) => {
          try {
            socket.send(JSON.stringify(obj));
            return true;
          } catch {
            return false;
          }
        },
        close: () => {
          try {
            socket.close();
          } catch {
            // ignore
          }
        },
      };
    },
  };
}

