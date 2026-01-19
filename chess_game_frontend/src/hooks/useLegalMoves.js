import { useMemo } from "react";

// PUBLIC_INTERFACE
export function useLegalMoves(chess, selectedSquare) {
  /** Returns list of legal moves (verbose) for selected square. */
  return useMemo(() => {
    if (!chess || !selectedSquare) return [];
    try {
      return chess.moves({ square: selectedSquare, verbose: true });
    } catch {
      return [];
    }
  }, [chess, selectedSquare]);
}
