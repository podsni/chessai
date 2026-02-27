import { useState, useCallback, useEffect, useRef } from "react";
import { Chess, Square } from "chess.js";
import { useQueryClient } from "@tanstack/react-query";
import { StockfishAPI } from "../services/stockfishApi";
import { ChessApiEngine } from "../services/chessApiEngine";
import { fetchOpening, type OpeningInfo } from "../services/openingsApi";
import { soundManager } from "../services/soundManager";
import { hapticManager } from "../services/hapticManager";
import { gameStorage } from "../services/gameStorage";
import {
  getAiMoveDepthLimit,
  getAnalysisDepthLimit,
} from "../utils/engineConstraints";
import {
  cpToWinChance,
  estimateWdl,
  getEvaluationBarPercent,
} from "../utils/evaluation";
import {
  canMoveToSquare,
  getPromotionForMove,
} from "../utils/chessMoveValidation";
import { buildLocalAnalysis } from "../utils/localAnalysis";
import type { PGNGameInfo } from "../services/pgnParser";
import type {
  AIEngine,
  EngineInsight,
  GameState,
  StockfishResponse,
  GameSettings,
  AnalysisArrow,
  PersistedGameState,
  WdlArrowScore,
  AnalysisTimelinePoint,
  LiveAnalysisPoint,
  MoveQualityClass,
} from "../types/chess";

const stockfishApi = new StockfishAPI();
const chessApiEngine = new ChessApiEngine();

const engineClients = {
  "stockfish-online": stockfishApi,
  "chess-api": chessApiEngine,
};

type AnalysisFetchResult = {
  requestedEngine: AIEngine;
  analysis: StockfishResponse;
  engineUsed: AIEngine;
  fallbackUsed: boolean;
  localFallbackUsed: boolean;
};

export const useChessBot = (
  initialGameState?: PersistedGameState,
  onGameStateChange?: (gameState: PersistedGameState) => void,
) => {
  const [chess] = useState(() => {
    const newChess = new Chess();
    if (initialGameState?.fen) {
      try {
        newChess.load(initialGameState.fen);
      } catch (error) {
        console.error("Failed to load initial FEN:", error);
      }
    }
    return newChess;
  });
  const queryClient = useQueryClient();

  const [gameState, setGameState] = useState<GameState>({
    chess: chess,
    fen: chess.fen(),
    gameOver: chess.isGameOver(),
    winner: null,
    lastMove: initialGameState?.lastMove || null,
  });

  const [settings, setSettings] = useState<GameSettings>(() => {
    const savedSettings = gameStorage.getSettings();
    const defaultSettings: GameSettings = {
      mode: "human-vs-ai",
      boardOrientation: savedSettings.boardOrientation,
      humanColor: "white",
      aiColor: "black",
      aiDepth: savedSettings.aiDepth,
      aiEngine: savedSettings.aiEngine || "stockfish-online",
      analysisEngineMode: savedSettings.analysisEngineMode || "safe",
      battleEnabled: savedSettings.battleEnabled || false,
      battleOpponentEngine: savedSettings.battleOpponentEngine || "chess-api",
      showAnalysisArrows: savedSettings.showAnalysisArrows,
      wdlPolicyArrows: savedSettings.wdlPolicyArrows ?? true,
      wdlShowAllArrowsDefault: savedSettings.wdlShowAllArrowsDefault ?? true,
      autoAnalysis: savedSettings.autoAnalysis,
      analysisMode: false,
      boardTheme: savedSettings.boardTheme || "classic",
    };

    if (initialGameState?.settings) {
      return { ...defaultSettings, ...initialGameState.settings };
    }
    return defaultSettings;
  });

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [availableMoves, setAvailableMoves] = useState<Square[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [analysis, setAnalysis] = useState<StockfishResponse | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>(
    initialGameState?.moveHistory || [],
  );
  const [analysisArrows, setAnalysisArrows] = useState<AnalysisArrow[]>([]);
  const [hintMove, setHintMove] = useState<string | null>(null);
  const [isAiVsAiPaused, setIsAiVsAiPaused] = useState(false);
  const [engineNotice, setEngineNotice] = useState<string | null>(null);
  const [engineInsights, setEngineInsights] = useState<EngineInsight[]>([]);
  const [wdlArrowScores, setWdlArrowScores] = useState<WdlArrowScore[]>([]);
  const [evaluationTrend, setEvaluationTrend] = useState<number[]>([]);
  const [analysisTimeline, setAnalysisTimeline] = useState<
    AnalysisTimelinePoint[]
  >([]);
  const [liveAnalysisSeries, setLiveAnalysisSeries] = useState<
    LiveAnalysisPoint[]
  >([]);
  const [loadedPgnResult, setLoadedPgnResult] = useState<string | null>(null);
  const [currentOpening, setCurrentOpening] = useState<OpeningInfo | null>(
    null,
  );
  const lastOpeningFenRef = useRef<string | null>(null);
  // Replay mode: null = live game, number = ply index being viewed (0-based)
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const analysisTimeoutRef = useRef<number | null>(null);
  const analysisInFlightRef = useRef(false);
  const lastAnalyzedFenRef = useRef<string | null>(null);
  const lastTrendFenRef = useRef<string | null>(null);
  const pgnAnalyzeRunIdRef = useRef(0);
  const pendingForcedAnalyzeRef = useRef<{
    force?: boolean;
    fen?: string;
    silent?: boolean;
    forceArrows?: boolean;
  } | null>(null);
  const shouldRenderArrows =
    settings.showAnalysisArrows &&
    (settings.analysisMode ||
      settings.mode === "ai-vs-ai" ||
      settings.autoAnalysis);
  const currentFen = chess.fen();
  const currentPgn = chess.pgn();

  // Fetch opening name from Lichess whenever the FEN changes (first ~25 plies)
  useEffect(() => {
    if (lastOpeningFenRef.current === currentFen) return;
    // Only query for the opening phase (move number <= 15 = ply <= 30)
    if (chess.moveNumber() > 15) return;
    lastOpeningFenRef.current = currentFen;
    void fetchOpening(currentFen).then((info) => {
      setCurrentOpening(info);
    });
  }, [chess, currentFen]);

  // Initialize services with saved settings
  useEffect(() => {
    const savedSettings = gameStorage.getSettings();
    soundManager.setEnabled(savedSettings.soundEnabled);
    hapticManager.setEnabled(savedSettings.hapticEnabled);
  }, []);

  // Emit state changes for tab persistence
  useEffect(() => {
    if (onGameStateChange) {
      onGameStateChange({
        fen: currentFen,
        pgn: currentPgn,
        moveHistory,
        settings,
        lastMove: moveHistory[moveHistory.length - 1] || null,
      });
    }
  }, [chess, currentFen, currentPgn, moveHistory, settings, onGameStateChange]);

  const updateGameState = useCallback(() => {
    setGameState({
      chess: chess,
      fen: chess.fen(),
      gameOver: chess.isGameOver(),
      winner: chess.isCheckmate()
        ? chess.turn() === "w"
          ? "Black"
          : "White"
        : null,
      lastMove: moveHistory[moveHistory.length - 1] || null,
    });
  }, [chess, moveHistory]);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setAvailableMoves([]);
  }, []);

  const cancelPgnAnalysis = useCallback(() => {
    pgnAnalyzeRunIdRef.current = Date.now();
  }, []);

  const getGameStatus = useCallback(() => {
    if (chess.isCheckmate()) {
      return `Checkmate! ${chess.turn() === "w" ? "Black" : "White"} wins`;
    }
    if (chess.isDraw()) {
      return "Draw";
    }
    if (chess.isStalemate()) {
      return "Stalemate";
    }
    if (chess.inCheck()) {
      return `${chess.turn() === "w" ? "White" : "Black"} in check`;
    }
    return `${chess.turn() === "w" ? "White" : "Black"} to move`;
  }, [chess]);

  const isPlayerTurn = useCallback(() => {
    if (settings.analysisMode) return true; // In analysis mode, always allow moves

    switch (settings.mode) {
      case "human-vs-ai":
        return chess.turn() === settings.humanColor[0]; // Use humanColor instead of boardOrientation
      case "human-vs-human":
        return true;
      case "ai-vs-ai":
        return false;
      default:
        return true;
    }
  }, [settings.mode, settings.humanColor, settings.analysisMode, chess]);

  const parseMove = useCallback((moveString: string) => {
    // Parse move string like "e2e4" or "bestmove e2e4"
    if (!moveString) return null;

    const cleanMove = moveString.replace("bestmove ", "").trim();
    if (cleanMove.length >= 4) {
      return {
        from: cleanMove.substring(0, 2) as Square,
        to: cleanMove.substring(2, 4) as Square,
        promotion: cleanMove.length > 4 ? cleanMove[4] : undefined,
      };
    }
    return null;
  }, []);

  const classifyMoveQuality = useCallback(
    (swingForMoverCp: number): MoveQualityClass => {
      if (swingForMoverCp >= 180) return "brilliant";
      if (swingForMoverCp >= 90) return "great";
      if (swingForMoverCp >= 30) return "best";
      if (swingForMoverCp >= -20) return "good";
      if (swingForMoverCp >= -80) return "inaccuracy";
      if (swingForMoverCp >= -180) return "mistake";
      return "blunder";
    },
    [],
  );

  const recordAnalysisSample = useCallback(
    (
      fen: string,
      results: AnalysisFetchResult[],
      preferred: StockfishResponse,
    ) => {
      const toCp = (analysisData?: StockfishResponse): number | undefined => {
        if (!analysisData) return undefined;
        if (analysisData.mate !== null && analysisData.mate !== undefined) {
          return analysisData.mate > 0 ? 3200 : -3200;
        }
        if (
          analysisData.evaluation === null ||
          analysisData.evaluation === undefined
        ) {
          return undefined;
        }
        return analysisData.evaluation;
      };

      const clamp = (value: number, min: number, max: number) =>
        Math.max(min, Math.min(max, value));

      const byEngine = new Map<AIEngine, StockfishResponse>();
      for (const item of results) {
        byEngine.set(item.requestedEngine, item.analysis);
      }

      const stockfishCp = toCp(byEngine.get("stockfish-online"));
      const chessApiCp = toCp(byEngine.get("chess-api"));
      const preferredCp = toCp(preferred) ?? 0;
      const consensusCp =
        stockfishCp !== undefined && chessApiCp !== undefined
          ? Math.round((stockfishCp + chessApiCp) / 2)
          : (stockfishCp ?? chessApiCp ?? preferredCp);
      const deltaCp =
        stockfishCp !== undefined && chessApiCp !== undefined
          ? Math.abs(stockfishCp - chessApiCp)
          : 0;
      const confidence =
        stockfishCp !== undefined && chessApiCp !== undefined
          ? clamp(Math.round(100 - deltaCp / 6), 25, 100)
          : results.some((item) => item.localFallbackUsed)
            ? 45
            : 68;
      const consensusWdl = estimateWdl(
        consensusCp,
        undefined,
        cpToWinChance(consensusCp),
      );
      const consensusPercent = getEvaluationBarPercent(
        consensusCp,
        undefined,
        cpToWinChance(consensusCp),
      );
      const stockfishPercent =
        stockfishCp !== undefined
          ? getEvaluationBarPercent(
              stockfishCp,
              undefined,
              cpToWinChance(stockfishCp),
            )
          : undefined;
      const chessApiPercent =
        chessApiCp !== undefined
          ? getEvaluationBarPercent(
              chessApiCp,
              undefined,
              cpToWinChance(chessApiCp),
            )
          : undefined;

      const ply = moveHistory.length;
      const moveNumber = Math.ceil(ply / 2);

      setAnalysisTimeline((prev) => {
        const last = prev[prev.length - 1];
        const mover: "w" | "b" = chess.turn() === "w" ? "b" : "w";
        const swingForMoverCp =
          !last || last.fen === fen
            ? 0
            : mover === "w"
              ? consensusCp - last.consensusCp
              : last.consensusCp - consensusCp;
        const quality = classifyMoveQuality(swingForMoverCp);
        const nextPoint: AnalysisTimelinePoint = {
          fen,
          ply,
          moveNumber,
          consensusCp,
          stockfishCp,
          chessApiCp,
          deltaCp,
          confidence,
          wdlWin: consensusWdl.win,
          wdlDraw: consensusWdl.draw,
          wdlLoss: consensusWdl.loss,
          quality: last && last.fen === fen ? last.quality : quality,
        };

        if (last && last.fen === fen) {
          return [...prev.slice(0, -1), nextPoint];
        }
        return [...prev.slice(-119), nextPoint];
      });

      setLiveAnalysisSeries((prev) => {
        const lastPoint = analysisTimeline[analysisTimeline.length - 1];
        const mover: "w" | "b" = chess.turn() === "w" ? "b" : "w";
        const swingForMoverCp = !lastPoint
          ? 0
          : mover === "w"
            ? consensusCp - lastPoint.consensusCp
            : lastPoint.consensusCp - consensusCp;
        const quality = classifyMoveQuality(swingForMoverCp);
        return [
          ...prev.slice(-79),
          {
            timestamp: Date.now(),
            consensus: consensusPercent,
            stockfish: stockfishPercent,
            chessApi: chessApiPercent,
            quality,
          },
        ];
      });
    },
    [analysisTimeline, chess, classifyMoveQuality, moveHistory.length],
  );

  const createAnalysisArrows = useCallback(
    (bestMove: string | null, options?: { force?: boolean }) => {
      const allowArrows = shouldRenderArrows || options?.force === true;
      if (!bestMove || !allowArrows) {
        setAnalysisArrows([]);
        return;
      }

      const move = parseMove(bestMove);
      if (move) {
        const arrows: AnalysisArrow[] = [
          {
            from: move.from,
            to: move.to,
            color: "#7fb069", // Green arrow for best move
          },
        ];
        setAnalysisArrows(arrows);
      }
    },
    [shouldRenderArrows, parseMove],
  );

  const getAnalysisCached = useCallback(
    async (fen: string, depth: number, engine: AIEngine) =>
      queryClient.fetchQuery({
        queryKey: ["engine-analysis", engine, fen, depth],
        queryFn: () => engineClients[engine].getAnalysis(fen, depth),
        retry: false,
      }),
    [queryClient],
  );

  const getFallbackEngine = useCallback(
    (engine: AIEngine): AIEngine =>
      engine === "stockfish-online" ? "chess-api" : "stockfish-online",
    [],
  );

  const getEngineForCurrentTurn = useCallback((): AIEngine => {
    if (settings.mode !== "ai-vs-ai") {
      return settings.aiEngine;
    }
    return chess.turn() === "w"
      ? settings.aiEngine
      : settings.battleOpponentEngine;
  }, [settings.mode, settings.aiEngine, settings.battleOpponentEngine, chess]);

  const getSafeAnalysis = useCallback(
    async (fen: string, depth: number, preferredEngine: AIEngine) => {
      try {
        const analysis = await getAnalysisCached(fen, depth, preferredEngine);
        return {
          analysis,
          engineUsed: preferredEngine,
          fallbackUsed: false,
          localFallbackUsed: false,
        };
      } catch {
        const fallbackEngine = getFallbackEngine(preferredEngine);
        try {
          const analysis = await getAnalysisCached(fen, depth, fallbackEngine);
          return {
            analysis,
            engineUsed: fallbackEngine,
            fallbackUsed: true,
            localFallbackUsed: false,
          };
        } catch {
          return {
            analysis: buildLocalAnalysis(fen),
            engineUsed: fallbackEngine,
            fallbackUsed: true,
            localFallbackUsed: true,
          };
        }
      }
    },
    [getAnalysisCached, getFallbackEngine],
  );

  const analyzeLoadedPgnTimeline = useCallback(
    async (moves: string[]) => {
      const runId = Date.now();
      pgnAnalyzeRunIdRef.current = runId;
      const board = new Chess();
      const snapshots: Array<{ fen: string; ply: number; moveNumber: number }> =
        [];

      for (let index = 0; index < moves.length; index += 1) {
        try {
          board.move(moves[index]);
          snapshots.push({
            fen: board.fen(),
            ply: index + 1,
            moveNumber: Math.ceil((index + 1) / 2),
          });
        } catch {
          break;
        }
      }

      if (snapshots.length === 0) {
        return;
      }

      const limited = snapshots.slice(-120);
      const analysisDepth = Math.min(
        6,
        settings.aiDepth,
        getAnalysisDepthLimit(settings),
      );
      const engines: AIEngine[] =
        settings.analysisEngineMode === "single"
          ? [settings.aiEngine]
          : ["stockfish-online", "chess-api"];

      const timeline: AnalysisTimelinePoint[] = [];
      const live: LiveAnalysisPoint[] = [];
      let previousConsensus = 0;

      for (const snapshot of limited) {
        if (pgnAnalyzeRunIdRef.current !== runId) {
          return;
        }
        const results: AnalysisFetchResult[] = await Promise.all(
          engines.map(async (engine) => {
            const result = await getSafeAnalysis(
              snapshot.fen,
              analysisDepth,
              engine,
            );
            return {
              requestedEngine: engine,
              ...result,
            };
          }),
        );

        const byEngine = new Map<AIEngine, StockfishResponse>();
        for (const result of results) {
          byEngine.set(result.requestedEngine, result.analysis);
        }

        const toCp = (analysisData?: StockfishResponse): number | undefined => {
          if (!analysisData) return undefined;
          if (analysisData.mate !== null && analysisData.mate !== undefined) {
            return analysisData.mate > 0 ? 3200 : -3200;
          }
          return analysisData.evaluation;
        };

        const stockfishCp = toCp(byEngine.get("stockfish-online"));
        const chessApiCp = toCp(byEngine.get("chess-api"));
        const consensusCp =
          stockfishCp !== undefined && chessApiCp !== undefined
            ? Math.round((stockfishCp + chessApiCp) / 2)
            : (stockfishCp ?? chessApiCp ?? 0);
        const deltaCp =
          stockfishCp !== undefined && chessApiCp !== undefined
            ? Math.abs(stockfishCp - chessApiCp)
            : 0;
        const confidence =
          stockfishCp !== undefined && chessApiCp !== undefined
            ? Math.max(25, Math.min(100, Math.round(100 - deltaCp / 6)))
            : results.some((result) => result.localFallbackUsed)
              ? 45
              : 68;
        const swingForMoverCp =
          snapshot.ply === 1
            ? 0
            : snapshot.ply % 2 === 1
              ? consensusCp - previousConsensus
              : previousConsensus - consensusCp;
        previousConsensus = consensusCp;
        const quality = classifyMoveQuality(swingForMoverCp);
        const wdl = estimateWdl(
          consensusCp,
          undefined,
          cpToWinChance(consensusCp),
        );

        timeline.push({
          fen: snapshot.fen,
          ply: snapshot.ply,
          moveNumber: snapshot.moveNumber,
          consensusCp,
          stockfishCp,
          chessApiCp,
          deltaCp,
          confidence,
          wdlWin: wdl.win,
          wdlDraw: wdl.draw,
          wdlLoss: wdl.loss,
          quality,
        });

        live.push({
          timestamp: Date.now() + snapshot.ply,
          consensus: getEvaluationBarPercent(
            consensusCp,
            undefined,
            cpToWinChance(consensusCp),
          ),
          stockfish:
            stockfishCp !== undefined
              ? getEvaluationBarPercent(
                  stockfishCp,
                  undefined,
                  cpToWinChance(stockfishCp),
                )
              : undefined,
          chessApi:
            chessApiCp !== undefined
              ? getEvaluationBarPercent(
                  chessApiCp,
                  undefined,
                  cpToWinChance(chessApiCp),
                )
              : undefined,
          quality,
        });
      }

      if (pgnAnalyzeRunIdRef.current !== runId) {
        return;
      }
      setAnalysisTimeline(timeline);
      setLiveAnalysisSeries(live.slice(-80));
      setEngineNotice(
        `PGN dianalisis: ${timeline.length} posisi (depth ${analysisDepth}).`,
      );
    },
    [classifyMoveQuality, getSafeAnalysis, settings],
  );

  const extractUciMoves = useCallback((text?: string): string[] => {
    if (!text) return [];
    const matches = text.match(/[a-h][1-8][a-h][1-8][qrbn]?/g);
    return matches || [];
  }, []);

  const buildPredictionLine = useCallback(
    (engine: AIEngine, analysisData: StockfishResponse): string[] => {
      const bestMove = analysisData.bestmove
        ? engineClients[engine].extractMoveFromString(analysisData.bestmove)
        : null;
      const continuationMoves = extractUciMoves(analysisData.continuation);
      const merged = [...(bestMove ? [bestMove] : []), ...continuationMoves];
      const uniqueOrdered: string[] = [];

      for (const move of merged) {
        if (!move) continue;
        if (uniqueOrdered[uniqueOrdered.length - 1] === move) continue;
        uniqueOrdered.push(move);
      }

      return uniqueOrdered.slice(0, 6);
    },
    [extractUciMoves],
  );

  const toEngineInsight = useCallback(
    (engine: AIEngine, analysisData: StockfishResponse): EngineInsight => ({
      engine,
      evaluation: analysisData.evaluation,
      mate: analysisData.mate,
      bestMove: analysisData.bestmove
        ? engineClients[engine].extractMoveFromString(analysisData.bestmove) ||
          undefined
        : undefined,
      predictionLine: buildPredictionLine(engine, analysisData),
    }),
    [buildPredictionLine],
  );

  const pickSafeMove = useCallback(
    (
      results: Array<{
        requestedEngine: AIEngine;
        analysis: StockfishResponse;
        engineUsed: AIEngine;
      }>,
      turn: "w" | "b",
    ): string | null => {
      const bestMoves = results
        .map((r) =>
          r.analysis.bestmove
            ? engineClients[r.engineUsed].extractMoveFromString(
                r.analysis.bestmove,
              )
            : null,
        )
        .filter((m): m is string => Boolean(m));

      if (bestMoves.length === 0) return null;

      // Consensus move is the safest option.
      if (bestMoves.length >= 2 && bestMoves.every((m) => m === bestMoves[0])) {
        return bestMoves[0];
      }

      // Try intersection from short prediction line.
      const predictionSets = results.map(
        (r) =>
          new Set(buildPredictionLine(r.engineUsed, r.analysis).slice(0, 4)),
      );
      if (predictionSets.length >= 2) {
        const first = predictionSets[0];
        for (const candidate of first) {
          if (predictionSets.every((set) => set.has(candidate))) {
            return candidate;
          }
        }
      }

      // Fallback: choose move from engine with best eval for side to move.
      const scored = results
        .map((r) => {
          const move = r.analysis.bestmove
            ? engineClients[r.engineUsed].extractMoveFromString(
                r.analysis.bestmove,
              )
            : null;
          return {
            move,
            eval: r.analysis.evaluation ?? 0,
          };
        })
        .filter((x): x is { move: string; eval: number } => Boolean(x.move));

      if (scored.length === 0) return null;
      scored.sort((a, b) => (turn === "w" ? b.eval - a.eval : a.eval - b.eval));
      return scored[0].move;
    },
    [buildPredictionLine],
  );

  const buildWdlPolicyArrows = useCallback(
    async (params: {
      fen: string;
      analysisDepth: number;
      preferredEngine: AIEngine;
      preferredAnalysis: StockfishResponse;
      scoreEngine?: AIEngine;
    }): Promise<{ arrows: AnalysisArrow[]; scores: WdlArrowScore[] }> => {
      const {
        fen,
        analysisDepth,
        preferredEngine,
        preferredAnalysis,
        scoreEngine,
      } = params;
      const board = new Chess(fen);
      const sideToMove = board.turn();
      const displayEngine = scoreEngine ?? preferredEngine;
      const candidateMoves = buildPredictionLine(
        preferredEngine,
        preferredAnalysis,
      ).slice(0, 3);

      if (candidateMoves.length === 0) {
        return { arrows: [], scores: [] };
      }

      const baseWdl = estimateWdl(
        preferredAnalysis.evaluation,
        preferredAnalysis.mate,
        preferredAnalysis.winChance,
      );
      const baseLoss = sideToMove === "w" ? baseWdl.loss : baseWdl.win;
      const policyDepth = Math.max(6, Math.min(8, analysisDepth - 2));

      const scored = await Promise.all(
        candidateMoves.map(async (move) => {
          const parsed = parseMove(move);
          if (!parsed) return null;

          const nextBoard = new Chess(fen);
          try {
            nextBoard.move(move);
          } catch {
            return null;
          }

          const next = await getSafeAnalysis(
            nextBoard.fen(),
            policyDepth,
            preferredEngine,
          );
          const nextWdl = estimateWdl(
            next.analysis.evaluation,
            next.analysis.mate,
            next.analysis.winChance,
          );
          const winChance = sideToMove === "w" ? nextWdl.win : nextWdl.loss;
          const lossChance = sideToMove === "w" ? nextWdl.loss : nextWdl.win;

          return {
            from: parsed.from,
            to: parsed.to,
            winChance,
            lossChance,
          };
        }),
      );

      const valid = scored.filter((item): item is NonNullable<typeof item> =>
        Boolean(item),
      );
      if (valid.length === 0) {
        return { arrows: [], scores: [] };
      }

      const bestWin = Math.max(...valid.map((item) => item.winChance));
      const scores: Omit<WdlArrowScore, "rank">[] = valid.map((item) => {
        const winDrop = bestWin - item.winChance;
        const lossSpike = item.lossChance - baseLoss;

        const enginePalette: Record<
          AIEngine,
          { best: string; safe: string; risky: string; blunder: string }
        > = {
          "stockfish-online": {
            best: "#3b82f6",
            safe: "#0ea5e9",
            risky: "#6366f1",
            blunder: "#ef4444",
          },
          "chess-api": {
            best: "#22c55e",
            safe: "#84cc16",
            risky: "#eab308",
            blunder: "#f97316",
          },
        };

        let color = enginePalette[displayEngine].safe; // Good: keeps WDL stable
        let verdict: WdlArrowScore["verdict"] = "safe";
        if (lossSpike >= 12 || winDrop >= 15) {
          color = enginePalette[displayEngine].blunder; // Blunder: loss jumps hard
          verdict = "blunder";
        } else if (winDrop <= 2) {
          color = enginePalette[displayEngine].best; // Best/near-best
          verdict = "best";
        } else if (lossSpike >= 7 || winDrop >= 8) {
          color = enginePalette[displayEngine].risky;
          verdict = "risky";
        }

        return {
          engine: displayEngine,
          move: `${item.from}${item.to}`,
          win: item.winChance,
          draw: Math.max(0, 100 - item.winChance - item.lossChance),
          loss: item.lossChance,
          deltaLoss: Math.round(lossSpike),
          quality: Math.max(
            0,
            100 - (Math.max(winDrop, 0) * 3 + Math.max(lossSpike, 0) * 2),
          ),
          verdict,
          color,
        };
      });
      scores.sort((a, b) => b.quality - a.quality);
      const rankedScores = scores.map((score, index) => ({
        ...score,
        rank: index + 1,
      }));
      const arrows: AnalysisArrow[] = rankedScores.map((score) => ({
        from: score.move.slice(0, 2) as Square,
        to: score.move.slice(2, 4) as Square,
        color: score.color,
      }));
      return { arrows, scores: rankedScores };
    },
    [buildPredictionLine, parseMove, getSafeAnalysis],
  );

  const mergeWdlPolicyResults = useCallback(
    (
      multiWdl: Array<{ arrows: AnalysisArrow[]; scores: WdlArrowScore[] }>,
    ): { arrows: AnalysisArrow[]; scores: WdlArrowScore[] } => {
      const scores = multiWdl.flatMap((item) => item.scores);
      const moveMap = new Map<
        string,
        { from: Square; to: Square; colors: Set<string> }
      >();

      for (const score of scores) {
        const from = score.move.slice(0, 2) as Square;
        const to = score.move.slice(2, 4) as Square;
        const key = `${from}${to}`;
        const existing = moveMap.get(key);
        if (existing) {
          existing.colors.add(score.color);
        } else {
          moveMap.set(key, { from, to, colors: new Set([score.color]) });
        }
      }

      const arrows: AnalysisArrow[] = Array.from(moveMap.values()).map(
        (item) => ({
          from: item.from,
          to: item.to,
          color: item.colors.size > 1 ? "#facc15" : Array.from(item.colors)[0],
        }),
      );

      return { arrows, scores };
    },
    [],
  );

  const handleAnalyzePosition = useCallback(
    async (options?: {
      force?: boolean;
      fen?: string;
      silent?: boolean;
      forceArrows?: boolean;
    }) => {
      const targetFen = options?.fen ?? chess.fen();
      const shouldForce =
        options?.force === true || options?.forceArrows === true;
      const isSilent = options?.silent === true;

      if (analysisInFlightRef.current) {
        if (shouldForce) {
          pendingForcedAnalyzeRef.current = {
            force: true,
            forceArrows: options?.forceArrows ?? false,
            fen: targetFen,
            silent: isSilent,
          };
          window.setTimeout(() => {
            if (pendingForcedAnalyzeRef.current) {
              const queued = pendingForcedAnalyzeRef.current;
              pendingForcedAnalyzeRef.current = null;
              void handleAnalyzePosition(queued);
            }
          }, 120);
        }
        return;
      }
      if (!shouldForce && lastAnalyzedFenRef.current === targetFen) return;

      analysisInFlightRef.current = true;
      if (!isSilent) {
        setIsThinking(true);
      }
      try {
        const analysisDepth = Math.min(
          settings.aiDepth,
          getAnalysisDepthLimit(settings),
        );
        const engines: AIEngine[] =
          settings.analysisEngineMode === "single"
            ? [settings.aiEngine]
            : ["stockfish-online", "chess-api"];

        const results: AnalysisFetchResult[] = await Promise.all(
          engines.map(async (engine) => {
            const result = await getSafeAnalysis(
              targetFen,
              analysisDepth,
              engine,
            );
            return {
              requestedEngine: engine,
              ...result,
            };
          }),
        );

        const preferredResult =
          results.find((r) => r.requestedEngine === settings.aiEngine) ||
          results[0];
        recordAnalysisSample(targetFen, results, preferredResult.analysis);
        const safeMove = pickSafeMove(results, chess.turn());
        const allowArrows = shouldRenderArrows || options?.forceArrows === true;
        const useWdlPolicyArrows =
          options?.forceArrows === true && settings.wdlPolicyArrows;
        setAnalysis(preferredResult.analysis);

        if (settings.analysisEngineMode === "single") {
          setEngineInsights([
            toEngineInsight(
              preferredResult.engineUsed,
              preferredResult.analysis,
            ),
          ]);
          const singleBest = preferredResult.analysis.bestmove
            ? engineClients[preferredResult.engineUsed].extractMoveFromString(
                preferredResult.analysis.bestmove,
              )
            : null;
          setHintMove(singleBest);
          if (allowArrows && useWdlPolicyArrows) {
            const wdlArrows = await buildWdlPolicyArrows({
              fen: targetFen,
              analysisDepth,
              preferredEngine: preferredResult.engineUsed,
              preferredAnalysis: preferredResult.analysis,
              scoreEngine: preferredResult.requestedEngine,
            });
            if (wdlArrows.arrows.length > 0) {
              setAnalysisArrows(wdlArrows.arrows);
              setWdlArrowScores(wdlArrows.scores);
            } else {
              createAnalysisArrows(singleBest, { force: allowArrows });
              setWdlArrowScores([]);
            }
          } else {
            createAnalysisArrows(singleBest, { force: allowArrows });
            setWdlArrowScores([]);
          }
        } else {
          const insights = results.map(({ requestedEngine, analysis }) =>
            toEngineInsight(requestedEngine, analysis),
          );
          setEngineInsights(insights);
          setHintMove(safeMove);

          if (!allowArrows) {
            setAnalysisArrows([]);
            setWdlArrowScores([]);
          } else if (useWdlPolicyArrows) {
            if (settings.analysisEngineMode === "both") {
              const multiWdl = await Promise.all(
                results.map((result) =>
                  buildWdlPolicyArrows({
                    fen: targetFen,
                    analysisDepth,
                    preferredEngine: result.engineUsed,
                    preferredAnalysis: result.analysis,
                    scoreEngine: result.requestedEngine,
                  }),
                ),
              );
              const merged = mergeWdlPolicyResults(multiWdl);
              if (merged.arrows.length > 0) {
                setAnalysisArrows(merged.arrows);
                setWdlArrowScores(merged.scores);
              } else {
                setAnalysisArrows([]);
                setWdlArrowScores([]);
              }
            } else {
              const wdlArrows = await buildWdlPolicyArrows({
                fen: targetFen,
                analysisDepth,
                preferredEngine: preferredResult.engineUsed,
                preferredAnalysis: preferredResult.analysis,
                scoreEngine: preferredResult.requestedEngine,
              });
              if (wdlArrows.arrows.length > 0) {
                setAnalysisArrows(wdlArrows.arrows);
                setWdlArrowScores(wdlArrows.scores);
              } else if (settings.analysisEngineMode === "safe") {
                const parsedSafe = safeMove ? parseMove(safeMove) : null;
                setAnalysisArrows(
                  parsedSafe
                    ? [
                        {
                          from: parsedSafe.from,
                          to: parsedSafe.to,
                          color: "#facc15",
                        },
                      ]
                    : [],
                );
                setWdlArrowScores([]);
              } else {
                const arrowColors: Record<AIEngine, string> = {
                  "stockfish-online": "#7fb069",
                  "chess-api": "#3b82f6",
                };
                const parsedArrows = results
                  .map((result) => {
                    const bestMove = engineClients[
                      result.engineUsed
                    ].extractMoveFromString(result.analysis.bestmove || "");
                    const parsed = bestMove ? parseMove(bestMove) : null;
                    if (!parsed) return null;
                    return {
                      from: parsed.from,
                      to: parsed.to,
                      color: arrowColors[result.requestedEngine],
                    } as AnalysisArrow;
                  })
                  .filter((arrow): arrow is AnalysisArrow => Boolean(arrow));
                const arrows =
                  parsedArrows.length >= 2 &&
                  parsedArrows[0].from === parsedArrows[1].from &&
                  parsedArrows[0].to === parsedArrows[1].to
                    ? [{ ...parsedArrows[0], color: "#facc15" }]
                    : parsedArrows;
                setAnalysisArrows(arrows);
                setWdlArrowScores([]);
              }
            }
          } else if (settings.analysisEngineMode === "safe") {
            const parsedSafe = safeMove ? parseMove(safeMove) : null;
            setAnalysisArrows(
              parsedSafe
                ? [
                    {
                      from: parsedSafe.from,
                      to: parsedSafe.to,
                      color: "#facc15",
                    },
                  ]
                : [],
            );
            setWdlArrowScores([]);
          } else {
            const arrowColors: Record<AIEngine, string> = {
              "stockfish-online": "#7fb069",
              "chess-api": "#3b82f6",
            };
            const parsedArrows = results
              .map((result) => {
                const bestMove = engineClients[
                  result.engineUsed
                ].extractMoveFromString(result.analysis.bestmove || "");
                const parsed = bestMove ? parseMove(bestMove) : null;
                if (!parsed) return null;
                return {
                  from: parsed.from,
                  to: parsed.to,
                  color: arrowColors[result.requestedEngine],
                } as AnalysisArrow;
              })
              .filter((arrow): arrow is AnalysisArrow => Boolean(arrow));

            const arrows =
              parsedArrows.length >= 2 &&
              parsedArrows[0].from === parsedArrows[1].from &&
              parsedArrows[0].to === parsedArrows[1].to
                ? [{ ...parsedArrows[0], color: "#facc15" }]
                : parsedArrows;
            setAnalysisArrows(arrows);
            setWdlArrowScores([]);
          }
        }

        const fallbackMessages = results
          .filter((r) => r.fallbackUsed)
          .map((r) => `${r.requestedEngine} -> ${r.engineUsed}`);
        const localFallbackMessages = results
          .filter((r) => r.localFallbackUsed)
          .map((r) => r.requestedEngine);
        const depthNotice =
          analysisDepth < settings.aiDepth
            ? `Depth dibatasi ke ${analysisDepth} sesuai batas engine.`
            : null;
        setEngineNotice(
          [
            depthNotice,
            fallbackMessages.length > 0
              ? `Fallback aktif: ${fallbackMessages.join(", ")}`
              : null,
            localFallbackMessages.length > 0
              ? `Local analysis aktif: ${localFallbackMessages.join(", ")}`
              : null,
          ]
            .filter(Boolean)
            .join(" | ") || null,
        );
        lastAnalyzedFenRef.current = targetFen;
      } catch (error) {
        console.error("Error analyzing position:", error);
        setEngineNotice("Semua engine gagal merespons. Coba lagi sebentar.");
      } finally {
        if (!isSilent) {
          setIsThinking(false);
        }
        analysisInFlightRef.current = false;
      }
    },
    [
      chess,
      settings,
      shouldRenderArrows,
      buildWdlPolicyArrows,
      mergeWdlPolicyResults,
      createAnalysisArrows,
      getSafeAnalysis,
      pickSafeMove,
      parseMove,
      recordAnalysisSample,
      toEngineInsight,
    ],
  );

  const clearAnalysisSchedule = useCallback(() => {
    if (analysisTimeoutRef.current) {
      window.clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
  }, []);

  const scheduleAnalysis = useCallback(
    (delay = 140, options?: { force?: boolean; silent?: boolean }) => {
      clearAnalysisSchedule();
      analysisTimeoutRef.current = window.setTimeout(() => {
        analysisTimeoutRef.current = null;
        void handleAnalyzePosition({
          force: options?.force,
          silent: options?.silent,
        });
      }, delay);
    },
    [clearAnalysisSchedule, handleAnalyzePosition],
  );

  const makeMove = useCallback(
    (from: Square, to: Square) => {
      if (!canMoveToSquare(chess, from, to)) {
        return false;
      }
      try {
        const promotion = getPromotionForMove(chess, from, to);
        const move = chess.move({
          from: from,
          to: to,
          promotion,
        });

        if (move) {
          const newMoveHistory = [...moveHistory, move.san];
          setMoveHistory(newMoveHistory);
          updateGameState();
          setHintMove(null); // Clear hint after move
          setAnalysisArrows([]);
          setWdlArrowScores([]);

          // Enhanced feedback for moves
          if (move.captured) {
            soundManager.playCapture();
            hapticManager.strongTap();
          } else {
            soundManager.playMove();
            hapticManager.successPattern();
          }

          // Check for special game states
          if (chess.inCheck()) {
            soundManager.playCheck();
            hapticManager.checkPattern();
          }

          if (chess.isGameOver()) {
            soundManager.playGameEnd();
            hapticManager.gameEndPattern();
          }

          // Auto-save the game
          gameStorage.autoSaveCurrentGame(
            chess.fen(),
            chess.pgn(),
            newMoveHistory.length,
            move.san,
          );

          return true;
        }
      } catch (error) {
        console.error("Unexpected move error:", error);
        soundManager.playError();
        hapticManager.errorPattern();
      }

      return false;
    },
    [chess, moveHistory, updateGameState],
  );

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (chess.isGameOver() && !settings.analysisMode) return;
      if (!isPlayerTurn() && !settings.analysisMode) return;

      const piece = chess.get(square);

      // If clicking the same square, deselect
      if (selectedSquare === square) {
        clearSelection();
        return;
      }

      // If we have a selected square and this is a valid move
      if (selectedSquare && availableMoves.includes(square)) {
        const moveSuccessful = makeMove(selectedSquare, square);
        if (moveSuccessful) {
          clearSelection();
        }
      }
      // If clicking on a piece (more permissive for mobile)
      else if (piece) {
        // In analysis mode, allow any piece
        // In normal mode, allow current player's pieces
        const canSelectPiece =
          settings.analysisMode || piece.color === chess.turn();

        if (canSelectPiece) {
          setSelectedSquare(square);
          const moves = chess.moves({
            square: square,
            verbose: true,
          });
          const moveSquares = moves.map((move) => move.to as Square);
          setAvailableMoves(moveSquares);
        } else {
          clearSelection();
        }
      }
      // Otherwise, clear selection
      else {
        clearSelection();
      }
    },
    [
      selectedSquare,
      availableMoves,
      chess,
      settings,
      clearSelection,
      isPlayerTurn,
      makeMove,
    ],
  );

  const handlePieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square) => {
      if (sourceSquare === targetSquare) {
        clearSelection();
        return false;
      }

      if (chess.isGameOver() && !settings.analysisMode) {
        return false;
      }

      if (!isPlayerTurn() && !settings.analysisMode) {
        return false;
      }

      // Validate the move is legal
      const piece = chess.get(sourceSquare);
      if (!piece) {
        return false;
      }

      // In normal mode, check if it's the right player's piece
      if (!settings.analysisMode && piece.color !== chess.turn()) {
        return false;
      }

      // Try to make the move
      if (!canMoveToSquare(chess, sourceSquare, targetSquare)) {
        clearSelection();
        return false;
      }

      const moveSuccessful = makeMove(sourceSquare, targetSquare);

      // Clear selection after drag and drop
      clearSelection();

      return moveSuccessful;
    },
    [chess, settings, isPlayerTurn, clearSelection, makeMove],
  );

  const handleBotMove = useCallback(async () => {
    if (chess.isGameOver()) return;

    setIsThinking(true);
    try {
      const aiMoveDepth = Math.min(
        settings.aiDepth,
        getAiMoveDepthLimit(settings),
      );
      const preferredEngine = getEngineForCurrentTurn();
      const { analysis, engineUsed, fallbackUsed, localFallbackUsed } =
        await getSafeAnalysis(chess.fen(), aiMoveDepth, preferredEngine);
      setEngineNotice(
        [
          aiMoveDepth < settings.aiDepth
            ? `Depth dibatasi ke ${aiMoveDepth} sesuai batas engine.`
            : null,
          fallbackUsed
            ? `Engine ${preferredEngine} bermasalah, fallback ke ${engineUsed}.`
            : null,
          localFallbackUsed
            ? "Engine online tidak tersedia, memakai local analysis sementara."
            : null,
        ]
          .filter(Boolean)
          .join(" | ") || null,
      );
      const bestMove = analysis.bestmove
        ? engineClients[engineUsed].extractMoveFromString(analysis.bestmove)
        : null;
      setEngineInsights([toEngineInsight(engineUsed, analysis)]);

      if (bestMove) {
        const move = chess.move(bestMove);
        if (move) {
          const newMoveHistory = [...moveHistory, move.san];
          setMoveHistory(newMoveHistory);
          updateGameState();
        }
      }
    } catch (error) {
      console.error("Error getting bot move:", error);
      setEngineNotice("Langkah AI gagal karena engine tidak merespons.");
    } finally {
      setIsThinking(false);
    }
  }, [
    chess,
    moveHistory,
    settings,
    updateGameState,
    getSafeAnalysis,
    getEngineForCurrentTurn,
    toEngineInsight,
  ]);

  const handleGetHint = useCallback(async () => {
    setIsThinking(true);
    try {
      const analysisDepth = Math.min(
        settings.aiDepth,
        getAnalysisDepthLimit(settings),
      );
      const engines: AIEngine[] =
        settings.analysisEngineMode === "single"
          ? [settings.aiEngine]
          : ["stockfish-online", "chess-api"];
      const results: AnalysisFetchResult[] = await Promise.all(
        engines.map(async (engine) => {
          const result = await getSafeAnalysis(
            chess.fen(),
            analysisDepth,
            engine,
          );
          return { requestedEngine: engine, ...result };
        }),
      );

      const preferredResult =
        results.find((r) => r.requestedEngine === settings.aiEngine) ||
        results[0];
      recordAnalysisSample(chess.fen(), results, preferredResult.analysis);
      const safeMove = pickSafeMove(results, chess.turn());
      const allowArrows = shouldRenderArrows || settings.showAnalysisArrows;
      const useWdlPolicyArrows = allowArrows && settings.wdlPolicyArrows;
      setAnalysis(preferredResult.analysis);

      if (settings.analysisEngineMode === "single") {
        const cleanMove = preferredResult.analysis.bestmove
          ? engineClients[preferredResult.engineUsed].extractMoveFromString(
              preferredResult.analysis.bestmove,
            )
          : null;
        setHintMove(cleanMove);
        if (useWdlPolicyArrows) {
          const wdlArrows = await buildWdlPolicyArrows({
            fen: chess.fen(),
            analysisDepth,
            preferredEngine: preferredResult.engineUsed,
            preferredAnalysis: preferredResult.analysis,
            scoreEngine: preferredResult.requestedEngine,
          });
          if (wdlArrows.arrows.length > 0) {
            setAnalysisArrows(wdlArrows.arrows);
            setWdlArrowScores(wdlArrows.scores);
          } else {
            createAnalysisArrows(cleanMove, { force: allowArrows });
            setWdlArrowScores([]);
          }
        } else {
          createAnalysisArrows(cleanMove, { force: allowArrows });
          setWdlArrowScores([]);
        }
        setEngineInsights([
          toEngineInsight(preferredResult.engineUsed, preferredResult.analysis),
        ]);
      } else {
        setHintMove(safeMove);
        setEngineInsights(
          results.map(({ requestedEngine, analysis }) =>
            toEngineInsight(requestedEngine, analysis),
          ),
        );

        if (!allowArrows) {
          setAnalysisArrows([]);
          setWdlArrowScores([]);
        } else if (useWdlPolicyArrows) {
          if (settings.analysisEngineMode === "both") {
            const multiWdl = await Promise.all(
              results.map((result) =>
                buildWdlPolicyArrows({
                  fen: chess.fen(),
                  analysisDepth,
                  preferredEngine: result.engineUsed,
                  preferredAnalysis: result.analysis,
                  scoreEngine: result.requestedEngine,
                }),
              ),
            );
            const merged = mergeWdlPolicyResults(multiWdl);
            if (merged.arrows.length > 0) {
              setAnalysisArrows(merged.arrows);
              setWdlArrowScores(merged.scores);
            } else {
              setAnalysisArrows([]);
              setWdlArrowScores([]);
            }
          } else {
            const wdlArrows = await buildWdlPolicyArrows({
              fen: chess.fen(),
              analysisDepth,
              preferredEngine: preferredResult.engineUsed,
              preferredAnalysis: preferredResult.analysis,
              scoreEngine: preferredResult.requestedEngine,
            });
            if (wdlArrows.arrows.length > 0) {
              setAnalysisArrows(wdlArrows.arrows);
              setWdlArrowScores(wdlArrows.scores);
            } else if (settings.analysisEngineMode === "safe") {
              const parsedSafe = safeMove ? parseMove(safeMove) : null;
              setAnalysisArrows(
                parsedSafe
                  ? [
                      {
                        from: parsedSafe.from,
                        to: parsedSafe.to,
                        color: "#facc15",
                      },
                    ]
                  : [],
              );
              setWdlArrowScores([]);
            } else {
              const arrowColors: Record<AIEngine, string> = {
                "stockfish-online": "#7fb069",
                "chess-api": "#3b82f6",
              };
              const parsedArrows = results
                .map((result) => {
                  const bestMove = engineClients[
                    result.engineUsed
                  ].extractMoveFromString(result.analysis.bestmove || "");
                  const parsed = bestMove ? parseMove(bestMove) : null;
                  if (!parsed) return null;
                  return {
                    from: parsed.from,
                    to: parsed.to,
                    color: arrowColors[result.requestedEngine],
                  } as AnalysisArrow;
                })
                .filter((arrow): arrow is AnalysisArrow => Boolean(arrow));
              const arrows =
                parsedArrows.length >= 2 &&
                parsedArrows[0].from === parsedArrows[1].from &&
                parsedArrows[0].to === parsedArrows[1].to
                  ? [{ ...parsedArrows[0], color: "#facc15" }]
                  : parsedArrows;
              setAnalysisArrows(arrows);
              setWdlArrowScores([]);
            }
          }
        } else if (settings.analysisEngineMode === "safe") {
          const parsedSafe = safeMove ? parseMove(safeMove) : null;
          setAnalysisArrows(
            parsedSafe
              ? [{ from: parsedSafe.from, to: parsedSafe.to, color: "#facc15" }]
              : [],
          );
          setWdlArrowScores([]);
        } else {
          const arrowColors: Record<AIEngine, string> = {
            "stockfish-online": "#7fb069",
            "chess-api": "#3b82f6",
          };
          const parsedArrows = results
            .map((result) => {
              const bestMove = engineClients[
                result.engineUsed
              ].extractMoveFromString(result.analysis.bestmove || "");
              const parsed = bestMove ? parseMove(bestMove) : null;
              if (!parsed) return null;
              return {
                from: parsed.from,
                to: parsed.to,
                color: arrowColors[result.requestedEngine],
              } as AnalysisArrow;
            })
            .filter((arrow): arrow is AnalysisArrow => Boolean(arrow));
          const arrows =
            parsedArrows.length >= 2 &&
            parsedArrows[0].from === parsedArrows[1].from &&
            parsedArrows[0].to === parsedArrows[1].to
              ? [{ ...parsedArrows[0], color: "#facc15" }]
              : parsedArrows;
          setAnalysisArrows(arrows);
          setWdlArrowScores([]);
        }
      }

      const fallbackMessages = results
        .filter((r) => r.fallbackUsed)
        .map((r) => `${r.requestedEngine} -> ${r.engineUsed}`);
      const localFallbackMessages = results
        .filter((r) => r.localFallbackUsed)
        .map((r) => r.requestedEngine);
      const depthNotice =
        analysisDepth < settings.aiDepth
          ? `Depth dibatasi ke ${analysisDepth} sesuai batas engine.`
          : null;
      setEngineNotice(
        [
          depthNotice,
          fallbackMessages.length > 0
            ? `Fallback aktif: ${fallbackMessages.join(", ")}`
            : null,
          localFallbackMessages.length > 0
            ? `Local analysis aktif: ${localFallbackMessages.join(", ")}`
            : null,
        ]
          .filter(Boolean)
          .join(" | ") || null,
      );
    } catch (error) {
      console.error("Error getting hint:", error);
      setEngineNotice("Gagal mendapatkan hint dari engine.");
    } finally {
      setIsThinking(false);
    }
  }, [
    chess,
    settings,
    shouldRenderArrows,
    buildWdlPolicyArrows,
    mergeWdlPolicyResults,
    createAnalysisArrows,
    getSafeAnalysis,
    parseMove,
    pickSafeMove,
    recordAnalysisSample,
    toEngineInsight,
  ]);

  const handleNewGame = useCallback(() => {
    cancelPgnAnalysis();
    chess.reset();
    setMoveHistory([]);
    setAnalysis(null);
    setEvaluationTrend([]);
    lastTrendFenRef.current = null;
    setEngineInsights([]);
    setAnalysisArrows([]);
    setWdlArrowScores([]);
    setAnalysisTimeline([]);
    setLiveAnalysisSeries([]);
    setLoadedPgnResult(null);
    setHintMove(null);
    clearSelection();
    updateGameState();
  }, [cancelPgnAnalysis, chess, clearSelection, updateGameState]);

  const handleStartAsWhite = useCallback(() => {
    cancelPgnAnalysis();
    chess.reset();
    setMoveHistory([]);
    setAnalysis(null);
    setEvaluationTrend([]);
    lastTrendFenRef.current = null;
    setEngineInsights([]);
    setAnalysisArrows([]);
    setWdlArrowScores([]);
    setAnalysisTimeline([]);
    setLiveAnalysisSeries([]);
    setLoadedPgnResult(null);
    setHintMove(null);
    clearSelection();
    setSettings((prev) => ({
      ...prev,
      humanColor: "white",
      aiColor: "black",
      boardOrientation: "white", // Set board orientation to match human color
    }));
    updateGameState();
  }, [cancelPgnAnalysis, chess, clearSelection, updateGameState]);

  const handleStartAsBlack = useCallback(() => {
    cancelPgnAnalysis();
    chess.reset();
    setMoveHistory([]);
    setAnalysis(null);
    setEvaluationTrend([]);
    lastTrendFenRef.current = null;
    setEngineInsights([]);
    setAnalysisArrows([]);
    setWdlArrowScores([]);
    setAnalysisTimeline([]);
    setLiveAnalysisSeries([]);
    setLoadedPgnResult(null);
    setHintMove(null);
    clearSelection();
    setSettings((prev) => ({
      ...prev,
      humanColor: "black",
      aiColor: "white",
      boardOrientation: "black", // Set board orientation to match human color
    }));
    updateGameState();

    // Auto-move useEffect handles triggering handleBotMove when it's the AI's turn
  }, [cancelPgnAnalysis, chess, clearSelection, updateGameState]);

  const handleUndo = useCallback(() => {
    cancelPgnAnalysis();
    const move = chess.undo();
    if (move) {
      setMoveHistory((prev) => prev.slice(0, -1));
      setAnalysis(null);
      setEvaluationTrend([]);
      lastTrendFenRef.current = null;
      setEngineInsights([]);
      setAnalysisArrows([]);
      setWdlArrowScores([]);
      setAnalysisTimeline([]);
      setLiveAnalysisSeries([]);
      setLoadedPgnResult(null);
      setHintMove(null);
      clearSelection();
      updateGameState();
    }
  }, [cancelPgnAnalysis, chess, clearSelection, updateGameState]);

  const handleLoadFen = useCallback(
    (fen: string) => {
      try {
        cancelPgnAnalysis();
        chess.load(fen);
        setMoveHistory([]);
        setAnalysis(null);
        setEvaluationTrend([]);
        lastTrendFenRef.current = null;
        setEngineInsights([]);
        setAnalysisArrows([]);
        setWdlArrowScores([]);
        setAnalysisTimeline([]);
        setLiveAnalysisSeries([]);
        setLoadedPgnResult(null);
        setHintMove(null);
        clearSelection();
        updateGameState();
      } catch (error) {
        console.error("Invalid FEN:", error);
      }
    },
    [cancelPgnAnalysis, chess, clearSelection, updateGameState],
  );

  const handleFlipBoard = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      boardOrientation: prev.boardOrientation === "white" ? "black" : "white",
      // Note: humanColor and aiColor remain unchanged when flipping board
    }));
  }, []);

  const handleSettingsChange = useCallback(
    (newSettings: Partial<GameSettings>) => {
      setSettings((prev) => {
        const merged = { ...prev, ...newSettings };
        const uiDepthLimit = merged.analysisMode
          ? getAnalysisDepthLimit(merged)
          : getAiMoveDepthLimit(merged);
        if (merged.aiDepth > uiDepthLimit) {
          merged.aiDepth = uiDepthLimit;
        }
        return merged;
      });
      setEngineNotice(null);

      // Clear arrows if analysis arrows are disabled
      if (newSettings.showAnalysisArrows === false) {
        setAnalysisArrows([]);
        setWdlArrowScores([]);
      }
      if (newSettings.wdlPolicyArrows === false) {
        setWdlArrowScores([]);
      }

      const shouldForceReanalyze =
        newSettings.analysisMode === true ||
        newSettings.aiDepth !== undefined ||
        newSettings.aiEngine !== undefined ||
        newSettings.analysisEngineMode !== undefined ||
        newSettings.wdlPolicyArrows !== undefined ||
        newSettings.battleEnabled !== undefined ||
        newSettings.battleOpponentEngine !== undefined;

      if (shouldForceReanalyze && !chess.isGameOver()) {
        scheduleAnalysis(80, { force: true, silent: true });
      }
    },
    [scheduleAnalysis, chess],
  );

  const handlePauseAiVsAi = useCallback(() => {
    setIsAiVsAiPaused(true);
  }, []);

  const handleResumeAiVsAi = useCallback(() => {
    setIsAiVsAiPaused(false);
  }, []);

  // ────────────────────────────────────────────────────
  // Replay helpers
  // ────────────────────────────────────────────────────

  /** Reconstruct the FEN after applying the first `plyCount` moves from history. */
  const getFenAtPly = useCallback(
    (plyCount: number): string => {
      const temp = new Chess();
      const movesToApply = moveHistory.slice(0, plyCount);
      for (const san of movesToApply) {
        try {
          temp.move(san);
        } catch {
          break;
        }
      }
      return temp.fen();
    },
    [moveHistory],
  );

  /** Current FEN shown in replay (or live FEN when not replaying). */
  const replayFen = replayIndex !== null ? getFenAtPly(replayIndex) : null;

  const handleReplayGoto = useCallback((plyIndex: number) => {
    setReplayIndex(Math.max(0, plyIndex));
  }, []);

  const handleReplayExit = useCallback(() => {
    setReplayIndex(null);
  }, []);

  const handleReplayFirst = useCallback(() => {
    setReplayIndex(0);
  }, []);

  const handleReplayLast = useCallback(() => {
    setReplayIndex(moveHistory.length);
  }, [moveHistory.length]);

  const handleReplayPrev = useCallback(() => {
    setReplayIndex((prev) => {
      if (prev === null) return moveHistory.length - 1;
      return Math.max(0, prev - 1);
    });
  }, [moveHistory.length]);

  const handleReplayNext = useCallback(() => {
    setReplayIndex((prev) => {
      if (prev === null) return null;
      const next = prev + 1;
      if (next > moveHistory.length) return null; // exit replay past last move
      return next;
    });
  }, [moveHistory.length]);

  const handleCopyFen = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(chess.fen());
    } catch (error) {
      console.error("Failed to copy FEN:", error);
    }
  }, [chess]);

  const handleLoadPGN = useCallback(
    (newChess: Chess, gameInfo: PGNGameInfo) => {
      try {
        cancelPgnAnalysis();
        // Load the position from the provided chess instance
        chess.load(newChess.fen());

        // Create move history from the game moves
        const tempChess = new Chess();
        const moveHistory = gameInfo.moves.map((move) => {
          try {
            const moveResult = tempChess.move(move);
            if (moveResult) {
              return moveResult.san;
            }
          } catch {
            // If move fails, just use the original notation
          }
          return move;
        });

        setMoveHistory(moveHistory);
        setAnalysis(null);
        setEvaluationTrend([]);
        lastTrendFenRef.current = null;
        setEngineInsights([]);
        setAnalysisArrows([]);
        setWdlArrowScores([]);
        setAnalysisTimeline([]);
        setLiveAnalysisSeries([]);
        setLoadedPgnResult(gameInfo.result || null);
        setHintMove(null);
        clearSelection();
        updateGameState();
        setEngineNotice("Menganalisis PGN yang dimuat...");
        void analyzeLoadedPgnTimeline(gameInfo.moves);

        // Play a success sound
        soundManager.playMove();
        hapticManager.successPattern();
      } catch (error) {
        console.error("Failed to load PGN game:", error);
        soundManager.playError();
        hapticManager.errorPattern();
      }
    },
    [
      analyzeLoadedPgnTimeline,
      cancelPgnAnalysis,
      chess,
      clearSelection,
      updateGameState,
    ],
  );

  // AI vs AI game loop
  useEffect(() => {
    let timeoutId: number;

    if (
      settings.mode === "ai-vs-ai" &&
      !chess.isGameOver() &&
      !isThinking &&
      !settings.analysisMode &&
      !isAiVsAiPaused
    ) {
      timeoutId = window.setTimeout(() => {
        handleBotMove();
      }, 1000); // 1 second delay between moves
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    settings.mode,
    settings.analysisMode,
    chess,
    isThinking,
    handleBotMove,
    isAiVsAiPaused,
  ]);

  useEffect(() => {
    if (settings.mode !== "ai-vs-ai") {
      setIsAiVsAiPaused(false);
    }
  }, [settings.mode]);

  // Auto bot move for human vs AI
  useEffect(() => {
    let timeoutId: number;

    if (
      settings.mode === "human-vs-ai" &&
      !chess.isGameOver() &&
      !isThinking &&
      !isPlayerTurn() &&
      !settings.analysisMode
    ) {
      timeoutId = window.setTimeout(() => {
        handleBotMove();
      }, 500); // 0.5 second delay for bot response
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    settings.mode,
    settings.analysisMode,
    chess,
    isThinking,
    isPlayerTurn,
    handleBotMove,
  ]);

  useEffect(() => {
    if (!shouldRenderArrows) {
      setAnalysisArrows([]);
      setWdlArrowScores([]);
    }
  }, [shouldRenderArrows]);

  useEffect(() => {
    if (!analysis) return;
    if (lastTrendFenRef.current === currentFen) return;

    const percent = getEvaluationBarPercent(
      analysis.evaluation,
      analysis.mate,
      analysis.winChance,
    );
    lastTrendFenRef.current = currentFen;
    setEvaluationTrend((prev) => [...prev.slice(-39), percent]);
  }, [analysis, currentFen]);

  // Keep evaluation bar alive in every mode with silent background analysis.
  useEffect(() => {
    if (!settings.autoAnalysis && !settings.analysisMode) {
      clearAnalysisSchedule();
      return;
    }

    if (!chess.isGameOver()) {
      const delay = settings.analysisMode
        ? 160
        : settings.mode === "ai-vs-ai"
          ? 120
          : 220;
      scheduleAnalysis(delay, { silent: true });
    } else {
      clearAnalysisSchedule();
    }
  }, [
    chess,
    settings.analysisMode,
    settings.autoAnalysis,
    settings.mode,
    currentFen,
    scheduleAnalysis,
    clearAnalysisSchedule,
  ]);

  useEffect(
    () => () => {
      clearAnalysisSchedule();
    },
    [clearAnalysisSchedule],
  );

  return {
    chess,
    gameState,
    selectedSquare,
    availableMoves,
    settings,
    gameStatus: getGameStatus(),
    isThinking,
    analysis,
    engineInsights,
    moveHistory,
    analysisArrows,
    wdlArrowScores,
    evaluationTrend,
    analysisTimeline,
    liveAnalysisSeries,
    loadedPgnResult,
    hintMove,
    isAiVsAiPaused,
    engineNotice,
    currentOpening,
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
    // Replay
    replayIndex,
    replayFen,
    isReplaying: replayIndex !== null,
    handleReplayGoto,
    handleReplayExit,
    handleReplayFirst,
    handleReplayLast,
    handleReplayPrev,
    handleReplayNext,
  };
};
