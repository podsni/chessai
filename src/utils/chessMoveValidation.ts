import type { Chess, Square } from "chess.js";

export const canMoveToSquare = (chess: Chess, from: Square, to: Square) => {
  if (from === to) return false;
  const legalMoves = chess.moves({ square: from, verbose: true });
  return legalMoves.some((move) => move.to === to);
};

export const getPromotionForMove = (
  chess: Chess,
  from: Square,
  to: Square,
): "q" | undefined => {
  const legalMoves = chess.moves({ square: from, verbose: true });
  const matchingMove = legalMoves.find((move) => move.to === to);
  return matchingMove?.promotion ? "q" : undefined;
};
