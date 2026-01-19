import React, { useMemo } from "react";
import { enrichSan, formatMoveTime } from "../utils/moveFormatting";

function groupMoves(historyVerbose) {
  const rows = [];
  for (let i = 0; i < historyVerbose.length; i += 2) {
    const w = historyVerbose[i];
    const b = historyVerbose[i + 1];
    rows.push({
      num: i / 2 + 1,
      w,
      b,
    });
  }
  return rows;
}

// PUBLIC_INTERFACE
export function MoveList({ history }) {
  /** Displays move history in SAN with timestamps and capture/check/checkmate markers. */
  const rows = useMemo(() => groupMoves(history || []), [history]);

  return (
    <div>
      <div className="sidebarSectionTitle">Moves</div>
      <div className="moveList moveListEnhanced" aria-label="Move history">
        <div className="moveListHeader moveListHeaderEnhanced">
          <div>#</div>
          <div>White</div>
          <div>Time</div>
          <div>Black</div>
          <div>Time</div>
        </div>

        <div className="moveListBody">
          {rows.length === 0 ? (
            <div className="moveRow moveRowEnhanced">
              <div className="moveNum">—</div>
              <div className="san" style={{ color: "var(--muted)" }}>
                No moves yet
              </div>
              <div className="moveTime" />
              <div />
              <div className="moveTime" />
            </div>
          ) : (
            rows.map((r) => (
              <div className="moveRow moveRowEnhanced" key={r.num}>
                <div className="moveNum">{r.num}</div>

                <div className="san">{enrichSan(r.w)}</div>
                <div className="moveTime">{formatMoveTime(r.w?.ts)}</div>

                <div className="san">{enrichSan(r.b)}</div>
                <div className="moveTime">{formatMoveTime(r.b?.ts)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
