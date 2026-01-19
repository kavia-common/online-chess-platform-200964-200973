import React, { useMemo } from "react";
import { indexToSquare, isLightSquare } from "../utils/chessCoords";
import { Square } from "./Square";

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

// PUBLIC_INTERFACE
export function Board({
  chess,
  selectedSquare,
  legalMoves, // verbose list from chess.js for selectedSquare
  lastMove, // {from,to}
  onSquareClick,
  perspective = "w",
}) {
  const legalMap = useMemo(() => {
    const map = new Map();
    for (const m of legalMoves || []) {
      map.set(m.to, m.captured ? "capture" : "move");
    }
    return map;
  }, [legalMoves]);

  // If side to move is in check, highlight king square.
  const checkSquare = useMemo(() => {
    if (!chess?.isCheck?.() || !chess.isCheck()) return null;
    const king = chess.turn() === "w" ? "k" : "k";
    // chess.js doesn't directly expose king square; scan board.
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === king && p.color === chess.turn()) {
          const sq = `${files[c]}${8 - r}`;
          return sq;
        }
      }
    }
    return null;
  }, [chess]);

  const squares = [];
  for (let idx = 0; idx < 64; idx++) {
    const square = indexToSquare(idx, perspective);
    const piece = chess.get(square);
    const dark = !isLightSquare(square);

    const isSelected = selectedSquare === square;
    const isLastFrom = lastMove?.from === square;
    const isLastTo = lastMove?.to === square;
    const isCheck = checkSquare === square;

    const coordFile =
      // show file labels on bottom rank (from current perspective)
      (perspective === "w" && square[1] === "1") || (perspective === "b" && square[1] === "8") ? square[0] : null;
    const coordRank =
      // show rank labels on a-file (from current perspective)
      (perspective === "w" && square[0] === "a") || (perspective === "b" && square[0] === "h") ? square[1] : null;

    squares.push(
      <Square
        key={square}
        square={square}
        isDark={dark}
        piece={piece}
        isSelected={isSelected}
        isLastFrom={isLastFrom}
        isLastTo={isLastTo}
        isCheckSquare={isCheck}
        legalMarker={legalMap.get(square) || null}
        showCoords={true}
        coordFile={coordFile}
        coordRank={coordRank}
        onClick={() => onSquareClick(square)}
      />
    );
  }

  return <div className="board">{squares}</div>;
}
