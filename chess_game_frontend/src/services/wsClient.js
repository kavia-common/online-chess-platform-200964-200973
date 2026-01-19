import { getAppEnv } from "../config/env";

// PUBLIC_INTERFACE
export function createWsClient() {
  /** Creates a small WebSocket client. Safe to use even if WS is unreachable. */
  const env = getAppEnv();

  function canConnect() {
    return Boolean(env.networkEnabled && env.wsUrl);
  }

  return {
    // PUBLIC_INTERFACE
    connect({ onMessage, onOpen, onClose, onError }) {
      /**
       * Connect to WebSocket server and subscribe to events.
       * TODO: add auth/game subscription protocol once backend is defined.
       */
      if (!canConnect()) return { socket: null, close: () => {} };

      let socket;
      try {
        socket = new WebSocket(env.wsUrl);
      } catch (e) {
        onError?.(e);
        return { socket: null, close: () => {} };
      }

      socket.onopen = () => onOpen?.();
      socket.onmessage = (evt) => onMessage?.(evt.data);
      socket.onclose = () => onClose?.();
      socket.onerror = (evt) => onError?.(evt);

      return {
        socket,
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
