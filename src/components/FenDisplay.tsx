import { useState } from "react";
import { soundManager } from "../services/soundManager";
import { hapticManager } from "../services/hapticManager";

interface FenDisplayProps {
  fen: string;
  className?: string;
  showLabel?: boolean;
}

export function FenDisplay({
  fen,
  className = "",
  showLabel = true,
}: FenDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyFen = async () => {
    try {
      await navigator.clipboard.writeText(fen);
      setCopied(true);
      soundManager.playClick();
      hapticManager.lightTap();

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy FEN:", error);
      soundManager.playError();
      hapticManager.errorPattern();

      // Fallback for older browsers
      try {
        const textArea = document.createElement("textarea");
        textArea.value = fen;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        alert("Copy failed. Please copy manually: " + fen);
      }
    }
  };

  return (
    <div
      className={`bg-gray-800 rounded-lg border border-gray-600 ${className}`}
    >
      <div className="p-3 md:p-4">
        {showLabel && (
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-300">
              Current Position (FEN)
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Real-time</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 bg-gray-700 rounded p-2 font-mono text-xs text-white overflow-auto">
            <div className="break-all select-all">{fen}</div>
          </div>

          <button
            onClick={handleCopyFen}
            className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
              copied
                ? "bg-green-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            title="Copy FEN to clipboard"
          >
            {copied ? (
              <span className="flex items-center gap-1">
                <span>✓</span>
                <span className="hidden sm:inline">Copied</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span>📋</span>
                <span className="hidden sm:inline">Copy</span>
              </span>
            )}
          </button>
        </div>

        {/* FEN breakdown for educational purposes */}
        <div className="mt-3 text-xs text-gray-400">
          <details className="cursor-pointer">
            <summary className="hover:text-gray-300 transition-colors">
              📚 FEN Format Breakdown
            </summary>
            <div className="mt-2 space-y-1 text-gray-500">
              <div>• Piece placement (rows 8-1, files a-h)</div>
              <div>• Active color (w/b)</div>
              <div>• Castling availability (KQkq)</div>
              <div>• En passant target square</div>
              <div>• Halfmove clock</div>
              <div>• Fullmove number</div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
