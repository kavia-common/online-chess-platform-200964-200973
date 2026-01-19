import { useCallback, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { createApiClient } from "../services/apiClient";
import { needsPromotion } from "../utils/promotion";
import { getAppEnv } from "../config/env";

function makeNewChess() {
  return new Chess();
}

function deriveStatus(chess, endedBy) {
  if (endedBy?.type === "resign") {
    return {
      label: "Game over",
      detail: `${endedBy.winner === "w" ? "White" : "Black"} wins by resignation.`,
      kind: "over",
    };
  }
  if (endedBy?.type === "draw") {
    return { label: "Draw agreed", detail: "Players agreed to a draw.", kind: "over" };
  }

  if (chess.isCheckmate()) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    return { label: "Checkmate", detail: `${winner} wins.`, kind: "over" };
  }
  if (chess.isStalemate()) return { label: "Stalemate", detail: "No legal moves.", kind: "over" };
  if (chess.isDraw()) return { label: "Draw", detail: "Draw by rule (insufficient material/threefold/50-move).", kind: "over" };

  if (chess.isCheck()) return { label: "Check", detail: `${chess.turn() === "w" ? "White" : "Black"} to move in check.`, kind: "check" };

  return { label: "In play", detail: `${chess.turn() === "w" ? "White" : "Black"} to move.`, kind: "play" };
}

// PUBLIC_INTERFACE
export function useGameState() {
  /**
   * Manages chess game state locally, with optional network stubs.
   * Ensures move legality and detects check/checkmate/stalemate on client.
   */
  const env = getAppEnv();
  const api = useMemo(() => createApiClient(), []);

  const chessRef = useRef(makeNewChess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [history, setHistory] = useState(chessRef.current.history({ verbose: true }));
  const [endedBy, setEndedBy] = useState(null);

  const [lastMove, setLastMove] = useState(null); // {from, to}

  const [promotionRequest, setPromotionRequest] = useState(null);
  // { from, to, color, piece, onResolve(promo) }

  const turn = chessRef.current.turn();

  const status = useMemo(() => deriveStatus(chessRef.current, endedBy), [endedBy]);

  const canInteract = status.kind !== "over";

  const reset = useCallback(() => {
    chessRef.current = makeNewChess();
    setFen(chessRef.current.fen());
    setHistory(chessRef.current.history({ verbose: true }));
    setLastMove(null);
    setEndedBy(null);
    setPromotionRequest(null);
  }, []);

  const resign = useCallback(() => {
    if (!canInteract) return;
    const winner = chessRef.current.turn() === "w" ? "b" : "w";
    setEndedBy({ type: "resign", winner });
  }, [canInteract]);

  const offerDraw = useCallback(() => {
    if (!canInteract) return;
    // Hot-seat: accept immediately.
    setEndedBy({ type: "draw" });
  }, [canInteract]);

  const applyMove = useCallback(
    async ({ from, to, promotion }) => {
      if (!canInteract) return { ok: false, reason: "Game over." };

      const chess = chessRef.current;
      const piece = chess.get(from);
      if (!piece) return { ok: false, reason: "No piece on source square." };
      if (piece.color !== chess.turn()) return { ok: false, reason: "Not your turn." };

      if (!promotion && needsPromotion(from, to, piece)) {
        // Ask UI for promotion piece.
        return new Promise((resolve) => {
          setPromotionRequest({
            from,
            to,
            color: piece.color,
            onResolve: (promo) => resolve(applyMove({ from, to, promotion: promo })),
          });
        });
      }

      try {
        const move = chess.move({ from, to, promotion: promotion || undefined });
        if (!move) return { ok: false, reason: "Illegal move." };

        setFen(chess.fen());
        setHistory(chess.history({ verbose: true }));
        setLastMove({ from, to });
        setPromotionRequest(null);

        // Network stub: best-effort submit, but never block local play.
        if (env.networkEnabled) {
          // TODO: include gameId once matchmaking/lobby exists.
          api.submitMove("local", { from, to, promotion: promotion || null }).catch(() => {});
        }

        return { ok: true, move };
      } catch (e) {
        return { ok: false, reason: e?.message || "Illegal move." };
      }
    },
    [api, canInteract, env.networkEnabled]
  );

  const dismissPromotion = useCallback(() => setPromotionRequest(null), []);

  return {
    chess: chessRef.current,
    fen,
    turn,
    history,
    status,
    lastMove,
    canInteract,
    promotionRequest,
    dismissPromotion,
    // PUBLIC_INTERFACE
    reset,
    // PUBLIC_INTERFACE
    resign,
    // PUBLIC_INTERFACE
    offerDraw,
    // PUBLIC_INTERFACE
    applyMove,
  };
}
