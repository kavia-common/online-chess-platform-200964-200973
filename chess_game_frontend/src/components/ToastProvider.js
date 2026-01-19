import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

function makeId() {
  return Math.random().toString(16).slice(2);
}

// PUBLIC_INTERFACE
export function ToastProvider({ children }) {
  /** Provides app-wide toast notifications (errors/info). */
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    (toast) => {
      const id = makeId();
      const normalized = {
        id,
        kind: toast?.kind || "info", // "info" | "error" | "success"
        title: toast?.title || "",
        message: toast?.message || "",
        timeoutMs: typeof toast?.timeoutMs === "number" ? toast.timeoutMs : 3500,
      };

      setToasts((prev) => [normalized, ...prev].slice(0, 4));

      if (normalized.timeoutMs > 0) {
        const timer = setTimeout(() => removeToast(id), normalized.timeoutMs);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [removeToast]
  );

  const value = useMemo(
    () => ({
      // PUBLIC_INTERFACE
      pushToast,
      // PUBLIC_INTERFACE
      removeToast,
    }),
    [pushToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toastStack" aria-live="polite" aria-relevant="additions removals">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === "error" ? "alert" : "status"}>
            <div className="toastHeader">
              <div className="toastTitle">{t.title || (t.kind === "error" ? "Error" : "Notice")}</div>
              <button type="button" className="toastClose" onClick={() => removeToast(t.id)} aria-label="Dismiss notification">
                ×
              </button>
            </div>
            {t.message ? <div className="toastBody">{t.message}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// PUBLIC_INTERFACE
export function useToast() {
  /** Hook to publish/dismiss toast messages. */
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe fallback (no provider) so app never crashes.
    return {
      pushToast: () => null,
      removeToast: () => {},
    };
  }
  return ctx;
}

