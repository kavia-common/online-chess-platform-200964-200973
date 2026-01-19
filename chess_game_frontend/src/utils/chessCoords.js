// Board coordinates helpers for algebraic squares like "e4".

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

// PUBLIC_INTERFACE
export function indexToSquare(index, perspective = "w") {
  /** Converts 0..63 to algebraic square. 0 corresponds to a8 in white perspective. */
  const row = Math.floor(index / 8);
  const col = index % 8;

  if (perspective === "w") {
    const file = files[col];
    const rank = 8 - row;
    return `${file}${rank}`;
  }

  // black perspective (rotate 180)
  const file = files[7 - col];
  const rank = row + 1;
  return `${file}${rank}`;
}

// PUBLIC_INTERFACE
export function squareToIndex(square, perspective = "w") {
  /** Converts algebraic square (e.g., "e4") to 0..63 based on current perspective. */
  const file = square[0];
  const rank = Number(square[1]);
  const col = files.indexOf(file);

  if (col < 0 || !(rank >= 1 && rank <= 8)) return -1;

  if (perspective === "w") {
    const row = 8 - rank;
    return row * 8 + col;
  }

  // black perspective
  const row = rank - 1;
  return row * 8 + (7 - col);
}

// PUBLIC_INTERFACE
export function isLightSquare(square) {
  /** Returns true if square is light-colored (a1 is dark). */
  const file = files.indexOf(square[0]);
  const rank = Number(square[1]);
  if (file < 0 || !(rank >= 1 && rank <= 8)) return false;
  return (file + rank) % 2 === 0;
}
