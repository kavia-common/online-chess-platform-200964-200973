import React from "react";

// PUBLIC_INTERFACE
export function Sidebar({ children }) {
  /** Layout wrapper for right-side content (status + moves). */
  return <aside className="sidebar">{children}</aside>;
}
