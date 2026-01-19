import React from "react";

// PUBLIC_INTERFACE
export function Controls({ onNewGame, onResign, onOfferDraw, disabled }) {
  /** Action buttons under the board. */
  return (
    <div className="controls">
      <button type="button" className="btn btnPrimary" onClick={onNewGame}>
        New Game
      </button>
      <button type="button" className="btn btnDanger" onClick={onResign} disabled={disabled}>
        Resign
      </button>
      <button type="button" className="btn" onClick={onOfferDraw} disabled={disabled}>
        Offer Draw
      </button>
    </div>
  );
}
