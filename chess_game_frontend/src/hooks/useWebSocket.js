import { useEffect, useMemo, useRef, useState } from "react";
import { createWsClient } from "../services/wsClient";
import { getAppEnv } from "../config/env";

// PUBLIC_INTERFACE
export function useWebSocket({ enabled, onGameEvent }) {
  /** Hook for WS connection; safe no-op when disabled/unreachable. */
  const env = getAppEnv();
  const wsClient = useMemo(() => createWsClient(), []);
  const connRef = useRef(null);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !env.networkEnabled || !env.wsUrl) return;

    connRef.current = wsClient.connect({
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onMessage: (data) => {
        // Backend message format TBD. For now assume JSON.
        try {
          const evt = JSON.parse(data);
          onGameEvent?.(evt);
        } catch {
          // ignore non-JSON
        }
      },
      onError: () => setConnected(false),
    });

    return () => {
      connRef.current?.close?.();
      connRef.current = null;
    };
  }, [enabled, env.networkEnabled, env.wsUrl, onGameEvent, wsClient]);

  return { connected };
}
