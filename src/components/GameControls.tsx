import { useState } from "react";
import { Chess } from "chess.js";
import { MiniBoard } from "./MiniBoard";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import type {
  AIEngine,
  EngineInsight,
  GameSettings,
  GameMode,
} from "../types/chess";

interface GameControlsProps {
  settings: GameSettings;
  onSettingsChange: (settings: Partial<GameSettings>) => void;
  onNewGame: () => void;
  onUndo: () => void;
  onFlipBoard: () => void;
  onAnalyzePosition: () => void;
  onBotMove: () => void;
  onLoadFen: (fen: string) => void;
  onCopyFen: () => void;
  onGetHint: () => void;
  onStartAsWhite: () => void;
  onStartAsBlack: () => void;
  gameStatus: string;
  isThinking: boolean;
  currentFen: string;
  moveHistory: string[];
  evaluation?: number | null;
  mate?: number | null;
  bestMove?: string;
  hintMove?: string;
  isAnalysisMode: boolean;
  boardOrientation: "white" | "black";
  isAiVsAiPaused: boolean;
  engineNotice: string | null;
  engineInsights: EngineInsight[];
  onPauseAiVsAi: () => void;
  onResumeAiVsAi: () => void;
}

export function GameControls({
  settings,
  onSettingsChange,
  onNewGame,
  onUndo,
  onFlipBoard,
  onAnalyzePosition,
  onBotMove,
  onLoadFen,
  onCopyFen,
  onGetHint,
  onStartAsWhite,
  onStartAsBlack,
  gameStatus,
  isThinking,
  moveHistory,
  evaluation,
  mate,
  bestMove,
  hintMove,
  isAnalysisMode,
  currentFen,
  boardOrientation,
  isAiVsAiPaused,
  engineNotice,
  engineInsights,
  onPauseAiVsAi,
  onResumeAiVsAi,
}: GameControlsProps) {
  const [fenInput, setFenInput] = useState("");
  const [showPrediction, setShowPrediction] = useState(false);

  const handleFenLoad = () => {
    if (fenInput.trim()) {
      onLoadFen(fenInput.trim());
      setFenInput("");
    }
  };

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

  const engineLabels: Record<AIEngine, string> = {
    "stockfish-online": "Stockfish Online",
    "chess-api": "Chess API",
  };

  const buildPredictionSteps = (fen: string, moves: string[], maxSteps = 4) => {
    const board = new Chess(fen);
    const steps: Array<{ fen: string; move: string; step: number }> = [];
    for (const move of moves.slice(0, maxSteps)) {
      steps.push({ fen: board.fen(), move, step: steps.length + 1 });
      try {
        board.move(move);
      } catch {
        break;
      }
    }
    return steps;
  };

  return (
    <SkeletonTheme baseColor="#2a2722" highlightColor="#3a352d">
      <div className="controls-stack space-y-4 lg:sticky lg:top-4">
        {/* Game Status */}
        <div className="game-card control-section p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h3 className="text-lg font-semibold text-white">Game Status</h3>
          </div>
          <div className={`status-indicator ${isThinking ? "thinking" : ""}`}>
            {isThinking ? (
              <div className="space-y-2">
                <Skeleton height={14} />
                <Skeleton width="70%" height={14} />
              </div>
            ) : (
              gameStatus
            )}
          </div>

          {/* Current Mode Display */}
          <div className="mt-3 text-sm" style={{ color: "var(--text-light)" }}>
            Current Mode:{" "}
            <span className="font-medium text-white capitalize">
              {settings.mode.replace("-", " ")}
            </span>
            {isAnalysisMode && (
              <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                ANALYSIS
              </span>
            )}
          </div>
          <div className="mt-2 text-xs" style={{ color: "var(--text-light)" }}>
            Engine:{" "}
            <span className="text-white font-medium">
              {engineLabels[settings.aiEngine]}
            </span>
            {settings.mode === "ai-vs-ai" && (
              <span className="text-gray-300">
                {" "}
                (White: {engineLabels[settings.aiEngine]} vs Black:{" "}
                {engineLabels[settings.battleOpponentEngine]})
              </span>
            )}
          </div>
          {engineNotice && (
            <div className="mt-2 text-xs text-amber-300 bg-amber-900/20 border border-amber-700/30 rounded px-2 py-1">
              {engineNotice}
            </div>
          )}
        </div>

        {/* AI Prediction Mini Board */}
        {(bestMove || hintMove || engineInsights.length > 0) && (
          <div className="game-card control-section p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔮</span>
                <h3 className="text-lg font-semibold text-white">
                  AI Prediction
                </h3>
              </div>
              <button
                onClick={() => setShowPrediction(!showPrediction)}
                className="chess-button secondary text-sm"
              >
                {showPrediction ? "👁️ Hide" : "👁️ Show"}
              </button>
            </div>

            {showPrediction && (
              <div className="space-y-3">
                {engineInsights.length > 0 ? (
                  engineInsights.map((insight) => {
                    const steps = buildPredictionSteps(
                      currentFen,
                      insight.predictionLine,
                      3,
                    );
                    return (
                      <div
                        key={insight.engine}
                        className="rounded-lg border border-gray-700 bg-gray-900/50 p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white">
                            {engineLabels[insight.engine]}
                          </h4>
                          <span className="text-xs text-gray-300">
                            {insight.mate !== null && insight.mate !== undefined
                              ? `M${Math.abs(insight.mate)}`
                              : insight.evaluation !== null &&
                                  insight.evaluation !== undefined
                                ? `${insight.evaluation > 0 ? "+" : ""}${(insight.evaluation / 100).toFixed(2)}`
                                : "—"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {insight.predictionLine.slice(0, 6).map((move, i) => (
                            <span
                              key={`${insight.engine}-${move}-${i}`}
                              className="text-[11px] font-mono bg-gray-800 text-gray-200 px-2 py-1 rounded"
                            >
                              {i + 1}. {move}
                            </span>
                          ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {steps.map((step) => (
                            <MiniBoard
                              key={`${insight.engine}-step-${step.step}`}
                              fen={step.fen}
                              bestMove={step.move}
                              evaluation={insight.evaluation}
                              mate={insight.mate}
                              title={`Step ${step.step}`}
                              boardOrientation={boardOrientation}
                              size={150}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <>
                    {bestMove && (
                      <MiniBoard
                        fen={currentFen}
                        bestMove={bestMove}
                        evaluation={evaluation}
                        mate={mate}
                        title="Best Move"
                        boardOrientation={boardOrientation}
                      />
                    )}

                    {hintMove && hintMove !== bestMove && (
                      <MiniBoard
                        fen={currentFen}
                        bestMove={hintMove}
                        evaluation={evaluation}
                        mate={mate}
                        title="Hint Move"
                        boardOrientation={boardOrientation}
                      />
                    )}
                  </>
                )}
              </div>
            )}

            {!showPrediction && (
              <div className="text-center py-4 text-gray-400">
                <p className="text-sm">Click "Show" to see AI predictions</p>
              </div>
            )}
          </div>
        )}

        {/* Player Selection - New Game Setup */}
        <div className="game-card control-section p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎯</span>
            <h3 className="text-lg font-semibold text-white">Start New Game</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onStartAsWhite}
              className="chess-button w-full flex items-center justify-center gap-1 md:gap-2"
            >
              <span className="text-base md:text-lg">♔</span>
              <span className="text-sm md:text-base">Play as White</span>
            </button>
            <button
              onClick={onStartAsBlack}
              className="chess-button secondary w-full flex items-center justify-center gap-1 md:gap-2"
            >
              <span className="text-base md:text-lg">♚</span>
              <span className="text-sm md:text-base">Play as Black</span>
            </button>
          </div>

          <button onClick={onNewGame} className="chess-button w-full mt-2">
            🔄 Reset Current Game
          </button>
        </div>

        {/* Game Mode Selection */}
        <div className="game-card control-section p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎮</span>
            <h3 className="text-lg font-semibold text-white">Game Mode</h3>
          </div>

          <div className="space-y-2">
            {[
              { value: "human-vs-ai", label: "👤 Human vs AI", icon: "🆚" },
              { value: "ai-vs-ai", label: "🤖 AI vs AI", icon: "⚔️" },
              {
                value: "human-vs-human",
                label: "👥 Human vs Human",
                icon: "🤝",
              },
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() =>
                  onSettingsChange({ mode: mode.value as GameMode })
                }
                className={`chess-button w-full text-left flex items-center gap-3 ${
                  settings.mode === mode.value ? "" : "secondary"
                }`}
              >
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          {settings.mode === "ai-vs-ai" && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={onPauseAiVsAi}
                className="chess-button secondary w-full"
                disabled={isAiVsAiPaused || isThinking}
              >
                ⏸ Stop
              </button>
              <button
                onClick={onResumeAiVsAi}
                className="chess-button w-full"
                disabled={!isAiVsAiPaused || isThinking}
              >
                ▶ Resume
              </button>
            </div>
          )}
        </div>

        {/* Game Controls */}
        <div className="game-card control-section p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚡</span>
            <h3 className="text-lg font-semibold text-white">Game Controls</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={onUndo} className="chess-button secondary w-full">
              ↩️ Undo
            </button>
            <button
              onClick={onFlipBoard}
              className="chess-button secondary w-full"
            >
              🔄 Flip Board
            </button>
            <button
              onClick={onBotMove}
              className="chess-button w-full"
              disabled={isThinking}
            >
              🤖 Bot Move
            </button>
            <button
              onClick={onGetHint}
              className="chess-button w-full"
              disabled={isThinking}
            >
              💡 Get Hint
            </button>
          </div>
        </div>

        {/* Analysis Mode Toggle */}
        <div className="game-card control-section p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🔬</span>
            <h3 className="text-lg font-semibold text-white">Analysis Mode</h3>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <input
              type="checkbox"
              id="analysisMode"
              checked={isAnalysisMode}
              onChange={(e) =>
                onSettingsChange({ analysisMode: e.target.checked })
              }
              className="chess-checkbox"
            />
            <label
              htmlFor="analysisMode"
              className="text-sm"
              style={{ color: "var(--text-light)" }}
            >
              Enable Analysis Mode (Free play with arrows)
            </label>
          </div>

          {isAnalysisMode && (
            <div
              className="p-3 bg-blue-900/20 border border-blue-500/30 rounded text-sm"
              style={{ color: "var(--text-light)" }}
            >
              <p>📊 Analysis mode enabled:</p>
              <ul className="mt-1 ml-4 list-disc">
                <li>Move pieces freely</li>
                <li>Get instant analysis arrows</li>
                <li>See best moves highlighted</li>
              </ul>
            </div>
          )}
        </div>

        {/* AI Settings */}
        <div className="game-card control-section p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚙️</span>
            <h3 className="text-lg font-semibold text-white">AI Settings</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-light)" }}
              >
                AI Depth: {settings.aiDepth}
              </label>
              <div className="flex items-center gap-3">
                <span
                  className="text-xs"
                  style={{ color: "var(--text-light)" }}
                >
                  Fast (1)
                </span>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={settings.aiDepth}
                  onChange={(e) =>
                    onSettingsChange({ aiDepth: parseInt(e.target.value) })
                  }
                  className="chess-slider flex-1"
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--text-light)" }}
                >
                  Strong (15)
                </span>
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-light)" }}
              >
                {settings.mode === "ai-vs-ai" ? "White Engine" : "AI Engine"}
              </label>
              <select
                value={settings.aiEngine}
                onChange={(e) =>
                  onSettingsChange({ aiEngine: e.target.value as AIEngine })
                }
                className="chess-input w-full"
              >
                <option value="stockfish-online">Stockfish Online</option>
                <option value="chess-api">Chess API</option>
              </select>
            </div>

            {settings.mode === "ai-vs-ai" && (
              <>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-light)" }}
                  >
                    Black Engine
                  </label>
                  <select
                    value={settings.battleOpponentEngine}
                    onChange={(e) =>
                      onSettingsChange({
                        battleOpponentEngine: e.target.value as AIEngine,
                      })
                    }
                    className="chess-input w-full"
                  >
                    <option value="stockfish-online">Stockfish Online</option>
                    <option value="chess-api">Chess API</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="showAnalysisArrows"
                checked={settings.showAnalysisArrows}
                onChange={(e) =>
                  onSettingsChange({ showAnalysisArrows: e.target.checked })
                }
                className="chess-checkbox"
              />
              <label
                htmlFor="showAnalysisArrows"
                className="text-sm"
                style={{ color: "var(--text-light)" }}
              >
                Show Analysis Arrows
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoAnalysis"
                checked={settings.autoAnalysis}
                onChange={(e) =>
                  onSettingsChange({ autoAnalysis: e.target.checked })
                }
                className="chess-checkbox"
              />
              <label
                htmlFor="autoAnalysis"
                className="text-sm"
                style={{ color: "var(--text-light)" }}
              >
                Auto Analysis After Each Move
              </label>
            </div>
          </div>
        </div>

        {/* Analysis */}
        <div className="game-card control-section p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🔍</span>
            <h3 className="text-lg font-semibold text-white">
              Position Analysis
            </h3>
          </div>

          <button
            onClick={onAnalyzePosition}
            className="chess-button w-full mb-3"
            disabled={isThinking}
          >
            📊 Analyze Current Position
          </button>

          {(evaluation !== undefined || mate !== undefined || isThinking) && (
            <div className="analysis-panel">
              <h4>Position Evaluation</h4>
              {isThinking ? (
                <div className="space-y-2">
                  <Skeleton width={88} height={30} />
                  <Skeleton width="90%" height={16} />
                  <Skeleton width="75%" height={16} />
                </div>
              ) : (
                <div className="text-2xl font-bold text-white mb-2">
                  {formatEvaluation()}
                </div>
              )}
              {!isThinking && bestMove && (
                <div
                  className="text-sm mb-2"
                  style={{ color: "var(--text-light)" }}
                >
                  Best Move:{" "}
                  <span className="font-mono text-white bg-gray-700 px-2 py-1 rounded">
                    {bestMove}
                  </span>
                </div>
              )}
              {!isThinking && hintMove && (
                <div className="text-sm" style={{ color: "var(--text-light)" }}>
                  Hint:{" "}
                  <span className="font-mono text-yellow-400 bg-gray-700 px-2 py-1 rounded">
                    {hintMove}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Position */}
        <div className="game-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📋</span>
            <h3 className="text-lg font-semibold text-white">Position</h3>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={fenInput}
                onChange={(e) => setFenInput(e.target.value)}
                placeholder="Enter FEN position..."
                className="chess-input flex-1 text-sm"
              />
              <button onClick={handleFenLoad} className="chess-button">
                Load
              </button>
            </div>

            <button
              onClick={onCopyFen}
              className="chess-button secondary w-full text-sm"
            >
              📋 Copy Current FEN
            </button>
          </div>
        </div>

        {/* Move History */}
        <div className="game-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📝</span>
            <h3 className="text-lg font-semibold text-white">Move History</h3>
          </div>

          {moveHistory.length > 0 ? (
            <div className="move-history">
              <div className="p-3 space-y-1">
                {moveHistory.map((move, index) => (
                  <div key={index} className="move-item">
                    {Math.floor(index / 2) + 1}
                    {index % 2 === 0 ? "." : "..."} {move}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              className="text-center py-4"
              style={{ color: "var(--text-light)" }}
            >
              No moves yet
            </div>
          )}
        </div>
      </div>
    </SkeletonTheme>
  );
}
