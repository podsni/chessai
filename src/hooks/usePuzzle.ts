import { useState, useCallback } from "react";
import { Chess, Square } from "chess.js";
import {
  fetchLichessPuzzle,
  type LichessPuzzle,
} from "../services/lichessPuzzleApi";
import { soundManager } from "../services/soundManager";
import { hapticManager } from "../services/hapticManager";

export type PuzzleStatus = "idle" | "loading" | "playing" | "solved" | "failed";

export const usePuzzle = () => {
  const [puzzle, setPuzzle] = useState<LichessPuzzle | null>(null);
  const [status, setStatus] = useState<PuzzleStatus>("idle");
  const [chess] = useState(() => new Chess());
  const [currentFen, setCurrentFen] = useState<string>(chess.fen());
  const [moveIndex, setMoveIndex] = useState(0);
  const [wrongMove, setWrongMove] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [availableMoves, setAvailableMoves] = useState<Square[]>([]);
  const [showSolution, setShowSolution] = useState(false);

  const loadPuzzle = useCallback(async () => {
    setStatus("loading");
    setPuzzle(null);
    setWrongMove(null);
    setShowSolution(false);
    setSelectedSquare(null);
    setAvailableMoves([]);

    const newPuzzle = await fetchLichessPuzzle();
    if (!newPuzzle) {
      setStatus("idle");
      return;
    }

    // Load puzzle position into chess instance
    try {
      chess.load(newPuzzle.fen);
    } catch {
      setStatus("idle");
      return;
    }

    setPuzzle(newPuzzle);
    setMoveIndex(0);
    setCurrentFen(chess.fen());
    setStatus("playing");
  }, [chess]);

  /** UCI move string -> { from, to, promotion } */
  const parseUciMove = (uci: string) => ({
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4 ? uci[4] : undefined,
  });

  /** Apply the opponent's (engine) response move after a correct player move. */
  const applyOpponentMove = useCallback(
    (moves: string[], nextIndex: number) => {
      if (nextIndex >= moves.length) return nextIndex;
      const opponentUci = moves[nextIndex];
      try {
        const { from, to, promotion } = parseUciMove(opponentUci);
        chess.move({ from, to, promotion });
        setCurrentFen(chess.fen());
        return nextIndex + 1;
      } catch {
        return nextIndex;
      }
    },
    [chess],
  );

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (status !== "playing" || !puzzle) return;

      // If clicking on a selected square — deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setAvailableMoves([]);
        return;
      }

      // If a square is already selected, try to move
      if (selectedSquare) {
        const uciMove = `${selectedSquare}${square}`;
        const expectedUci = puzzle.solution[moveIndex];

        // Check if this is a legal move on the board
        const legalMoves = chess
          .moves({ square: selectedSquare, verbose: true })
          .map((m) => m.to as Square);
        if (!legalMoves.includes(square)) {
          // Not a legal move at all — just update selection if there's a piece
          const piece = chess.get(square);
          if (piece) {
            const newMoves = chess
              .moves({ square, verbose: true })
              .map((m) => m.to as Square);
            setSelectedSquare(square);
            setAvailableMoves(newMoves);
          } else {
            setSelectedSquare(null);
            setAvailableMoves([]);
          }
          return;
        }

        // It's a legal move — check if it matches the solution
        const isCorrect =
          uciMove === expectedUci || uciMove === expectedUci.slice(0, 4); // allow any promotion

        if (isCorrect) {
          // Apply the move
          try {
            const { from, to, promotion } = parseUciMove(expectedUci);
            chess.move({ from, to, promotion });
            const newFen = chess.fen();
            setCurrentFen(newFen);
            setSelectedSquare(null);
            setAvailableMoves([]);
            setWrongMove(null);
            soundManager.playMove();
            hapticManager.successPattern();

            const nextIndex = moveIndex + 1;

            if (nextIndex >= puzzle.solution.length) {
              // Puzzle solved!
              setStatus("solved");
              soundManager.playGameEnd();
              hapticManager.gameEndPattern();
              setMoveIndex(nextIndex);
              return;
            }

            // Apply opponent's response
            const afterOpponent = applyOpponentMove(puzzle.solution, nextIndex);
            setMoveIndex(afterOpponent);

            if (afterOpponent >= puzzle.solution.length) {
              setStatus("solved");
              soundManager.playGameEnd();
              hapticManager.gameEndPattern();
            }
          } catch {
            // Move failed
            setWrongMove(uciMove);
            soundManager.playError();
            hapticManager.errorPattern();
            setSelectedSquare(null);
            setAvailableMoves([]);
          }
        } else {
          // Wrong move
          setWrongMove(uciMove);
          soundManager.playError();
          hapticManager.errorPattern();
          setSelectedSquare(null);
          setAvailableMoves([]);
          // Don't change status to failed — let user keep trying
        }
        return;
      }

      // No square selected — select this one if it has a piece of the right color
      const piece = chess.get(square);
      if (!piece) return;
      const isCorrectColor =
        (chess.turn() === "w" && piece.color === "w") ||
        (chess.turn() === "b" && piece.color === "b");
      if (!isCorrectColor) return;

      const legalMoves = chess
        .moves({ square, verbose: true })
        .map((m) => m.to as Square);
      setSelectedSquare(square);
      setAvailableMoves(legalMoves);
    },
    [applyOpponentMove, chess, moveIndex, puzzle, selectedSquare, status],
  );

  const handleRevealSolution = useCallback(() => {
    setShowSolution(true);
  }, []);

  return {
    puzzle,
    status,
    currentFen,
    moveIndex,
    wrongMove,
    selectedSquare,
    availableMoves,
    showSolution,
    loadPuzzle,
    handleSquareClick,
    handleRevealSolution,
  };
};
