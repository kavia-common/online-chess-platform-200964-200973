import React from "react";

// PUBLIC_INTERFACE
export function GameStatusCard({ status }) {
  /** Displays computed game status. */
  return (
    <div>
      <div className="sidebarSectionTitle">Game status</div>
      <div className="statusCard" role="status" aria-live="polite">
        <div>
          <strong>{status.label}</strong>
        </div>
        <div>{status.detail}</div>
      </div>
    </div>
  );
}
