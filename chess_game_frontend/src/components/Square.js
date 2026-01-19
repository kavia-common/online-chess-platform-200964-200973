import React from "react";
import { pieceToUnicode } from "../utils/pieces";

/**
 * Square is a button for accessibility (keyboard focus).
 * It renders overlays for selection/last move/check, and legal move markers.
 */

// PUBLIC_INTERFACE
export function Square({
  square,
  isDark,
  piece,
  isSelected,
  isLastFrom,
  isLastTo,
  isCheckSquare,
  legalMarker, // "move" | "capture" | null
  showCoords,
  coordFile,
  coordRank,
  onClick,
}) {
  const className = `square ${isDark ? "squareDark" : "squareLight"}`;

  return (
    <button type="button" className={className} onClick={onClick} aria-label={`Square ${square}`}>
      <span className="piece" aria-hidden="true">
        {pieceToUnicode(piece)}
      </span>

      {showCoords && coordFile && <span className="coordFile">{coordFile}</span>}
      {showCoords && coordRank && <span className="coordRank">{coordRank}</span>}

      {(isSelected || isLastFrom || isLastTo || isCheckSquare) && (
        <span
          className={[
            "overlay",
            isSelected ? "overlaySelect" : "",
            isLastFrom || isLastTo ? "overlayLast" : "",
            isCheckSquare ? "overlayCheck" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      )}

      {legalMarker === "move" && <span className="legalDot" />}
      {legalMarker === "capture" && <span className="captureRing" />}
    </button>
  );
}
