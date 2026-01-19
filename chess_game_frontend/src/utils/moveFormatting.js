/**
 * Helpers for presenting move history:
 * - ensure SAN includes capture marker "x" when a capture happened (backend might omit)
 * - ensure check/checkmate markers (+/#) are present based on chess.js flags
 * - format timestamps for UI
 */

// PUBLIC_INTERFACE
export function enrichSan(move) {
  /**
   * Returns a display SAN string enriched with capture and check/checkmate markers.
   * `move` is expected to be a chess.js verbose move object (history({verbose:true})) with:
   * - san: string
   * - captured?: piece type
   * - flags?: string (includes "c" for capture, "e" for en-passant)
   * - isCheck?: boolean (not always present depending on version)
   * - isCheckmate?: boolean (not always present depending on version)
   */
  if (!move) return "";

  const rawSan = String(move.san || "").trim();
  if (!rawSan) return "";

  const flags = String(move.flags || "");
  const isCapture = Boolean(move.captured) || flags.includes("c") || flags.includes("e");

  // chess.js SAN already usually includes these, but we "ensure" them if missing
  const isMate = Boolean(move.isCheckmate);
  const isCheck = Boolean(move.isCheck);

  // Remove any existing suffix markers so we can normalize them.
  // Keep promotion (=Q) etc intact; only strip trailing +/#.
  let base = rawSan.replace(/[+#]+$/g, "");

  // Ensure a capture marker exists if capture happened.
  // We avoid touching castling ("O-O", "O-O-O") which never has "x".
  if (isCapture && !base.includes("x") && !base.startsWith("O-O")) {
    // SAN variants include things like:
    // - exd5
    // - Nxd5
    // - Qxe4
    //
    // If backend omitted "x", most common form is like "N d5" => "Nd5"
    // We'll insert "x" before the destination square (last occurrence of a square).
    // Destination square in SAN is usually the last [a-h][1-8] occurrence.
    const m = base.match(/(.*?)([a-h][1-8])(\b.*)?$/);
    if (m) {
      const prefix = m[1] || "";
      const dest = m[2] || "";
      const suffix = m[3] || "";
      base = `${prefix}x${dest}${suffix}`;
      // Handle pawn capture case where prefix might be only file (e.g., "ed5" => "exd5")
      // If prefix ends with file letter and immediately "x" is ok.
    } else {
      // Fallback: append 'x' (better than losing capture info)
      base = `${base}x`;
    }
  }

  // Append normalized check/checkmate markers.
  if (isMate) return `${base}#`;
  if (isCheck) return `${base}+`;
  return base;
}

// PUBLIC_INTERFACE
export function formatMoveTime(ts) {
  /** Formats a millisecond timestamp into HH:MM. */
  if (!ts) return "";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
