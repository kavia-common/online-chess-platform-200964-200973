import React from "react";

// PUBLIC_INTERFACE
export function StatusBar({ whiteName, blackName, turn }) {
  /** Shows player names and side-to-move. */
  const turnLabel = turn === "w" ? "White to move" : "Black to move";
  return (
    <div className="statusBar">
      <div className="playerLine">
        <div className="playerLabel">White</div>
        <div className="playerName">{whiteName}</div>
      </div>

      <div className="turnPill" aria-label={turnLabel}>
        <span className="turnDot" style={{ background: turn === "w" ? "var(--accent-primary)" : "var(--accent-success)" }} />
        {turnLabel}
      </div>

      <div className="playerLine" style={{ textAlign: "right" }}>
        <div className="playerLabel">Black</div>
        <div className="playerName">{blackName}</div>
      </div>
    </div>
  );
}
