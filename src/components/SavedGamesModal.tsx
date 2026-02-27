import { useRef, useState } from "react";
import { gameStorage, type SavedGame } from "../services/gameStorage";

interface SavedGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadGame: (fen: string) => void;
}

export function SavedGamesModal({
  isOpen,
  onClose,
  onLoadGame,
}: SavedGamesModalProps) {
  const [savedGames, setSavedGames] = useState<SavedGame[]>(() =>
    gameStorage.getSavedGames(),
  );
  const [showExportData, setShowExportData] = useState(false);
  const [exportData, setExportData] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDeleteGame = (gameId: string) => {
    if (confirm("Are you sure you want to delete this saved game?")) {
      gameStorage.deleteGame(gameId);
      setSavedGames(gameStorage.getSavedGames());
    }
  };

  const handleLoadGame = (game: SavedGame) => {
    onLoadGame(game.fen);
    onClose();
  };

  const handleExportGames = () => {
    const data = gameStorage.exportGames();
    setExportData(data);
    setShowExportData(true);
  };

  const handleCopyExportData = () => {
    navigator.clipboard
      .writeText(exportData)
      .catch(() => console.warn("Clipboard unavailable"));
  };

  const handleImport = () => {
    if (!importText.trim()) {
      setImportMessage({ type: "error", text: "Paste JSON data first." });
      return;
    }
    const result = gameStorage.importGames(importText.trim());
    if (result.success) {
      setSavedGames(gameStorage.getSavedGames());
      setImportMessage({
        type: "success",
        text: "Games imported successfully!",
      });
      setImportText("");
    } else {
      setImportMessage({
        type: "error",
        text: "Invalid JSON. Check your data and try again.",
      });
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setImportText(text || "");
      setImportMessage(null);
    };
    reader.readAsText(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatGameInfo = (game: SavedGame) => {
    const moves = game.moveCount ? `${game.moveCount} moves` : "New game";
    const eval_text = game.evaluation
      ? ` • Eval: ${(game.evaluation / 100).toFixed(2)}`
      : "";
    return `${moves}${eval_text}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">💾 Saved Games</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {showExportData ? (
          <div className="p-4 md:p-6">
            <h3 className="text-lg font-medium text-white mb-3">Export Data</h3>
            <textarea
              value={exportData}
              readOnly
              className="w-full h-64 bg-gray-700 text-white rounded p-3 text-xs font-mono"
              placeholder="Export data will appear here..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowExportData(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Back
              </button>
              <button
                onClick={handleCopyExportData}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        ) : showImport ? (
          <div className="p-4 md:p-6">
            <h3 className="text-lg font-medium text-white mb-3">
              📥 Import Games
            </h3>
            <p className="text-gray-400 text-sm mb-3">
              Paste JSON data exported from this app, or upload a{" "}
              <code className="text-xs bg-gray-700 px-1 rounded">.json</code>{" "}
              file.
            </p>

            {/* File upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mb-3 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm w-full"
            >
              📂 Choose .json File
            </button>

            <textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportMessage(null);
              }}
              className="w-full h-48 bg-gray-700 text-white rounded p-3 text-xs font-mono resize-y"
              placeholder='Paste JSON here, e.g. {"games":[...],"settings":{...}}'
            />

            {importMessage && (
              <div
                className={`mt-2 px-3 py-2 rounded text-sm ${
                  importMessage.type === "success"
                    ? "bg-green-900/40 text-green-300 border border-green-700"
                    : "bg-red-900/40 text-red-300 border border-red-700"
                }`}
              >
                {importMessage.type === "success" ? "✅" : "❌"}{" "}
                {importMessage.text}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowImport(false);
                  setImportText("");
                  setImportMessage(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
              >
                Import
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 md:p-6">
              {/* Auto-saved game */}
              {(() => {
                const autoSaved = gameStorage.getAutoSavedGame();
                if (autoSaved) {
                  return (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-white mb-3">
                        🔄 Auto-saved Game
                      </h3>
                      <div className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-white">
                              {autoSaved.name}
                            </h4>
                            <p className="text-gray-300 text-sm">
                              {formatGameInfo(autoSaved)}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {formatDate(autoSaved.timestamp)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleLoadGame(autoSaved)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => gameStorage.clearAutoSave()}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Manually saved games */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  💾 Saved Games ({savedGames.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowImport(true);
                      setImportMessage(null);
                    }}
                    className="px-3 py-1 bg-green-700 text-white rounded text-sm hover:bg-green-600"
                  >
                    📥 Import
                  </button>
                  <button
                    onClick={handleExportGames}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    📤 Export
                  </button>
                </div>
              </div>

              {savedGames.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No saved games yet</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Games are automatically saved during play
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedGames.map((game) => (
                    <div
                      key={game.id}
                      className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-white">
                            {game.name}
                          </h4>
                          <p className="text-gray-300 text-sm">
                            {formatGameInfo(game)}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {formatDate(game.timestamp)}
                          </p>
                          {game.lastMove && (
                            <p className="text-gray-400 text-xs">
                              Last move:{" "}
                              <span className="font-mono text-green-400">
                                {game.lastMove}
                              </span>
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleLoadGame(game)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteGame(game.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Storage info */}
              <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Storage Information
                </h4>
                <div className="text-xs text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Games stored:</span>
                    <span>{savedGames.length} / 50</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Games are automatically saved during play. Oldest games are
                    automatically removed when limit is reached.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 md:p-6 border-t border-gray-700">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
