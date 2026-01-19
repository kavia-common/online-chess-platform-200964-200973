# Chess Game Frontend (React)

A local-first, two-player (hot-seat) chess UI that enforces legal moves on the client (including castling, en passant, promotion) and detects check/checkmate/stalemate.

## Run locally

In this directory:

```bash
npm install
npm start
```

Then open http://localhost:3000

## Networking feature flags (optional)

The app works without any backend by default.

To enable network stubs (REST + WebSocket), set `REACT_APP_FEATURE_FLAGS` to a JSON object and turn on `network`:

```bash
# example
REACT_APP_FEATURE_FLAGS={"network":true}
REACT_APP_API_BASE=https://your-backend.example.com
REACT_APP_WS_URL=wss://your-backend.example.com/ws
```

Notes:
- Network is **best-effort** and never blocks local play. If the backend is unreachable, the UI keeps working using local state.
- REST endpoints and WS event formats are stubbed with TODOs in `src/services/*` and `src/hooks/useWebSocket.js`.

## Project structure

- `src/components/*`: Board/Square/Sidebar/MoveList/StatusBar/Controls, Promotion modal
- `src/hooks/*`: `useGameState`, `useLegalMoves`, `useWebSocket`
- `src/services/*`: `apiClient`, `wsClient`
- `src/utils/*`: board coordinates, piece rendering, promotion helper
- `src/config/env.js`: env + feature flag parsing
