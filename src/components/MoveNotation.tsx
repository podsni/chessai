import { useState } from "react";
import { soundManager } from "../services/soundManager";
import { hapticManager } from "../services/hapticManager";

interface MoveNotationProps {
  lastMove: string | null;
  moveNumber: number;
  currentTurn: "w" | "b";
  className?: string;
}

export function MoveNotation({
  lastMove,
  moveNumber,
  currentTurn,
  className = "",
}: MoveNotationProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyMove = async () => {
    if (!lastMove) return;

    try {
      const moveText = `${moveNumber}${currentTurn === "b" ? "." : "..."} ${lastMove}`;
      await navigator.clipboard.writeText(moveText);
      setCopied(true);
      soundManager.playClick();
      hapticManager.lightTap();

      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy move:", error);
    }
  };

  if (!lastMove) {
    return (
      <div
        className={`bg-gray-800/50 rounded-lg p-3 border border-gray-700 ${className}`}
      >
        <div className="text-center text-gray-400 text-sm">
          Game starting • No moves yet
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-gray-800 rounded-lg border border-gray-600 ${className}`}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-300">Last Move</h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Live</span>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-700 rounded px-3 py-2">
            <div className="font-mono text-white text-base">
              <span className="text-gray-400 text-sm mr-2">
                {moveNumber}
                {currentTurn === "b" ? "." : "..."}
              </span>
              <span className="font-semibold">{lastMove}</span>
            </div>
          </div>

          <button
            onClick={handleCopyMove}
            className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
              copied
                ? "bg-green-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            title="Copy move notation"
          >
            {copied ? (
              <span className="flex items-center gap-1">
                <span>✓</span>
                <span className="hidden sm:inline">Copied</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span>📝</span>
                <span className="hidden sm:inline">Copy</span>
              </span>
            )}
          </button>
        </div>

        <div className="mt-2 text-xs text-gray-400">
          Move #{Math.ceil(moveNumber)} •{" "}
          {currentTurn === "w" ? "White" : "Black"} to move
        </div>
      </div>
    </div>
  );
}
