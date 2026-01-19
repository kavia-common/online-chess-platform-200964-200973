import React, { useMemo } from "react";

function groupMoves(historyVerbose) {
  const rows = [];
  for (let i = 0; i < historyVerbose.length; i += 2) {
    const w = historyVerbose[i];
    const b = historyVerbose[i + 1];
    rows.push({ num: i / 2 + 1, w: w?.san || "", b: b?.san || "" });
  }
  return rows;
}

// PUBLIC_INTERFACE
export function MoveList({ history }) {
  /** Displays move history in SAN. */
  const rows = useMemo(() => groupMoves(history || []), [history]);

  return (
    <div>
      <div className="sidebarSectionTitle">Moves</div>
      <div className="moveList" aria-label="Move history">
        <div className="moveListHeader">
          <div>#</div>
          <div>White</div>
          <div>Black</div>
        </div>
        <div className="moveListBody">
          {rows.length === 0 ? (
            <div className="moveRow">
              <div className="moveNum">—</div>
              <div className="san" style={{ color: "var(--muted)" }}>
                No moves yet
              </div>
              <div />
            </div>
          ) : (
            rows.map((r) => (
              <div className="moveRow" key={r.num}>
                <div className="moveNum">{r.num}</div>
                <div className="san">{r.w}</div>
                <div className="san">{r.b}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
