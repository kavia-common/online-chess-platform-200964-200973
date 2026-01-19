// PUBLIC_INTERFACE
export function needsPromotion(fromSquare, toSquare, piece) {
  /** Returns true if moving piece requires promotion choice. */
  if (!piece || piece.type !== "p") return false;
  const toRank = Number(toSquare[1]);
  return (piece.color === "w" && toRank === 8) || (piece.color === "b" && toRank === 1);
}
