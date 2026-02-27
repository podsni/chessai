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

  /**
   * Core move application logic shared by click-to-move and drag-to-move.
   * Returns true if the move was accepted (correct or legal), false otherwise.
   */
  const applyPlayerMove = useCallback(
    (from: Square, to: Square, currentMoveIndex: number, currentPuzzle: LichessPuzzle): boolean => {
      const uciMove = `${from}${to}`;
      const expectedUci = currentPuzzle.solution[currentMoveIndex];

      // Check if this is a legal move on the board
      const legalMoves = chess
        .moves({ square: from, verbose: true })
        .map((m) => m.to as Square);

      if (!legalMoves.includes(to)) {
        return false;
      }

      // It's a legal move — check if it matches the solution
      const isCorrect =
        uciMove === expectedUci || uciMove === expectedUci.slice(0, 4);

      if (isCorrect) {
        try {
          const { from: f, to: t, promotion } = parseUciMove(expectedUci);
          chess.move({ from: f, to: t, promotion });
          setCurrentFen(chess.fen());
          setSelectedSquare(null);
          setAvailableMoves([]);
          setWrongMove(null);
          soundManager.playMove();
          hapticManager.successPattern();

          const nextIndex = currentMoveIndex + 1;

          if (nextIndex >= currentPuzzle.solution.length) {
            setStatus("solved");
            soundManager.playGameEnd();
            hapticManager.gameEndPattern();
            setMoveIndex(nextIndex);
            return true;
          }

          // Apply opponent's response
          const afterOpponent = applyOpponentMove(currentPuzzle.solution, nextIndex);
          setMoveIndex(afterOpponent);

          if (afterOpponent >= currentPuzzle.solution.length) {
            setStatus("solved");
            soundManager.playGameEnd();
            hapticManager.gameEndPattern();
          }

          return true;
        } catch {
          setWrongMove(uciMove);
          soundManager.playError();
          hapticManager.errorPattern();
          setSelectedSquare(null);
          setAvailableMoves([]);
          return false;
        }
      } else {
        // Wrong move
        setWrongMove(uciMove);
        soundManager.playError();
        hapticManager.errorPattern();
        setSelectedSquare(null);
        setAvailableMoves([]);
        return false;
      }
    },
    [applyOpponentMove, chess],
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
        // Check if this is a legal move on the board
        const legalMoves = chess
          .moves({ square: selectedSquare, verbose: true })
          .map((m) => m.to as Square);

        if (!legalMoves.includes(square)) {
          // Not a legal move at all — just update selection if there's a piece of correct color
          const piece = chess.get(square);
          if (piece && piece.color === chess.turn()) {
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

        applyPlayerMove(selectedSquare, square, moveIndex, puzzle);
        return;
      }

      // No square selected — select this one if it has a piece of the right color
      const piece = chess.get(square);
      if (!piece) return;
      const isCorrectColor = piece.color === chess.turn();
      if (!isCorrectColor) return;

      const legalMoves = chess
        .moves({ square, verbose: true })
        .map((m) => m.to as Square);
      setSelectedSquare(square);
      setAvailableMoves(legalMoves);
    },
    [applyPlayerMove, chess, moveIndex, puzzle, selectedSquare, status],
  );

  /** Handle drag-and-drop moves. Returns true if move was accepted. */
  const handlePieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square): boolean => {
      if (status !== "playing" || !puzzle) return false;
      if (sourceSquare === targetSquare) return false;

      // Verify the piece being dragged is the correct color
      const piece = chess.get(sourceSquare);
      if (!piece || piece.color !== chess.turn()) return false;

      return applyPlayerMove(sourceSquare, targetSquare, moveIndex, puzzle);
    },
    [applyPlayerMove, chess, moveIndex, puzzle, status],
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
    handlePieceDrop,
    handleRevealSolution,
  };
};
