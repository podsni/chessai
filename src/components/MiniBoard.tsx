import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useState, useEffect, useMemo } from "react";

interface MiniBoardProps {
  fen: string;
  bestMove?: string;
  evaluation?: number | null;
  mate?: number | null;
  title: string;
  size?: number;
  boardOrientation?: "white" | "black";
}

export function MiniBoard({
  fen,
  bestMove,
  evaluation,
  mate,
  title,
  size,
  boardOrientation = "white",
}: MiniBoardProps) {
  const [boardSize, setBoardSize] = useState(size || 180);

  // Calculate responsive mini board size
  useEffect(() => {
    if (size) {
      setBoardSize(size);
      return;
    }

    const calculateMiniSize = () => {
      const screenWidth = window.innerWidth;

      // Mobile portrait
      if (screenWidth < 480) {
        return 140;
      }
      // Mobile landscape / small tablet
      else if (screenWidth < 768) {
        return 160;
      }
      // Tablet
      else if (screenWidth < 1024) {
        return 180;
      }
      // Desktop
      else {
        return 200;
      }
    };

    setBoardSize(calculateMiniSize());

    const handleResize = () => {
      if (!size) {
        setBoardSize(calculateMiniSize());
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [size]);

  // Create a temporary chess instance to show the predicted position
  const tempChess = new Chess(fen);
  let predictedFen = fen;

  // If we have a best move, apply it to show the predicted position
  if (bestMove) {
    try {
      const move = tempChess.move(bestMove);
      if (move) {
        predictedFen = tempChess.fen();
      }
    } catch (error) {
      console.error("Error applying best move:", error);
    }
  }

  const formatEvaluation = () => {
    if (mate !== null && mate !== undefined) {
      return `M${Math.abs(mate)}`;
    }
    if (evaluation !== null && evaluation !== undefined) {
      const evalValue = evaluation / 100;
      return evalValue > 0 ? `+${evalValue.toFixed(2)}` : evalValue.toFixed(2);
    }
    return "—";
  };

  // Create arrows for the best move
  const customArrows = useMemo(
    () =>
      bestMove
        ? (() => {
            if (bestMove.length >= 4) {
              const from = bestMove.substring(0, 2) as Square;
              const to = bestMove.substring(2, 4) as Square;
              return [
                {
                  startSquare: from,
                  endSquare: to,
                  color: "#7fb069",
                },
              ];
            }
            return [];
          })()
        : [],
    [bestMove],
  );

  const chessboardOptions = useMemo(
    () => ({
      id: `mini-board-${title.replace(/\s+/g, "-").toLowerCase()}`,
      position: predictedFen,
      boardOrientation,
      allowDragging: false,
      showNotation: false,
      arrows: customArrows,
      allowDrawingArrows: false,
      boardStyle: {
        width: boardSize,
        borderRadius: boardSize < 160 ? "3px" : "4px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        border: "1px solid #8b7355",
      },
      darkSquareStyle: {
        backgroundColor: "#b58863",
      },
      lightSquareStyle: {
        backgroundColor: "#f0d9b5",
      },
    }),
    [boardOrientation, boardSize, customArrows, predictedFen, title],
  );

  return (
    <div className="mini-board-container w-full flex justify-center">
      <div className="bg-gray-800 rounded-lg p-2 md:p-3 border border-gray-600 w-full max-w-xs">
        {/* Title and Evaluation */}
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs md:text-sm font-medium text-white truncate pr-2">
            {title}
          </h4>
          <div className="text-xs md:text-sm font-bold text-green-400 flex-shrink-0">
            {formatEvaluation()}
          </div>
        </div>

        {/* Mini Chess Board */}
        <div className="relative flex justify-center">
          <Chessboard options={chessboardOptions} />
        </div>

        {/* Move Information */}
        {bestMove && (
          <div className="mt-2 text-center">
            <div className="text-xs text-gray-300">
              Best:{" "}
              <span className="font-mono text-yellow-400 text-xs">
                {bestMove}
              </span>
            </div>
          </div>
        )}

        {/* Orientation indicator for development */}
        {import.meta.env.DEV && (
          <div className="text-xs text-gray-500 text-center mt-1">
            {boardSize}px • {boardOrientation}
          </div>
        )}
      </div>
    </div>
  );
}
