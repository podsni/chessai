import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  AnalysisArrow as AnalysisArrowType,
  BoardTheme,
  WdlArrowScore,
} from "../types/chess";
import { BOARD_THEMES } from "../utils/boardThemes";

interface ChessBoardProps {
  chess: Chess;
  onSquareClick: (square: Square) => void;
  onPieceDrop: (sourceSquare: Square, targetSquare: Square) => boolean;
  selectedSquare: Square | null;
  availableMoves: Square[];
  isFlipped: boolean;
  analysisArrows: AnalysisArrowType[];
  arrowScores?: WdlArrowScore[];
  arePiecesDraggable: boolean;
  humanColor?: "white" | "black";
  aiColor?: "white" | "black";
  gameMode?: string;
  boardTheme?: BoardTheme;
  /** When provided, display this FEN instead of chess.fen() (replay mode). */
  overrideFen?: string | null;
}

export function ChessBoard({
  chess,
  onSquareClick,
  onPieceDrop,
  selectedSquare,
  availableMoves,
  isFlipped,
  analysisArrows,
  arrowScores = [],
  arePiecesDraggable,
  humanColor = "white",
  aiColor: _aiColor = "black",
  gameMode = "human-vs-ai",
  boardTheme = "classic",
  overrideFen,
}: ChessBoardProps) {
  const themeColors = BOARD_THEMES[boardTheme] ?? BOARD_THEMES.classic;
  // Use overrideFen (replay) or the live chess position
  const displayFen = overrideFen ?? chess.fen();
  const [boardSize, setBoardSize] = useState(400);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);

  // Detect touch device
  useEffect(() => {
    const checkTouchDevice = () => {
      return "ontouchstart" in window || navigator.maxTouchPoints > 0;
    };
    setIsTouchDevice(checkTouchDevice());
  }, []);

  // Calculate responsive board size based on viewport and actual container width.
  // This prevents board clipping on narrow mobile screens.
  useEffect(() => {
    const calculateBoardSize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const containerWidth =
        boardContainerRef.current?.clientWidth || screenWidth;
      const isLandscape = screenWidth > screenHeight;
      const availableWidth = Math.max(220, containerWidth - 12);

      let idealSize = 400;

      // Mobile portrait (very small)
      if (screenWidth < 480) {
        if (isLandscape) {
          // Mobile landscape - use more of the height
          idealSize = Math.min(screenHeight * 0.82, screenWidth * 0.45, 360);
        } else {
          // Mobile portrait - use most of the width
          idealSize = Math.min(screenWidth * 0.88, 340);
        }
      }
      // Mobile landscape or small tablet
      else if (screenWidth < 768) {
        if (isLandscape) {
          idealSize = Math.min(screenHeight * 0.78, screenWidth * 0.5, 430);
        } else {
          idealSize = Math.min(screenWidth * 0.82, 410);
        }
      }
      // Tablet
      else if (screenWidth < 1024) {
        idealSize = Math.min(screenWidth * 0.5, screenHeight * 0.65, 520);
      }
      // Desktop
      else {
        idealSize = Math.min(screenWidth * 0.4, 600);
      }

      return Math.floor(Math.min(idealSize, availableWidth));
    };

    const updateBoardSize = () => {
      setBoardSize(calculateBoardSize());
    };
    updateBoardSize();

    const handleResize = () => updateBoardSize();
    let resizeObserver: ResizeObserver | null = null;
    if (boardContainerRef.current && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(updateBoardSize);
      resizeObserver.observe(boardContainerRef.current);
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  // Convert our analysis arrows to react-chessboard format
  const customArrows = useMemo(() => {
    // react-chessboard uses start/end for arrow identity.
    // Deduplicate identical move arrows to avoid duplicate React keys.
    const grouped = new Map<string, AnalysisArrowType[]>();
    analysisArrows.forEach((arrow) => {
      const key = `${arrow.from}-${arrow.to}`;
      const list = grouped.get(key) || [];
      list.push(arrow);
      grouped.set(key, list);
    });

    return Array.from(grouped.values()).map((group) => {
      const base = group[0];
      const hasDifferentColors = group.some(
        (item) => (item.color || "#7fb069") !== (base.color || "#7fb069"),
      );
      return {
        startSquare: base.from as Square,
        endSquare: base.to as Square,
        color: hasDifferentColors ? "#facc15" : base.color || "#7fb069",
      };
    });
  }, [analysisArrows]);

  // Custom square styles for selected square and available moves
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Highlight selected square
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: "rgba(255, 255, 0, 0.4)",
        border: "3px solid #f1c40f",
        boxSizing: "border-box",
      };
    }

    // Highlight available moves
    availableMoves.forEach((square) => {
      const piece = chess.get(square);
      if (piece) {
        // Square with piece (capture)
        styles[square] = {
          background:
            "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)",
          backgroundColor: "rgba(255, 0, 0, 0.3)",
        };
      } else {
        // Empty square
        styles[square] = {
          background: "radial-gradient(circle, #7fb069 25%, transparent 25%)",
          backgroundColor: "transparent",
        };
      }
    });

    return styles;
  }, [availableMoves, chess, selectedSquare]);

  // Enhanced square click handler for mobile with improved feedback
  const handleSquareClick = useCallback(
    (square: Square) => {
      if (isTouchDevice) {
        const now = Date.now();
        // Prevent double-tap issues on mobile
        if (now - lastTouchTime < 150) {
          return;
        }
        setLastTouchTime(now);

        // Add haptic feedback for mobile
        if (navigator.vibrate) {
          navigator.vibrate(10); // Light tap feedback
        }
      }

      onSquareClick(square);
    },
    [onSquareClick, isTouchDevice, lastTouchTime],
  );

  // Enhanced piece drop handler with better mobile support
  const handlePieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (!targetSquare) return false;
      if (sourceSquare === targetSquare) return false;

      // Mobile haptic feedback without delaying move execution.
      if (isTouchDevice) {
        if (navigator.vibrate) {
          navigator.vibrate(15);
        }
      }

      const moveSuccessful = onPieceDrop(
        sourceSquare as Square,
        targetSquare as Square,
      );

      if (isTouchDevice && navigator.vibrate) {
        if (moveSuccessful) {
          navigator.vibrate([10, 40, 10]);
        } else {
          navigator.vibrate([90, 40, 90]);
        }
      }
      return moveSuccessful;
    },
    [onPieceDrop, isTouchDevice],
  );

  // Check if a piece can be dragged
  const isDraggablePiece = useCallback(
    ({ piece }: { piece: { pieceType: string } }) => {
      if (!arePiecesDraggable) return false;

      // On touch devices, be more permissive to allow easier interaction
      if (isTouchDevice) {
        return true; // Allow dragging any piece, validation will happen in drop handler
      }

      // Desktop behavior: only allow dragging pieces of the current player
      const pieceColor = piece.pieceType[0]; // 'w' or 'b'
      const currentTurn = chess.turn();

      return pieceColor === currentTurn;
    },
    [arePiecesDraggable, isTouchDevice, chess],
  );

  // Calculate notation font size based on board size
  const notationFontSize =
    boardSize < 340 ? "8px" : boardSize < 420 ? "10px" : "12px";

  // Enhanced mobile-specific board styles
  const mobileBoardStyle = useMemo<React.CSSProperties>(
    () => ({
      borderRadius: boardSize < 400 ? "6px" : "8px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      border: "2px solid #8b7355",
      transition: "all 0.3s ease",
      ...(isTouchDevice && {
        touchAction: "none" as const, // Prevent scrolling while interacting with board
        userSelect: "none" as const, // Prevent text selection on mobile
        WebkitUserSelect: "none" as const,
        WebkitTouchCallout: "none",
        WebkitTapHighlightColor: "transparent",
      }),
    }),
    [boardSize, isTouchDevice],
  );

  const chessboardOptions = useMemo(
    () => ({
      id: "chess-board",
      position: displayFen,
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
      onPieceDrop: handlePieceDrop,
      canDragPiece: isDraggablePiece,
      boardOrientation: (isFlipped ? "black" : "white") as "white" | "black",
      squareStyles: customSquareStyles,
      arrows: customArrows,
      boardStyle: {
        ...mobileBoardStyle,
      },
      animationDurationInMs: isTouchDevice ? 150 : 200,
      allowDragging: arePiecesDraggable,
      showNotation: boardSize > 320,
      allowDragOffBoard: false,
      allowDrawingArrows: false,
      darkSquareStyle: {
        backgroundColor: themeColors.dark,
      },
      lightSquareStyle: {
        backgroundColor: themeColors.light,
      },
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
    }),
    [
      arePiecesDraggable,
      boardSize,
      customArrows,
      customSquareStyles,
      displayFen,
      handlePieceDrop,
      handleSquareClick,
      isDraggablePiece,
      isFlipped,
      isTouchDevice,
      mobileBoardStyle,
      notationFontSize,
      themeColors,
    ],
  );

  const scoreBadges = useMemo(() => {
    if (arrowScores.length === 0) return [];
    const squareSize = boardSize / 8;

    const getSquarePos = (square: string) => {
      const file = square.charCodeAt(0) - 97; // a-h => 0-7
      const rank = parseInt(square[1], 10); // 1-8
      let col = file;
      let row = 8 - rank;
      if (isFlipped) {
        col = 7 - col;
        row = 7 - row;
      }
      return { col, row };
    };

    return arrowScores.map((score) => {
      const toSquare = score.move.slice(2, 4);
      const { col, row } = getSquarePos(toSquare);
      const left = col * squareSize + squareSize * 0.62;
      const top = row * squareSize + squareSize * 0.12;
      const isBest = score.rank === 1;
      return {
        key: `${score.engine}-${score.move}-${score.quality}`,
        left,
        top,
        color: score.color,
        quality: Math.round(score.quality),
        rank: score.rank,
        isBest,
      };
    });
  }, [arrowScores, boardSize, isFlipped]);

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Enhanced Mobile Instructions */}
      {isTouchDevice && (
        <div className="mb-2 text-center">
          <div className="text-xs text-gray-400 bg-gray-800/50 rounded px-3 py-2 border border-gray-600">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span>📱</span>
              <span className="font-medium text-gray-300">Mobile Controls</span>
            </div>
            <div className="text-gray-400">
              Tap piece → Tap destination or Drag & Drop
            </div>
            {selectedSquare && (
              <div className="text-yellow-400 mt-1 animate-pulse">
                ✨ {selectedSquare} selected • Tap destination
              </div>
            )}
          </div>
        </div>
      )}

      {/* React Chessboard */}
      <div
        ref={boardContainerRef}
        className="chess-board-container w-full flex justify-center"
      >
        <div
          className="relative"
          style={{ width: `${boardSize}px`, height: `${boardSize}px` }}
        >
          <Chessboard options={chessboardOptions} />
          {scoreBadges.length > 0 && (
            <div className="pointer-events-none absolute inset-0 z-20">
              {scoreBadges.map((badge) => (
                <div
                  key={badge.key}
                  className="absolute rounded px-1 py-0.5 text-[10px] font-bold text-white shadow-md"
                  style={{
                    left: `${badge.left}px`,
                    top: `${badge.top}px`,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: badge.color,
                    border: "1px solid rgba(15,23,42,0.7)",
                    minWidth: badge.isBest ? "34px" : "22px",
                    textAlign: "center",
                  }}
                >
                  {badge.isBest
                    ? `BEST ${badge.quality}`
                    : `${badge.rank}:${badge.quality}`}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Player indicators with Human/AI labels */}
      <div
        className="flex justify-between items-center mt-3 md:mt-4 px-2 w-full"
        style={{ maxWidth: `${boardSize}px` }}
      >
        {/* Bottom player (from board perspective) */}
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${chess.turn() === (isFlipped ? "b" : "w") ? "animate-pulse" : ""}`}
            style={{
              backgroundColor:
                chess.turn() === (isFlipped ? "b" : "w")
                  ? "var(--chess-com-green)"
                  : "#404040",
            }}
          />
          <span
            className="text-xs md:text-sm font-medium"
            style={{ color: "var(--text-light)" }}
          >
            <span className="text-gray-400">
              {gameMode === "human-vs-ai" && (
                <>{(isFlipped ? "b" : "w") === humanColor[0] ? "👤" : "🤖"} </>
              )}
            </span>
            {isFlipped ? "Black" : "White"}
            {chess.turn() === (isFlipped ? "b" : "w") && (
              <span className="ml-1 text-green-400">•</span>
            )}
          </span>
        </div>

        <div className="text-center flex-1">
          <div className="text-xs md:text-sm text-gray-400">
            Turn: {chess.moveNumber()}
          </div>
          {gameMode === "human-vs-ai" && (
            <div className="text-xs text-gray-500">👤 = Human, 🤖 = AI</div>
          )}
        </div>

        {/* Top player (from board perspective) */}
        <div className="flex items-center space-x-2">
          <span
            className="text-xs md:text-sm font-medium"
            style={{ color: "var(--text-light)" }}
          >
            {chess.turn() === (isFlipped ? "w" : "b") && (
              <span className="mr-1 text-green-400">•</span>
            )}
            {isFlipped ? "White" : "Black"}
            <span className="text-gray-400">
              {gameMode === "human-vs-ai" && (
                <> {(isFlipped ? "w" : "b") === humanColor[0] ? "👤" : "🤖"}</>
              )}
            </span>
          </span>
          <div
            className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${chess.turn() === (isFlipped ? "w" : "b") ? "animate-pulse" : ""}`}
            style={{
              backgroundColor:
                chess.turn() === (isFlipped ? "w" : "b")
                  ? "var(--chess-com-green)"
                  : "#404040",
            }}
          />
        </div>
      </div>

      {/* Game Status */}
      <div className="text-center mt-2 md:mt-3 w-full">
        {chess.isGameOver() && (
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-500/30 rounded-lg">
            {chess.isCheckmate() && (
              <>
                <span className="text-lg">🏁</span>
                <span className="text-red-400 font-semibold text-sm md:text-base">
                  Checkmate! {chess.turn() === "w" ? "Black" : "White"} wins
                </span>
              </>
            )}
            {chess.isDraw() && (
              <>
                <span className="text-lg">🤝</span>
                <span className="text-yellow-400 font-semibold text-sm md:text-base">
                  Draw
                </span>
              </>
            )}
            {chess.isStalemate() && (
              <>
                <span className="text-lg">😐</span>
                <span className="text-yellow-400 font-semibold text-sm md:text-base">
                  Stalemate
                </span>
              </>
            )}
          </div>
        )}

        {!chess.isGameOver() && chess.inCheck() && (
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-500/30 rounded-lg">
            <span className="text-lg animate-pulse">⚠️</span>
            <span className="text-red-400 font-semibold text-sm md:text-base">
              {chess.turn() === "w" ? "White" : "Black"} is in Check!
            </span>
          </div>
        )}

        {!chess.isGameOver() && !chess.inCheck() && (
          <div className="text-gray-400 text-xs md:text-sm">
            {chess.turn() === "w" ? "White" : "Black"} to move
          </div>
        )}
      </div>

      {/* Board Size Indicator (for debugging, can be removed) */}
      {import.meta.env.DEV && (
        <div className="text-xs text-gray-500 mt-2">
          Board: {boardSize}px | Touch: {isTouchDevice ? "Yes" : "No"} | Screen:{" "}
          {window.innerWidth}x{window.innerHeight}
        </div>
      )}
    </div>
  );
}
