import { Chess } from "chess.js";
import type { StockfishResponse } from "../types/chess";
import { cpToWinChance } from "./evaluation";

const PIECE_VALUE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

const toUci = (move: {
  from: string;
  to: string;
  promotion?: string;
}): string => `${move.from}${move.to}${move.promotion ?? ""}`;

const evaluateMaterial = (board: Chess) => {
  let score = 0;
  for (const row of board.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const value = PIECE_VALUE[piece.type] ?? 0;
      score += piece.color === "w" ? value : -value;
    }
  }
  return score;
};

export const buildLocalAnalysis = (fen: string): StockfishResponse => {
  const board = new Chess(fen);
  const legalMoves = board.moves({ verbose: true });
  const best = legalMoves[0];

  const evaluation = evaluateMaterial(board);
  const mate = board.isCheckmate()
    ? board.turn() === "w"
      ? -1
      : 1
    : undefined;

  return {
    success: true,
    evaluation,
    winChance: cpToWinChance(evaluation),
    mate,
    bestmove: best ? toUci(best) : undefined,
    continuation:
      legalMoves.length > 0
        ? legalMoves
            .slice(0, 3)
            .map((move) => toUci(move))
            .join(" ")
        : undefined,
  };
};
