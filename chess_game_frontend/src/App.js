import React, { useCallback, useMemo, useState } from "react";
import "./App.css";

import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import { getAppEnv } from "./config/env";
import { useGameState } from "./hooks/useGameState";
import { useLegalMoves } from "./hooks/useLegalMoves";

import { Board } from "./components/Board";
import { Sidebar } from "./components/Sidebar";
import { MoveList } from "./components/MoveList";
import { StatusBar } from "./components/StatusBar";
import { Controls } from "./components/Controls";
import { GameStatusCard } from "./components/GameStatusCard";
import { PromotionModal } from "./components/PromotionModal";

import { LobbyProvider } from "./contexts/LobbyContext";
import { LobbyPage } from "./pages/LobbyPage";
import { MatchRoomPage } from "./pages/MatchRoomPage";
import { ToastProvider } from "./components/ToastProvider";

function HomeLocalGame() {
  const env = useMemo(() => getAppEnv(), []);
  const game = useGameState();

  const [selectedSquare, setSelectedSquare] = useState(null);
  const legalMoves = useLegalMoves(game.chess, selectedSquare);
  const clearSelection = useCallback(() => setSelectedSquare(null), []);

  const onSquareClick = useCallback(
    async (square) => {
      if (!game.canInteract) return;

      if (!selectedSquare) {
        const p = game.chess.get(square);
        if (!p) return;
        if (p.color !== game.turn) return;
        setSelectedSquare(square);
        return;
      }

      if (selectedSquare === square) {
        clearSelection();
        return;
      }

      const legalTo = new Set((legalMoves || []).map((m) => m.to));
      if (legalTo.has(square)) {
        const res = await game.applyMove({ from: selectedSquare, to: square });
        if (res.ok) clearSelection();
        return;
      }

      const p = game.chess.get(square);
      if (p && p.color === game.turn) {
        setSelectedSquare(square);
        return;
      }
    },
    [clearSelection, game, legalMoves, selectedSquare]
  );

  return (
    <div className="container">
      <div className="headerBar">
        <div className="appTitle">Online Chess (local-first)</div>
        <div className="envBadge">
          <span style={{ marginRight: 10 }}>
            <Link to="/lobby">Lobby</Link>
          </span>
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
            Click a piece to see legal moves. Click a highlighted destination to move. The client enforces full chess rules (including castling, en passant, and
            promotion).
          </div>
        </div>

        <Sidebar>
          <GameStatusCard status={game.status} />
          <MoveList history={game.history} />

          <div>
            <div className="sidebarSectionTitle">Networking</div>
            <div className="statusCard">
              <div>
                <strong>Mode:</strong> {env.networkEnabled ? "Network-ready" : "Local-only"}
              </div>
              <div className="smallNote" style={{ marginTop: 6 }}>
                REST base: <code>{env.apiBase || "(unset)"}</code>
                <br />
                WS URL: <code>{env.wsUrl || "(unset)"}</code>
              </div>
              <div className="smallNote" style={{ marginTop: 8 }}>
                Multiplayer routes: <code>/lobby</code>, <code>/match/:gameId</code>
              </div>
            </div>
          </div>
        </Sidebar>
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

// PUBLIC_INTERFACE
function App() {
  /** Main app entry: local game + multiplayer lobby/match routes. */
  return (
    <ToastProvider>
      <BrowserRouter>
        <LobbyProvider>
          <div className="App">
            <Routes>
              <Route path="/" element={<HomeLocalGame />} />
              <Route path="/lobby" element={<LobbyPage />} />
              <Route path="/match/:gameId" element={<MatchRoomPage />} />
              <Route
                path="*"
                element={
                  <div className="container">
                    <div className="headerBar">
                      <div className="appTitle">Not found</div>
                      <div className="envBadge">
                        <Link to="/">Home</Link>
                      </div>
                    </div>
                    <div className="statusCard">
                      Unknown route. Go to <Link to="/lobby">Lobby</Link> or <Link to="/">Home</Link>.
                    </div>
                  </div>
                }
              />
            </Routes>
          </div>
        </LobbyProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;

