import { useState, useRef } from "react";
import { PGNParser, type PGNGameInfo } from "../services/pgnParser";
import { Chess } from "chess.js";

interface PgnLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadGame: (chess: Chess, gameInfo: PGNGameInfo) => void;
}

export function PgnLoadModal({
  isOpen,
  onClose,
  onLoadGame,
}: PgnLoadModalProps) {
  const [pgnText, setPgnText] = useState("");
  const [parsedGames, setParsedGames] = useState<PGNGameInfo[]>([]);
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setPgnText(content);
      parsePGN(content);
    };
    reader.readAsText(file);
  };

  const parsePGN = (text: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = PGNParser.parsePGN(text);

      if (result.success) {
        setParsedGames(result.games);
        setSelectedGameIndex(0);
        setError(null);
      } else {
        setError(result.error || "Failed to parse PGN");
        setParsedGames([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setParsedGames([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    setPgnText(text);
    if (text.trim()) {
      parsePGN(text);
    } else {
      setParsedGames([]);
      setError(null);
    }
  };

  const loadSelectedGame = () => {
    if (
      parsedGames.length === 0 ||
      selectedGameIndex < 0 ||
      selectedGameIndex >= parsedGames.length
    ) {
      return;
    }

    const selectedGame = parsedGames[selectedGameIndex];

    try {
      const chess = new Chess();

      // Apply each move to the chess instance
      for (const move of selectedGame.moves) {
        try {
          chess.move(move);
        } catch (moveError) {
          console.warn(`Failed to apply move: ${move}`, moveError);
          // Continue with other moves even if one fails
        }
      }

      onLoadGame(chess, selectedGame);
      handleClose();
    } catch (err) {
      setError(
        `Failed to load game: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const handleClose = () => {
    setPgnText("");
    setParsedGames([]);
    setSelectedGameIndex(0);
    setError(null);
    onClose();
  };

  const clearAll = () => {
    setPgnText("");
    setParsedGames([]);
    setSelectedGameIndex(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gray-900 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📝 Load PGN Game
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload PGN File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pgn,.txt"
                  onChange={handleFileUpload}
                  className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
              </div>

              <div className="text-center text-gray-400">atau</div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Paste PGN Text
                </label>
                <textarea
                  value={pgnText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder='Paste your PGN here, for example:

[Event "Let&apos;s Play!"]
[Site "Chess.com"]
[Date "2025-06-16"]
[White "imnub97"]
[Black "HendaBangun"]
[Result "*"]

1. d4 d5 2. c4 dxc4 3. Nc3 e6 4. e4 e5 *'
                  className="w-full h-64 p-3 bg-gray-900 border border-gray-600 rounded text-white text-sm font-mono resize-none focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={clearAll}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {isLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-gray-300">Parsing PGN...</p>
                </div>
              )}

              {error && (
                <div className="bg-red-900/50 border border-red-500 rounded p-3">
                  <p className="text-red-300 text-sm">❌ {error}</p>
                </div>
              )}

              {parsedGames.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Found {parsedGames.length} game
                    {parsedGames.length !== 1 ? "s" : ""}
                  </h3>

                  {parsedGames.length > 1 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Select Game to Load:
                      </label>
                      <select
                        value={selectedGameIndex}
                        onChange={(e) =>
                          setSelectedGameIndex(parseInt(e.target.value))
                        }
                        className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                      >
                        {parsedGames.map((game, index) => (
                          <option key={index} value={index}>
                            Game {index + 1}: {game.headers.White || "Unknown"}{" "}
                            vs {game.headers.Black || "Unknown"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="bg-gray-900 rounded p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Event:</span>
                        <span className="text-white ml-2">
                          {parsedGames[selectedGameIndex]?.headers.Event ||
                            "Unknown"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Date:</span>
                        <span className="text-white ml-2">
                          {parsedGames[selectedGameIndex]?.headers.Date ||
                            "Unknown"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">White:</span>
                        <span className="text-white ml-2">
                          {parsedGames[selectedGameIndex]?.headers.White ||
                            "Unknown"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Black:</span>
                        <span className="text-white ml-2">
                          {parsedGames[selectedGameIndex]?.headers.Black ||
                            "Unknown"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Result:</span>
                        <span className="text-white ml-2">
                          {parsedGames[selectedGameIndex]?.result || "*"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Moves:</span>
                        <span className="text-white ml-2">
                          {parsedGames[selectedGameIndex]?.moves.length || 0}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-400 text-sm">
                        First moves:
                      </span>
                      <div className="text-white text-sm mt-1 font-mono">
                        {parsedGames[selectedGameIndex]?.moves
                          .slice(0, 10)
                          .join(" ")}
                        {parsedGames[selectedGameIndex]?.moves.length > 10 &&
                          "..."}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-4 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={loadSelectedGame}
            disabled={parsedGames.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Load Game
          </button>
        </div>
      </div>
    </div>
  );
}
