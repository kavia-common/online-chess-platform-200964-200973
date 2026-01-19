import React, { useState } from "react";

const options = [
  { value: "q", label: "Queen" },
  { value: "r", label: "Rook" },
  { value: "b", label: "Bishop" },
  { value: "n", label: "Knight" },
];

// PUBLIC_INTERFACE
export function PromotionModal({ request, onChoose, onCancel }) {
  /** Modal to choose promotion piece when a pawn reaches last rank. */
  const [promo, setPromo] = useState("q");

  if (!request) return null;

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label="Choose promotion piece">
      <div className="modal">
        <h3 className="modalTitle">Pawn promotion</h3>
        <div className="modalBody">
          Choose a piece to promote to for <strong>{request.color === "w" ? "White" : "Black"}</strong>.
        </div>

        <select className="select" value={promo} onChange={(e) => setPromo(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div style={{ height: 12 }} />

        <div className="modalActions">
          <button type="button" className="btn btnPrimary" onClick={() => onChoose(promo)}>
            Promote
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
