import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Board } from "../components/Board";
import { Sidebar } from "../components/Sidebar";
import { MoveList } from "../components/MoveList";
import { StatusBar } from "../components/StatusBar";
import { Controls } from "../components/Controls";
import { PromotionModal } from "../components/PromotionModal";
import { useToast } from "../components/ToastProvider";
import { ChatPanel } from "../components/ChatPanel";

import { useLegalMoves } from "../hooks/useLegalMoves";
import { needsPromotion } from "../utils/promotion";

import { MatchProvider, useMatch } from "../contexts/MatchContext";

function useMatchRoomController() {
  const match = useMatch();
  const toast = useToast();

  const [selectedSquare, setSelectedSquare] = useState(null);
  const [promotionRequest, setPromotionRequest] = useState(null);

  const legalMoves = useLegalMoves(match.chess, selectedSquare);

  const perspective = useMemo(() => match.playerColor || "w", [match.playerColor]);

  const canInteract = useMemo(() => {
    // Local-first: allow interaction even if opponent not present, but when color is known, enforce turn ownership.
    if (!match.playerColor) return true;
    return match.chess.turn() === match.playerColor;
  }, [match.chess, match.playerColor]);

  const clearSelection = useCallback(() => setSelectedSquare(null), []);

  const applyLocalMove = useCallback(
    async ({ from, to, promotion }) => {
      const chess = match.chess;

      const piece = chess.get(from);
      if (!piece) return { ok: false, reason: "No piece on source square." };

      // Enforce side ownership if assigned.
      if (match.playerColor && piece.color !== match.playerColor) return { ok: false, reason: "That is not your piece." };
      if (match.playerColor && chess.turn() !== match.playerColor) return { ok: false, reason: "Not your turn." };

      if (!promotion && needsPromotion(from, to, piece)) {
        return new Promise((resolve) => {
          setPromotionRequest({
            from,
            to,
            color: piece.color,
            onResolve: (promo) => resolve(applyLocalMove({ from, to, promotion: promo })),
          });
        });
      }

      const fenBefore = chess.fen();
      let move;
      try {
        move = chess.move({ from, to, promotion: promotion || undefined });
      } catch (e) {
        return { ok: false, reason: e?.message || "Illegal move." };
      }

      if (!move) return { ok: false, reason: "Illegal move." };

      // Attach timestamp so enhanced MoveList can render times even in local-first mode.
      move.ts = Date.now();

      // Optimistic local update
      match.applyAuthoritativeState({ fen: chess.fen() });
      // Highlight last move
      // (server may also broadcast; that's ok)
      // eslint-disable-next-line react/no-unused-state
      // no-op

      // Best-effort send; never block UI
      if (match.env.networkEnabled) {
        await match.submitMove({
          from,
          to,
          promotion: promotion || null,
          san: move.san,
          fenBefore,
          fenAfter: chess.fen(),
        });
      }

      setPromotionRequest(null);
      return { ok: true };
    },
    [match]
  );

  const onSquareClick = useCallback(
    async (square) => {
      if (!canInteract) return;

      if (!selectedSquare) {
        const p = match.chess.get(square);
        if (!p) return;
        if (match.playerColor && p.color !== match.playerColor) return;
        setSelectedSquare(square);
        return;
      }

      if (selectedSquare === square) {
        clearSelection();
        return;
      }

      const legalTo = new Set((legalMoves || []).map((m) => m.to));
      if (legalTo.has(square)) {
        const res = await applyLocalMove({ from: selectedSquare, to: square });
        if (!res.ok) {
          toast.pushToast({ kind: "error", title: "Move rejected", message: res.reason || "Illegal move." });
        } else {
          clearSelection();
        }
        return;
      }

      const p = match.chess.get(square);
      if (p && (!match.playerColor || p.color === match.playerColor)) {
        setSelectedSquare(square);
      }
    },
    [applyLocalMove, canInteract, clearSelection, legalMoves, match.chess, match.playerColor, selectedSquare, toast]
  );

  return {
    match,
    selectedSquare,
    setSelectedSquare,
    legalMoves,
    onSquareClick,
    promotionRequest,
    dismissPromotion: () => setPromotionRequest(null),
    perspective,
    canInteract,
  };
}

function MatchRoomInner() {
  const nav = useNavigate();
  const toast = useToast();
  const controller = useMatchRoomController();
  const { match } = controller;

  const whiteName = useMemo(() => match.players?.white?.name || match.players?.white || "White", [match.players]);
  const blackName = useMemo(() => match.players?.black?.name || match.players?.black || "Black", [match.players]);

  const inviteLink = useMemo(() => `${window.location.origin}/match/${encodeURIComponent(match.gameId)}`, [match.gameId]);

  useEffect(() => {
    if (!match.env.networkEnabled) {
      toast.pushToast({
        kind: "info",
        title: "Local-only mode",
        message: "Networking is disabled; match room will behave like local play.",
        timeoutMs: 4500,
      });
    }
  }, [match.env.networkEnabled, toast]);

  const chatDisabled = useMemo(() => {
    // Chat should be usable offline (local-echo). Only disable if no handler.
    return typeof match.sendChat !== "function";
  }, [match.sendChat]);

  return (
    <div className="container">
      <div className="headerBar">
        <div className="appTitle">Match Room</div>
        <div className="envBadge">
          <span className={`badge ${match.connected ? "badgeGreen" : "badgeRed"}`}>
            {match.env.networkEnabled ? (match.connected ? "WS connected" : `WS ${match.connectionStatus}`) : "offline"}
          </span>
        </div>
      </div>

      <div className="matchLayout">
        <div className="boardArea">
          <StatusBar whiteName={whiteName} blackName={blackName} turn={match.chess.turn()} />

          <div className="boardShell">
            <Board
              chess={match.chess}
              selectedSquare={controller.selectedSquare}
              legalMoves={controller.legalMoves}
              lastMove={match.lastMove}
              onSquareClick={controller.onSquareClick}
              perspective={controller.perspective}
            />
          </div>

          <Controls
            onNewGame={() => {
              toast.pushToast({ kind: "info", title: "Match", message: "New game is controlled by the server in multiplayer." });
            }}
            onResign={() => {
              // Best-effort offer/action
              match.env.networkEnabled && match.submitMove({ from: null, to: null });
              toast.pushToast({ kind: "info", title: "Resign", message: "Resign flow is backend-dependent (stub)." });
            }}
            onOfferDraw={() => {
              toast.pushToast({ kind: "info", title: "Draw", message: "Draw offer flow is backend-dependent (stub)." });
            }}
            disabled={!controller.canInteract}
          />

          <div className="smallNote">
            Your color: <span className="kbd">{match.playerColor ? (match.playerColor === "w" ? "White" : "Black") : "unassigned"}</span> · Turn control enforced when
            assigned.
          </div>
        </div>

        <Sidebar>
          <div className="matchSidebarTop">
            <div>
              <div className="sidebarSectionTitle">Game</div>
              <div className="statusCard">
                <div>
                  <strong>Game ID:</strong> <code>{match.gameId}</code>
                </div>
                <div style={{ marginTop: 6 }}>
                  Opponent: <strong>{match.opponentPresent ? "present" : "waiting..."}</strong>
                </div>
                <div className="smallNote" style={{ marginTop: 8 }}>
                  Ready:{" "}
                  <span className="kbd">
                    W:{match.ready?.white ? "✓" : "—"} / B:{match.ready?.black ? "✓" : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="sidebarSectionTitle">Invite</div>
              <div className="statusCard">
                <div className="smallNote">Copy invite link to share:</div>
                <div className="copyRow" style={{ marginTop: 8 }}>
                  <input className="input" value={inviteLink} readOnly />
                  <button
                    type="button"
                    className="btn"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(inviteLink);
                        toast.pushToast({ kind: "success", title: "Invite link", message: "Copied to clipboard." });
                      } catch {
                        toast.pushToast({ kind: "error", title: "Invite link", message: "Clipboard copy failed." });
                      }
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="row">
              <button type="button" className="btn btnPrimary" onClick={() => match.setLocalReady(true)}>
                I’m Ready
              </button>
              <button type="button" className="btn" onClick={() => match.setLocalReady(false)}>
                Unready
              </button>
            </div>

            <button
              type="button"
              className="btn btnDanger"
              onClick={async () => {
                if (match.env.networkEnabled) {
                  await match.disconnect();
                }
                nav("/lobby");
              }}
            >
              Leave Match
            </button>
          </div>

          <MoveList history={match.history} />

          <div>
            <div className="sidebarSectionTitle">Chat</div>
            <ChatPanel messages={match.chat} onSend={(msg) => match.sendChat(msg)} disabled={chatDisabled} />
            {match.env.networkEnabled && !match.env.wsUrl && !match.env.apiBase ? (
              <div className="smallNote" style={{ marginTop: 8 }}>
                Networking is enabled but <span className="kbd">REACT_APP_WS_URL</span>/<span className="kbd">REACT_APP_API_BASE</span> are unset; chat will local-echo only.
              </div>
            ) : null}
          </div>
        </Sidebar>
      </div>

      <PromotionModal
        request={controller.promotionRequest}
        onChoose={(promo) => controller.promotionRequest?.onResolve?.(promo)}
        onCancel={() => controller.dismissPromotion()}
      />
    </div>
  );
}

// PUBLIC_INTERFACE
export function MatchRoomPage() {
  /** Route wrapper that provides MatchProvider per gameId. */
  const params = useParams();
  const gameId = params.gameId;

  return (
    <MatchProvider gameId={gameId}>
      <MatchRoomInner />
    </MatchProvider>
  );
}
