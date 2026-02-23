import { ChessBoard } from "./ChessBoard";
import { GameControls } from "./GameControls";
import { SettingsModal } from "./SettingsModal";
import { FenDisplay } from "./FenDisplay";
import { MoveNotation } from "./MoveNotation";
import { PgnLoadModal } from "./PgnLoadModal";
import { EvaluationBar } from "./EvaluationBar";
import { useChessBot } from "../hooks/useChessBot";
import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Bot,
  Crown,
  FileText,
  Lightbulb,
  LocateFixed,
  RotateCcw,
  ScanSearch,
  Settings,
  Smartphone,
  Target,
} from "lucide-react";
import type { PersistedGameState } from "../types/chess";
import { estimateWdl } from "../utils/evaluation";

interface ChessBotProps {
  tabId?: string;
  tabName?: string;
  initialGameState?: PersistedGameState;
  onGameStateChange?: (gameState: PersistedGameState) => void;
  onRename?: (newName: string) => void;
}

export function ChessBot({
  tabId,
  tabName,
  initialGameState,
  onGameStateChange,
  onRename,
}: ChessBotProps = {}) {
  const [isMobile, setIsMobile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPgnModal, setShowPgnModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState("");
  const [selectedWdlMove, setSelectedWdlMove] = useState<string | null>(null);
  const [showAllWdlArrows, setShowAllWdlArrows] = useState(true);
  const [wdlArrowLimit, setWdlArrowLimit] = useState(3);
  const [wdlSortBy, setWdlSortBy] = useState<"quality" | "win" | "safety">(
    "quality",
  );

  useEffect(() => {
    const checkMobile = () => {
      return window.innerWidth < 768 || "ontouchstart" in window;
    };
    setIsMobile(checkMobile());

    const handleResize = () => {
      setIsMobile(checkMobile());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const {
    chess,
    selectedSquare,
    availableMoves,
    settings,
    gameStatus,
    isThinking,
    analysis,
    engineInsights,
    wdlArrowScores,
    moveHistory,
    analysisArrows,
    hintMove,
    isAiVsAiPaused,
    engineNotice,
    handleSquareClick,
    handlePieceDrop,
    handleSettingsChange,
    handleNewGame,
    handleStartAsWhite,
    handleStartAsBlack,
    handleUndo,
    handleFlipBoard,
    handleAnalyzePosition,
    handleGetHint,
    handleBotMove,
    handleLoadFen,
    handleCopyFen,
    handleLoadPGN,
    handlePauseAiVsAi,
    handleResumeAiVsAi,
  } = useChessBot(initialGameState, onGameStateChange);

  // Determine if pieces should be draggable
  const arePiecesDraggable =
    settings.analysisMode ||
    settings.mode === "human-vs-human" ||
    (settings.mode === "human-vs-ai" &&
      chess.turn() === settings.humanColor[0]);
  const wdl = estimateWdl(analysis?.evaluation, analysis?.mate);
  const orderedWdlArrowScores = useMemo(() => {
    const scores = [...wdlArrowScores];
    if (wdlSortBy === "win") {
      scores.sort((a, b) => b.win - a.win || b.quality - a.quality);
    } else if (wdlSortBy === "safety") {
      scores.sort((a, b) => a.loss - b.loss || b.quality - a.quality);
    } else {
      scores.sort((a, b) => b.quality - a.quality);
    }
    return scores;
  }, [wdlArrowScores, wdlSortBy]);
  const visibleWdlArrowScores = useMemo(() => {
    if (!settings.wdlPolicyArrows) return [];
    const ranked = orderedWdlArrowScores.slice(0, Math.max(1, wdlArrowLimit));
    if (showAllWdlArrows || !selectedWdlMove) return ranked;
    return ranked.filter((score) => score.move === selectedWdlMove);
  }, [
    settings.wdlPolicyArrows,
    showAllWdlArrows,
    selectedWdlMove,
    orderedWdlArrowScores,
    wdlArrowLimit,
  ]);
  const visibleAnalysisArrows = useMemo(() => {
    if (!settings.showAnalysisArrows) return [];
    if (!settings.wdlPolicyArrows) return analysisArrows;
    const allowedMoves = new Set(
      visibleWdlArrowScores.map((score) => score.move),
    );
    if (allowedMoves.size === 0) return analysisArrows;
    return analysisArrows.filter((arrow) =>
      allowedMoves.has(`${arrow.from}${arrow.to}`),
    );
  }, [
    analysisArrows,
    settings.showAnalysisArrows,
    settings.wdlPolicyArrows,
    visibleWdlArrowScores,
  ]);

  useEffect(() => {
    if (!settings.wdlPolicyArrows || wdlArrowScores.length === 0) {
      setSelectedWdlMove(null);
      setShowAllWdlArrows(settings.wdlShowAllArrowsDefault);
      return;
    }
    if (settings.wdlShowAllArrowsDefault) {
      setShowAllWdlArrows(true);
      setSelectedWdlMove(null);
      return;
    }
    if (showAllWdlArrows) return;
    const ranked = orderedWdlArrowScores.slice(0, Math.max(1, wdlArrowLimit));
    if (
      !selectedWdlMove ||
      !ranked.some((score) => score.move === selectedWdlMove)
    ) {
      setSelectedWdlMove(ranked[0].move);
    }
  }, [
    wdlArrowScores,
    settings.wdlPolicyArrows,
    settings.wdlShowAllArrowsDefault,
    selectedWdlMove,
    showAllWdlArrows,
    orderedWdlArrowScores,
    wdlArrowLimit,
  ]);

  return (
    <div className="page-shell min-h-screen">
      {/* Header */}
      <header className="page-header border-b border-slate-700/80 shadow-lg bg-slate-900/80 backdrop-blur">
        <div className="container mx-auto px-2 py-3 md:px-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 md:gap-3 flex-1 min-w-0">
              <Crown className="h-5 w-5 md:h-8 md:w-8 flex-shrink-0 text-amber-300 hidden sm:inline" />
              <div className="text-center md:text-left flex-1 min-w-0">
                {tabId && onRename ? (
                  isRenaming ? (
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onBlur={() => {
                        if (tempName.trim()) {
                          onRename(tempName.trim());
                        }
                        setIsRenaming(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (tempName.trim()) {
                            onRename(tempName.trim());
                          }
                          setIsRenaming(false);
                        } else if (e.key === "Escape") {
                          setIsRenaming(false);
                        }
                      }}
                      className="bg-gray-700 text-white px-2 py-1 rounded text-base md:text-3xl font-bold w-full max-w-full"
                      autoFocus
                    />
                  ) : (
                    <h1
                      className="text-base md:text-3xl font-bold text-white cursor-pointer hover:text-blue-300 transition-colors truncate"
                      onClick={() => {
                        setTempName(tabName || "Chess Bot Analysis");
                        setIsRenaming(true);
                      }}
                      title="Click to rename tab"
                    >
                      {tabName || "Chess Bot Analysis"}
                    </h1>
                  )
                ) : (
                  <h1 className="text-base md:text-3xl font-bold text-white truncate">
                    Chess Bot Analysis
                  </h1>
                )}
                <p className="text-gray-300 text-xs md:text-sm hidden sm:block">
                  Advanced Chess Analysis with AI • Drag & Drop Enabled
                </p>
                <p className="text-slate-300 text-xs sm:hidden">
                  Chess AI • Touch Enabled
                </p>
              </div>
              <Crown className="h-5 w-5 md:h-8 md:w-8 flex-shrink-0 text-slate-200 hidden sm:inline" />
            </div>
            <div className="flex gap-1 md:gap-2 ml-2 md:ml-4 flex-shrink-0">
              <button
                onClick={() => setShowPgnModal(true)}
                className="chess-button secondary header-action-btn h-10 px-3 text-xs md:text-sm touch-manipulation inline-flex items-center gap-1.5"
                title="Load PGN Game"
              >
                <FileText className="w-4 h-4" />
                <span>PGN</span>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="chess-button secondary header-action-btn h-10 px-3 text-xs md:text-sm touch-manipulation inline-flex items-center gap-1.5"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Quick Tips */}
      {isMobile && (
        <div className="bg-gradient-to-r from-blue-950/35 to-indigo-950/35 border-b border-blue-500/30 px-2 py-2 md:px-3 md:py-2">
          <div className="text-center">
            <p className="text-blue-300 text-xs leading-relaxed inline-flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              <strong>Touch Tips:</strong> Tap piece → Tap destination or drag
              pieces to move
            </p>
            {selectedSquare && (
              <div className="mt-2 bg-yellow-500/20 rounded-lg px-3 py-1 inline-block">
                <p className="text-yellow-300 text-xs font-medium inline-flex items-center gap-1">
                  <ScanSearch className="w-3.5 h-3.5" />
                  Selected:{" "}
                  <strong className="text-yellow-100">
                    {selectedSquare}
                  </strong>{" "}
                  → Tap green square to move
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Main Content */}
      <main className="page-main container mx-auto px-2 py-4 md:px-4 md:py-6">
        <div className="dashboard-layout grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Chess Board - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2 order-1 lg:order-1 min-w-0">
            <div className="game-card board-panel p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                <h2 className="text-lg md:text-xl font-semibold text-white flex items-center gap-2 flex-wrap">
                  <Target className="w-5 h-5 text-emerald-400" />
                  <span className="hidden sm:inline">Chess Board</span>
                  <span className="sm:hidden">Board</span>
                  {settings.analysisMode && (
                    <span className="status-chip status-chip-blue">
                      ANALYSIS
                    </span>
                  )}
                  {arePiecesDraggable && (
                    <span className="status-chip status-chip-green">
                      DRAG & DROP
                    </span>
                  )}
                  {isMobile && (
                    <span className="status-chip status-chip-purple">
                      MOBILE
                    </span>
                  )}
                </h2>
                <div
                  className="flex items-center gap-2 text-xs md:text-sm flex-wrap"
                  style={{ color: "var(--text-light)" }}
                >
                  <div className="inline-flex items-center gap-1 rounded-full border border-emerald-700/60 bg-emerald-900/25 px-2 py-1 text-[11px] text-emerald-300">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${isThinking ? "bg-emerald-300 animate-pulse" : "bg-emerald-400"}`}
                    />
                    Live Eval
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Human:</span>
                    <span
                      className={`font-medium px-2 py-1 rounded text-xs ${settings.humanColor === "white" ? "bg-gray-100 text-black" : "bg-gray-800 text-white"}`}
                    >
                      <Crown className="w-3 h-3 inline-block mr-1" />
                      {settings.humanColor}
                    </span>
                  </div>
                  {settings.mode === "human-vs-ai" && (
                    <div className="flex items-center gap-2">
                      <span>AI:</span>
                      <span
                        className={`font-medium px-2 py-1 rounded text-xs ${settings.aiColor === "white" ? "bg-gray-100 text-black" : "bg-gray-800 text-white"}`}
                      >
                        <Crown className="w-3 h-3 inline-block mr-1" />
                        {settings.aiColor}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 md:items-stretch">
                <div className="order-1 md:order-1 md:pt-8">
                  <EvaluationBar
                    evaluation={analysis?.evaluation}
                    mate={analysis?.mate}
                    isThinking={isThinking}
                  />
                </div>
                <div className="order-2 md:order-2 flex-1 min-w-0">
                  <ChessBoard
                    chess={chess}
                    onSquareClick={handleSquareClick}
                    onPieceDrop={handlePieceDrop}
                    selectedSquare={selectedSquare}
                    availableMoves={availableMoves}
                    isFlipped={settings.boardOrientation === "black"}
                    analysisArrows={visibleAnalysisArrows}
                    arrowScores={visibleWdlArrowScores}
                    arePiecesDraggable={arePiecesDraggable}
                    humanColor={settings.humanColor}
                    aiColor={settings.aiColor}
                    gameMode={settings.mode}
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 flex flex-wrap gap-2 justify-center action-row-mobile">
                <button
                  onClick={handleGetHint}
                  className={`chess-button flex-1 sm:flex-none min-h-[44px] touch-manipulation ${isThinking ? "pulse" : ""}`}
                  disabled={isThinking}
                >
                  <div className="flex items-center justify-center gap-1">
                    {isThinking ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Lightbulb className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {isThinking ? "Thinking..." : "Get Hint"}
                    </span>
                    <span className="sm:hidden text-xs">
                      {isThinking ? "..." : "Hint"}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => handleAnalyzePosition({ forceArrows: true })}
                  className={`chess-button flex-1 sm:flex-none min-h-[44px] touch-manipulation ${isThinking ? "pulse" : ""}`}
                  disabled={isThinking}
                >
                  <div className="flex items-center justify-center gap-1">
                    {isThinking ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <BarChart3 className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {isThinking ? "Analyzing..." : "Analyze"}
                    </span>
                    <span className="sm:hidden text-xs">
                      {isThinking ? "..." : "Analyze"}
                    </span>
                  </div>
                </button>
                <button
                  onClick={handleFlipBoard}
                  className="chess-button secondary flex-1 sm:flex-none min-h-[44px] touch-manipulation"
                >
                  <div className="flex items-center justify-center gap-1">
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Flip</span>
                    <span className="sm:hidden text-xs">Flip</span>
                  </div>
                </button>
                <button
                  onClick={handleUndo}
                  className="chess-button secondary flex-1 sm:flex-none min-h-[44px] touch-manipulation"
                >
                  <div className="flex items-center justify-center gap-1">
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Undo</span>
                    <span className="sm:hidden text-xs">Undo</span>
                  </div>
                </button>
              </div>

              {/* Mobile Status */}
              {isMobile && (
                <div className="mt-3 text-center">
                  <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs">
                    {selectedSquare ? (
                      <div className="text-yellow-300 font-medium">
                        <div className="flex items-center justify-center gap-1">
                          <LocateFixed className="w-3.5 h-3.5" />
                          <span>
                            Selected: <strong>{selectedSquare}</strong>
                          </span>
                        </div>
                        <div className="text-gray-400 mt-1">
                          Available moves: {availableMoves.length}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 flex items-center justify-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        <span>Tap any piece to see moves</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Move Notation and FEN Display */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <MoveNotation
                  lastMove={moveHistory[moveHistory.length - 1] || null}
                  moveNumber={chess.moveNumber()}
                  currentTurn={chess.turn()}
                />
                <FenDisplay fen={chess.fen()} showLabel={!isMobile} />
              </div>

              {/* Analysis Display */}
              {(analysis || hintMove) && (
                <div className="mt-4 p-3 md:p-4 bg-gray-800 rounded-lg border border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {analysis && (
                      <div>
                        <h4 className="text-xs md:text-sm font-medium text-gray-300 mb-2">
                          Position Analysis
                        </h4>
                        <div className="text-base md:text-lg font-bold text-white">
                          {analysis.mate !== null && analysis.mate !== undefined
                            ? `M${Math.abs(analysis.mate)}`
                            : analysis.evaluation !== null &&
                                analysis.evaluation !== undefined
                              ? `${analysis.evaluation > 0 ? "+" : ""}${(analysis.evaluation / 100).toFixed(2)}`
                              : "—"}
                        </div>
                        {analysis.bestmove && (
                          <div className="text-xs md:text-sm text-gray-300 mt-1">
                            Best:{" "}
                            <span className="font-mono text-green-400">
                              {analysis.bestmove}
                            </span>
                          </div>
                        )}
                        <div className="text-xs md:text-sm text-gray-300 mt-2">
                          WDL: <span className="text-white">W {wdl.win}%</span>{" "}
                          • <span className="text-white">D {wdl.draw}%</span> •{" "}
                          <span className="text-white">L {wdl.loss}%</span>
                        </div>
                      </div>
                    )}

                    {hintMove && (
                      <div>
                        <h4 className="text-xs md:text-sm font-medium text-gray-300 mb-2">
                          Hint
                        </h4>
                        <div className="text-base md:text-lg font-bold text-yellow-400">
                          {hintMove}
                        </div>
                        <div className="text-xs md:text-sm text-gray-300 mt-1">
                          Suggested move for current position
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Game Controls - Takes up 1 column */}
          <div className="lg:col-span-1 order-2 lg:order-2 controls-panel min-w-0">
            <GameControls
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onNewGame={handleNewGame}
              onStartAsWhite={handleStartAsWhite}
              onStartAsBlack={handleStartAsBlack}
              onUndo={handleUndo}
              onFlipBoard={handleFlipBoard}
              onAnalyzePosition={() =>
                handleAnalyzePosition({ forceArrows: true })
              }
              onGetHint={handleGetHint}
              onBotMove={handleBotMove}
              onLoadFen={handleLoadFen}
              onCopyFen={handleCopyFen}
              gameStatus={gameStatus}
              isThinking={isThinking}
              currentFen={chess.fen()}
              moveHistory={moveHistory}
              evaluation={analysis?.evaluation}
              mate={analysis?.mate}
              bestMove={analysis?.bestmove}
              hintMove={hintMove || undefined}
              isAnalysisMode={settings.analysisMode}
              boardOrientation={settings.boardOrientation}
              isAiVsAiPaused={isAiVsAiPaused}
              engineNotice={engineNotice}
              engineInsights={engineInsights}
              wdlArrowScores={orderedWdlArrowScores.slice(
                0,
                Math.max(1, wdlArrowLimit),
              )}
              selectedWdlMove={selectedWdlMove}
              isShowingAllWdlArrows={showAllWdlArrows}
              wdlArrowLimit={wdlArrowLimit}
              onWdlArrowLimitChange={setWdlArrowLimit}
              wdlSortBy={wdlSortBy}
              onWdlSortByChange={setWdlSortBy}
              onSelectWdlMove={(move) => {
                setShowAllWdlArrows(false);
                setSelectedWdlMove(move);
              }}
              onShowAllWdlArrows={() => {
                setShowAllWdlArrows(true);
                setSelectedWdlMove(null);
              }}
              onPauseAiVsAi={handlePauseAiVsAi}
              onResumeAiVsAi={handleResumeAiVsAi}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="page-footer border-t border-gray-700 mt-4 md:mt-12">
        <div className="container mx-auto px-2 py-3 md:px-4 md:py-6">
          <div className="text-center">
            <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
              Chess Bot Analysis • Powered by Stockfish
              <span className="hidden md:inline">
                {" "}
                • Built with React & TypeScript
              </span>
            </p>
            <div className="flex justify-center items-center gap-1 md:gap-4 mt-2 flex-wrap text-xs">
              <span className="text-gray-500 hidden md:inline">Features:</span>
              <div className="flex items-center gap-1 bg-gray-800 rounded-full px-2 py-1">
                <Bot className="w-3.5 h-3.5 text-green-400" />
                <span className="text-gray-400">AI Analysis</span>
              </div>
              <div className="flex items-center gap-1 bg-gray-800 rounded-full px-2 py-1">
                <Target className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-gray-400">Touch Enabled</span>
              </div>
              <div className="flex items-center gap-1 bg-gray-800 rounded-full px-2 py-1">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-gray-400">Mobile Ready</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentSettings={settings}
        onSettingsChange={handleSettingsChange}
      />

      {/* PGN Load Modal */}
      <PgnLoadModal
        isOpen={showPgnModal}
        onClose={() => setShowPgnModal(false)}
        onLoadGame={handleLoadPGN}
      />
    </div>
  );
}
