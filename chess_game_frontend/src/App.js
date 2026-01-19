import React, { useCallback, useMemo, useState } from "react";
import "./App.css";

import { getAppEnv } from "./config/env";
import { useGameState } from "./hooks/useGameState";
import { useLegalMoves } from "./hooks/useLegalMoves";
import { useWebSocket } from "./hooks/useWebSocket";

import { Board } from "./components/Board";
import { Sidebar } from "./components/Sidebar";
import { MoveList } from "./components/MoveList";
import { StatusBar } from "./components/StatusBar";
import { Controls } from "./components/Controls";
import { GameStatusCard } from "./components/GameStatusCard";
import { PromotionModal } from "./components/PromotionModal";

// PUBLIC_INTERFACE
function App() {
  /** Main app entry: two-player hot-seat chess with optional networking hooks. */
  const env = useMemo(() => getAppEnv(), []);
  const game = useGameState();

  const [selectedSquare, setSelectedSquare] = useState(null);

  const legalMoves = useLegalMoves(game.chess, selectedSquare);

  const clearSelection = useCallback(() => setSelectedSquare(null), []);

  const onSquareClick = useCallback(
    async (square) => {
      if (!game.canInteract) return;

      if (!selectedSquare) {
        // Select only if piece belongs to side to move.
        const p = game.chess.get(square);
        if (!p) return;
        if (p.color !== game.turn) return;
        setSelectedSquare(square);
        return;
      }

      // Clicking selected square deselects
      if (selectedSquare === square) {
        clearSelection();
        return;
      }

      // Try move if square is a legal destination; otherwise treat as re-select.
      const legalTo = new Set((legalMoves || []).map((m) => m.to));
      if (legalTo.has(square)) {
        const res = await game.applyMove({ from: selectedSquare, to: square });
        if (res.ok) clearSelection();
        return;
      }

      // If clicked another own piece, switch selection.
      const p = game.chess.get(square);
      if (p && p.color === game.turn) {
        setSelectedSquare(square);
        return;
      }

      // Otherwise ignore.
    },
    [clearSelection, game, legalMoves, selectedSquare]
  );

  // WebSocket events (stub): currently just a placeholder for future backend wiring.
  useWebSocket({
    enabled: env.networkEnabled,
    onGameEvent: (evt) => {
      // TODO: when backend sends authoritative state, apply it here.
      // Example: if (evt.type === "game_state") load FEN/history from evt.payload.
      void evt;
    },
  });

  return (
    <div className="App">
      <div className="container">
        <div className="headerBar">
          <div className="appTitle">Online Chess (local-first)</div>
          <div className="envBadge">
            networking: <strong>{env.networkEnabled ? "enabled" : "disabled"}</strong>
          </div>
        </div>

        <div className="mainLayout">
          <div className="boardArea">
            <StatusBar whiteName="Player 1" blackName="Player 2" turn={game.turn} />

            <div className="boardShell">
              <Board
                chess={game.chess}
                selectedSquare={selectedSquare}
                legalMoves={legalMoves}
                lastMove={game.lastMove}
                onSquareClick={onSquareClick}
                perspective="w"
              />
            </div>

            <Controls onNewGame={game.reset} onResign={game.resign} onOfferDraw={game.offerDraw} disabled={!game.canInteract} />

            <div className="smallNote">
              Click a piece to see legal moves. Click a highlighted destination to move. The client enforces full chess rules (including castling,
              en passant, and promotion).
            </div>
          </div>

          <Sidebar>
            <GameStatusCard status={game.status} />
            <MoveList history={game.history} />

            <div>
              <div className="sidebarSectionTitle">Networking</div>
              <div className="statusCard">
                <div>
                  <strong>Mode:</strong> {env.networkEnabled ? "Network-ready (stubs)" : "Local-only"}
                </div>
                <div className="smallNote" style={{ marginTop: 6 }}>
                  REST base: <code>{env.apiBase || "(unset)"}</code>
                  <br />
                  WS URL: <code>{env.wsUrl || "(unset)"}</code>
                </div>
              </div>
            </div>
          </Sidebar>
        </div>
      </div>

      <PromotionModal
        request={game.promotionRequest}
        onChoose={(promo) => game.promotionRequest?.onResolve?.(promo)}
        onCancel={() => {
          game.dismissPromotion();
        }}
      />
    </div>
  );
}

export default App;
