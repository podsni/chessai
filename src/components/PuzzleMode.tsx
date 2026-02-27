import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { usePuzzle } from "../hooks/usePuzzle";
import type { BoardTheme } from "../types/chess";
import { BOARD_THEMES } from "../utils/boardThemes";
import {
  Brain,
  CheckCircle,
  ChevronRight,
  Eye,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

interface PuzzleModeProps {
  boardTheme?: BoardTheme;
}

export function PuzzleMode({ boardTheme = "classic" }: PuzzleModeProps) {
  const themeColors = BOARD_THEMES[boardTheme] ?? BOARD_THEMES.classic;

  const {
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
  } = usePuzzle();

  // Responsive board sizing
  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const [boardSize, setBoardSize] = useState(360);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () =>
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(checkTouch());
  }, []);

  useEffect(() => {
    const calculateSize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const containerWidth =
        boardContainerRef.current?.clientWidth || screenWidth;
      const isLandscape = screenWidth > screenHeight;
      const availableWidth = Math.max(200, containerWidth - 16);

      let idealSize = 400;

      if (screenWidth < 480) {
        idealSize = isLandscape
          ? Math.min(screenHeight * 0.78, screenWidth * 0.44, 340)
          : Math.min(screenWidth * 0.86, 330);
      } else if (screenWidth < 768) {
        idealSize = isLandscape
          ? Math.min(screenHeight * 0.74, screenWidth * 0.46, 400)
          : Math.min(screenWidth * 0.78, 390);
      } else if (screenWidth < 1024) {
        idealSize = Math.min(screenWidth * 0.46, screenHeight * 0.6, 480);
      } else {
        idealSize = Math.min(screenWidth * 0.36, 520);
      }

      return Math.floor(Math.min(idealSize, availableWidth));
    };

    const update = () => setBoardSize(calculateSize());
    update();

    let ro: ResizeObserver | null = null;
    if (boardContainerRef.current && "ResizeObserver" in window) {
      ro = new ResizeObserver(update);
      ro.observe(boardContainerRef.current);
    }
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      ro?.disconnect();
    };
  }, []);

  // Auto-load a puzzle on mount
  useEffect(() => {
    void loadPuzzle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build a temporary Chess instance from currentFen to get legal moves for highlighting
  const chessForHighlight = useMemo(() => {
    const c = new Chess();
    try {
      c.load(currentFen);
    } catch {
      // ignore
    }
    return c;
  }, [currentFen]);

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: "rgba(255, 255, 0, 0.4)",
        border: "3px solid #f1c40f",
        boxSizing: "border-box",
      };
    }

    availableMoves.forEach((square) => {
      const piece = chessForHighlight.get(square);
      if (piece) {
        styles[square] = {
          background:
            "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)",
          backgroundColor: "rgba(255, 0, 0, 0.3)",
        };
      } else {
        styles[square] = {
          background: "radial-gradient(circle, #7fb069 25%, transparent 25%)",
          backgroundColor: "transparent",
        };
      }
    });

    return styles;
  }, [availableMoves, chessForHighlight, selectedSquare]);

  // Build solution arrows when "Show Solution" is clicked
  const solutionArrows = useMemo(() => {
    if (!showSolution || !puzzle || status === "solved") return [];
    const remaining = puzzle.solution.slice(moveIndex);
    if (remaining.length === 0) return [];
    const firstMove = remaining[0];
    return [
      {
        startSquare: firstMove.slice(0, 2) as Square,
        endSquare: firstMove.slice(2, 4) as Square,
        color: "#f97316",
      },
    ];
  }, [showSolution, puzzle, moveIndex, status]);

  const isFlipped = puzzle?.colorToMove === "black";

  const progressPct =
    puzzle && puzzle.solution.length > 0
      ? Math.round((moveIndex / puzzle.solution.length) * 100)
      : 0;

  // Mobile board style
  const boardStyle = useMemo<React.CSSProperties>(
    () => ({
      borderRadius: boardSize < 340 ? "6px" : "8px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      border: "2px solid #8b7355",
      width: boardSize,
      ...(isTouchDevice && {
        touchAction: "none" as const,
        userSelect: "none" as const,
        WebkitUserSelect: "none" as const,
        WebkitTouchCallout: "none" as const,
        WebkitTapHighlightColor: "transparent",
      }),
    }),
    [boardSize, isTouchDevice],
  );

  const notationFontSize =
    boardSize < 300 ? "7px" : boardSize < 380 ? "9px" : "11px";

  // Drag-and-drop handler wrapper
  const onPieceDrop = useMemo(
    () =>
      ({
        sourceSquare,
        targetSquare,
      }: {
        sourceSquare: string;
        targetSquare: string | null;
      }) => {
        if (!targetSquare) return false;
        if (sourceSquare === targetSquare) return false;
        return handlePieceDrop(sourceSquare as Square, targetSquare as Square);
      },
    [handlePieceDrop],
  );

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xl mx-auto py-3">
      {/* Header */}
      <div className="flex items-center gap-3 w-full">
        <Brain className="w-6 h-6 text-purple-400 flex-shrink-0" />
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white">Puzzle Mode</h2>
          <p className="text-xs text-gray-400">Find the best move sequence</p>
        </div>
        {puzzle && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              Rating:{" "}
              <span className="text-amber-300 font-semibold">
                {puzzle.rating}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Mobile touch hint */}
      {isTouchDevice && status === "playing" && (
        <div className="w-full bg-blue-950/40 border border-blue-700/40 rounded-lg px-3 py-2 text-xs text-blue-300 flex items-center gap-2">
          <span>📱</span>
          <span>
            <strong>Touch:</strong> Tap piece → tap destination, or drag & drop
          </span>
        </div>
      )}

      {/* Status Banner */}
      {status === "loading" && (
        <div className="flex items-center gap-2 text-gray-300 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading puzzle...
        </div>
      )}

      {status === "solved" && (
        <div className="flex items-center gap-2 text-green-400 text-sm font-semibold bg-green-900/30 border border-green-700/50 rounded-lg px-4 py-2 w-full justify-center">
          <CheckCircle className="w-5 h-5" />
          Puzzle Solved! Excellent play!
        </div>
      )}

      {wrongMove && status === "playing" && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-2 w-full justify-center">
          <XCircle className="w-4 h-4" />
          That&apos;s not the best move. Try again!
        </div>
      )}

      {status === "playing" && !wrongMove && puzzle && (
        <div className="flex items-center gap-2 text-blue-300 text-sm bg-blue-900/20 border border-blue-700/40 rounded-lg px-4 py-2 w-full">
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span>
            <span className="font-semibold capitalize">
              {puzzle.colorToMove}
            </span>{" "}
            to move — find the best sequence
          </span>
        </div>
      )}

      {/* Board */}
      {(status === "playing" || status === "solved") && currentFen && (
        <div className="w-full flex flex-col items-center gap-3">
          {/* Progress bar */}
          {puzzle && puzzle.solution.length > 0 && (
            <div className="w-full">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>
                  Move {moveIndex} / {puzzle.solution.length}
                </span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          <div
            ref={boardContainerRef}
            className="w-full flex justify-center"
          >
            <div
              className="relative"
              style={{ width: `${boardSize}px`, height: `${boardSize}px` }}
            >
              <Chessboard
                options={{
                  id: "puzzle-board",
                  position: currentFen,
                  boardOrientation: isFlipped ? "black" : "white",
                  onSquareClick: ({ square }: { square: string }) =>
                    handleSquareClick(square as Square),
                  onPieceClick: ({
                    square,
                  }: {
                    square: string | null;
                    piece: { pieceType: string };
                  }) => {
                    if (isTouchDevice && square) {
                      handleSquareClick(square as Square);
                    }
                  },
                  onPieceDrop: onPieceDrop,
                  allowDragging: status === "playing",
                  canDragPiece: ({ piece: _piece }: { piece: { pieceType: string } }) => {
                    if (status !== "playing") return false;
                    // Allow dragging pieces of the current player's color
                    return true; // chess.js will validate on drop
                  },
                  squareStyles: customSquareStyles,
                  arrows: solutionArrows,
                  darkSquareStyle: { backgroundColor: themeColors.dark },
                  lightSquareStyle: { backgroundColor: themeColors.light },
                  boardStyle: boardStyle,
                  animationDurationInMs: isTouchDevice ? 150 : 200,
                  showNotation: boardSize > 280,
                  allowDragOffBoard: false,
                  allowDrawingArrows: false,
                  darkSquareNotationStyle: {
                    fontSize: notationFontSize,
                    fontWeight: "600",
                    color: "#5a5a5a",
                  },
                  lightSquareNotationStyle: {
                    fontSize: notationFontSize,
                    fontWeight: "600",
                    color: "#5a5a5a",
                  },
                  alphaNotationStyle: {
                    fontSize: notationFontSize,
                    fontWeight: "600",
                    color: "#5a5a5a",
                  },
                  numericNotationStyle: {
                    fontSize: notationFontSize,
                    fontWeight: "600",
                    color: "#5a5a5a",
                  },
                }}
              />
            </div>
          </div>

          {/* Selected square indicator for mobile */}
          {isTouchDevice && selectedSquare && status === "playing" && (
            <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg px-3 py-1.5 text-xs text-yellow-300 font-medium animate-pulse">
              ✨ {selectedSquare} selected — tap destination to move
            </div>
          )}

          {/* Themes */}
          {puzzle && puzzle.themes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 w-full">
              {puzzle.themes.slice(0, 5).map((theme) => (
                <span
                  key={theme}
                  className="text-xs bg-gray-700 text-gray-300 rounded-full px-2 py-0.5 capitalize"
                >
                  {theme.replace(/([A-Z])/g, " $1").trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 w-full flex-wrap">
        <button
          onClick={() => void loadPuzzle()}
          disabled={status === "loading"}
          className="chess-button secondary flex-1 flex items-center justify-center gap-1.5 text-sm min-h-[44px] touch-manipulation"
        >
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          New Puzzle
        </button>

        {status === "playing" && !showSolution && (
          <button
            onClick={handleRevealSolution}
            className="chess-button secondary flex items-center gap-1.5 text-sm min-h-[44px] px-4 touch-manipulation"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Show Hint</span>
            <span className="sm:hidden">Hint</span>
          </button>
        )}
      </div>

      {/* Idle state */}
      {status === "idle" && (
        <div className="text-center py-8">
          <Brain className="w-12 h-12 text-purple-400 mx-auto mb-3 opacity-50" />
          <p className="text-gray-400 text-sm">
            Load a puzzle to start practicing tactics
          </p>
          <button
            onClick={() => void loadPuzzle()}
            className="chess-button mt-4 flex items-center gap-2 mx-auto touch-manipulation"
          >
            <RefreshCw className="w-4 h-4" />
            Load Puzzle
          </button>
        </div>
      )}
    </div>
  );
}
