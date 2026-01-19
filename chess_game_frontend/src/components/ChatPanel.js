import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * ChatPanel is UI-only; networking is handled by MatchContext (WS/REST when enabled).
 */

// PUBLIC_INTERFACE
export function ChatPanel({ messages, onSend, disabled, currentUserLabel = "you" }) {
  /** In-game chat UI: scrollable message list with timestamps and composer. */
  const [text, setText] = useState("");
  const scrollRef = useRef(null);

  const last20 = useMemo(() => (messages || []).slice(-50), [messages]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive.
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [last20.length]);

  const submit = useCallback(async () => {
    const v = String(text || "").trim();
    if (!v) return;
    const ok = await onSend?.(v);
    if (ok !== false) setText("");
  }, [onSend, text]);

  return (
    <div className="chatPanel" aria-label="In-game chat">
      <div className="chatMessages" ref={scrollRef} role="log" aria-live="polite" aria-relevant="additions">
        {last20.length === 0 ? <div className="chatEmpty">No messages yet.</div> : null}

        {last20.map((m, idx) => {
          const ts = m?.ts ? new Date(m.ts) : null;
          const timeLabel =
            ts && !Number.isNaN(ts.getTime()) ? ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

          const from = m?.from || "player";
          const fromLabel = from === "you" ? currentUserLabel : from;

          return (
            <div key={m?.id || `${m?.ts || idx}-${m?.message || ""}`} className={`chatMsg ${from === "you" ? "chatMsgYou" : ""}`}>
              <div className="chatMeta">
                <span className="chatFrom">{fromLabel}</span>
                {timeLabel ? <span className="chatTime">{timeLabel}</span> : null}
              </div>
              <div className="chatText">{m?.message || ""}</div>
            </div>
          );
        })}
      </div>

      <form
        className="chatComposer"
        onSubmit={(e) => {
          e.preventDefault();
          if (disabled) return;
          submit();
        }}
      >
        <input
          className="input chatInput"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={disabled ? "Chat unavailable" : "Type a message…"}
          disabled={disabled}
          aria-label="Chat message"
        />
        <button type="submit" className="btn btnPrimary chatSendBtn" disabled={disabled || !String(text || "").trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
