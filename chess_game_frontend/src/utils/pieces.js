const unicode = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};

// PUBLIC_INTERFACE
export function pieceToUnicode(piece) {
  /** Converts chess.js piece ({type, color}) to Unicode symbol. */
  if (!piece) return "";
  return unicode[piece.color]?.[piece.type] || "";
}
