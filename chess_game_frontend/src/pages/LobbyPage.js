import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLobby } from "../contexts/LobbyContext";
import { useToast } from "../components/ToastProvider";

// PUBLIC_INTERFACE
export function LobbyPage() {
  /** Lobby screen: create/join/list public games (best-effort). */
  const { env, games, loading, lastError, refresh, createGame, joinGame } = useLobby();
  const toast = useToast();
  const navigate = useNavigate();

  const [joinId, setJoinId] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const canNetwork = useMemo(() => Boolean(env.networkEnabled && env.apiBase), [env.apiBase, env.networkEnabled]);

  useEffect(() => {
    // Auto-refresh once on mount when networking is enabled.
    if (canNetwork) refresh().catch(() => {});
  }, [canNetwork, refresh]);

  const onCreate = useCallback(async () => {
    if (!canNetwork) {
      toast.pushToast({ kind: "info", title: "Networking disabled", message: "Enable REACT_APP_FEATURE_FLAGS={\"network\":true} to use the lobby." });
      return;
    }
    const res = await createGame({ isPublic: true });
    const gameId = res?.gameId || res?.id;
    if (!gameId) return;
    navigate(`/match/${encodeURIComponent(gameId)}`);
  }, [canNetwork, createGame, navigate, toast]);

  const onJoin = useCallback(async () => {
    const id = joinId.trim();
    if (!id) {
      toast.pushToast({ kind: "error", title: "Join game", message: "Enter a game ID first." });
      return;
    }
    if (!canNetwork) {
      toast.pushToast({ kind: "info", title: "Networking disabled", message: "Enable networking feature flag to join games." });
      return;
    }
    const res = await joinGame(id, { code: joinCode.trim() || undefined });
    const gameId = res?.gameId || res?.id || id;
    navigate(`/match/${encodeURIComponent(gameId)}`);
  }, [canNetwork, joinCode, joinGame, joinId, navigate, toast]);

  return (
    <div className="container">
      <div className="headerBar">
        <div className="appTitle">Multiplayer Lobby</div>
        <div className="envBadge">
          networking: <strong>{env.networkEnabled ? "enabled" : "disabled"}</strong>
        </div>
      </div>

      <div className="mainLayout">
        <div className="boardArea" style={{ alignItems: "stretch" }}>
          <div className="listCard">
            <div className="sidebarSectionTitle">Actions</div>

            <div className="row">
              <button type="button" className="btn btnPrimary" onClick={onCreate} disabled={!canNetwork}>
                Create Game
              </button>
              <button type="button" className="btn" onClick={() => refresh()} disabled={!canNetwork || loading}>
                {loading ? "Refreshing..." : "Refresh list"}
              </button>
            </div>

            <div style={{ height: 12 }} />

            <div className="sidebarSectionTitle">Join by ID</div>
            <div className="row">
              <input className="input" value={joinId} onChange={(e) => setJoinId(e.target.value)} placeholder="Game ID (or code)" />
              <input className="input" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Invite code (optional)" />
            </div>
            <div style={{ height: 10 }} />
            <button type="button" className="btn btnPrimary" onClick={onJoin} disabled={!canNetwork}>
              Join Game
            </button>

            {!canNetwork ? (
              <div className="smallNote" style={{ marginTop: 10 }}>
                Lobby is disabled. Set <span className="kbd">REACT_APP_FEATURE_FLAGS</span> to <span className="kbd">{"{\"network\":true}"}</span> and configure{" "}
                <span className="kbd">REACT_APP_API_BASE</span>/<span className="kbd">REACT_APP_WS_URL</span>.
              </div>
            ) : lastError ? (
              <div className="smallNote" style={{ marginTop: 10, color: "var(--danger)" }}>
                {lastError}
              </div>
            ) : null}
          </div>

          <div style={{ height: 12 }} />

          <div className="listCard">
            <div className="listHeader">
              <div>
                <div className="sidebarSectionTitle" style={{ margin: 0 }}>
                  Public games
                </div>
                <div className="smallNote">Joinable games the backend reports as open.</div>
              </div>
              <div className={`badge ${canNetwork ? "badgeGreen" : "badgeRed"}`}>{canNetwork ? "online" : "offline"}</div>
            </div>

            <table className="table" aria-label="Public games list">
              <thead>
                <tr>
                  <th className="th">Game</th>
                  <th className="th">Players</th>
                  <th className="th">Action</th>
                </tr>
              </thead>
              <tbody>
                {games.length === 0 ? (
                  <tr>
                    <td className="td" colSpan={3} style={{ color: "var(--muted)" }}>
                      {canNetwork ? "No public games found. Create one!" : "Offline. List unavailable."}
                    </td>
                  </tr>
                ) : (
                  games.map((g) => {
                    const id = g?.gameId || g?.id || "";
                    const players = g?.players || {};
                    const w = players.white || players.w || g?.white || null;
                    const b = players.black || players.b || g?.black || null;
                    return (
                      <tr key={id || JSON.stringify(g)}>
                        <td className="td">
                          <code>{id || "(unknown)"}</code>
                        </td>
                        <td className="td">
                          {w ? "White ✓" : "White —"} / {b ? "Black ✓" : "Black —"}
                        </td>
                        <td className="td">
                          <button
                            type="button"
                            className="btn"
                            onClick={async () => {
                              const res = await joinGame(id);
                              const gid = res?.gameId || res?.id || id;
                              navigate(`/match/${encodeURIComponent(gid)}`);
                            }}
                            disabled={!canNetwork || !id}
                          >
                            Join
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="sidebar">
          <div>
            <div className="sidebarSectionTitle">Networking</div>
            <div className="statusCard">
              <div>
                <strong>REST base:</strong> <code>{env.apiBase || "(unset)"}</code>
              </div>
              <div>
                <strong>WS base:</strong> <code>{env.wsUrl || "(unset)"}</code>
              </div>
              <div className="smallNote" style={{ marginTop: 8 }}>
                WS game channel: <code>/ws/game/:gameId</code>
              </div>
            </div>
          </div>

          <div>
            <div className="sidebarSectionTitle">Tips</div>
            <div className="statusCard">
              <div className="smallNote">
                If your backend uses different routes, adjust <code>REACT_APP_API_BASE</code> and <code>REACT_APP_WS_URL</code>.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

