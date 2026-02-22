import { useState, useCallback, useEffect } from "react";
import { Chess, Square } from "chess.js";
import { useQueryClient } from "@tanstack/react-query";
import { StockfishAPI } from "../services/stockfishApi";
import { ChessApiEngine } from "../services/chessApiEngine";
import { soundManager } from "../services/soundManager";
import { hapticManager } from "../services/hapticManager";
import { gameStorage } from "../services/gameStorage";
import type { PGNGameInfo } from "../services/pgnParser";
import type {
  AIEngine,
  GameState,
  StockfishResponse,
  GameSettings,
  AnalysisArrow,
  PersistedGameState,
} from "../types/chess";

const stockfishApi = new StockfishAPI();
const chessApiEngine = new ChessApiEngine();

const engineClients = {
  "stockfish-online": stockfishApi,
  "chess-api": chessApiEngine,
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
      battleEnabled: savedSettings.battleEnabled || false,
      battleOpponentEngine: savedSettings.battleOpponentEngine || "chess-api",
      showAnalysisArrows: savedSettings.showAnalysisArrows,
      autoAnalysis: savedSettings.autoAnalysis,
      analysisMode: false,
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
  const currentFen = chess.fen();
  const currentPgn = chess.pgn();

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

  const createAnalysisArrows = useCallback(
    (bestMove: string | null) => {
      if (!bestMove || !settings.showAnalysisArrows) {
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
    [settings.showAnalysisArrows, parseMove],
  );

  const getAnalysisCached = useCallback(
    async (fen: string, depth: number, engine: AIEngine) =>
      queryClient.fetchQuery({
        queryKey: ["engine-analysis", engine, fen, depth],
        queryFn: () => engineClients[engine].getAnalysis(fen, depth),
      }),
    [queryClient],
  );

  const getEngineForCurrentTurn = useCallback((): AIEngine => {
    if (settings.mode !== "ai-vs-ai" || !settings.battleEnabled) {
      return settings.aiEngine;
    }
    return chess.turn() === "w"
      ? settings.aiEngine
      : settings.battleOpponentEngine;
  }, [
    settings.mode,
    settings.battleEnabled,
    settings.aiEngine,
    settings.battleOpponentEngine,
    chess,
  ]);

  const handleAnalyzePosition = useCallback(async () => {
    setIsThinking(true);
    try {
      const analysisResult = await getAnalysisCached(
        chess.fen(),
        settings.aiDepth,
        getEngineForCurrentTurn(),
      );

      setAnalysis(analysisResult);

      if (analysisResult?.bestmove) {
        const cleanMove = engineClients[
          getEngineForCurrentTurn()
        ].extractMoveFromString(analysisResult.bestmove);
        createAnalysisArrows(cleanMove);
      }
    } catch (error) {
      console.error("Error analyzing position:", error);
    } finally {
      setIsThinking(false);
    }
  }, [
    chess,
    settings.aiDepth,
    createAnalysisArrows,
    getAnalysisCached,
    getEngineForCurrentTurn,
  ]);

  const makeMove = useCallback(
    (from: Square, to: Square) => {
      try {
        const move = chess.move({
          from: from,
          to: to,
          promotion: "q", // Always promote to queen for simplicity
        });

        if (move) {
          const newMoveHistory = [...moveHistory, move.san];
          setMoveHistory(newMoveHistory);
          updateGameState();
          setHintMove(null); // Clear hint after move

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

          // Auto-analyze if enabled
          if (settings.autoAnalysis || settings.analysisMode) {
            setTimeout(() => handleAnalyzePosition(), 100);
          }
          return true;
        }
      } catch (error) {
        console.error("Invalid move:", error);
        soundManager.playError();
        hapticManager.errorPattern();
      }

      return false;
    },
    [chess, moveHistory, settings, updateGameState, handleAnalyzePosition],
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
      const activeEngine = getEngineForCurrentTurn();
      const bestMove = await engineClients[activeEngine].getBestMove(
        chess.fen(),
        settings.aiDepth,
      );

      if (bestMove) {
        const move = chess.move(bestMove);
        if (move) {
          const newMoveHistory = [...moveHistory, move.san];
          setMoveHistory(newMoveHistory);
          updateGameState();

          // Update analysis with bot move
          if (settings.autoAnalysis || settings.analysisMode) {
            const analysisResult = await getAnalysisCached(
              chess.fen(),
              settings.aiDepth,
              activeEngine,
            );
            setAnalysis(analysisResult);
            createAnalysisArrows(analysisResult?.bestmove || null);
          }
        }
      }
    } catch (error) {
      console.error("Error getting bot move:", error);
    } finally {
      setIsThinking(false);
    }
  }, [
    chess,
    moveHistory,
    settings.aiDepth,
    settings.autoAnalysis,
    settings.analysisMode,
    updateGameState,
    createAnalysisArrows,
    getAnalysisCached,
    getEngineForCurrentTurn,
  ]);

  const handleGetHint = useCallback(async () => {
    setIsThinking(true);
    try {
      const analysisResult = await getAnalysisCached(
        chess.fen(),
        settings.aiDepth,
        getEngineForCurrentTurn(),
      );

      if (analysisResult?.bestmove) {
        const cleanMove = engineClients[
          getEngineForCurrentTurn()
        ].extractMoveFromString(analysisResult.bestmove);

        setHintMove(cleanMove);
        setAnalysis(analysisResult);
        createAnalysisArrows(cleanMove);
      }
    } catch (error) {
      console.error("Error getting hint:", error);
    } finally {
      setIsThinking(false);
    }
  }, [
    chess,
    settings.aiDepth,
    createAnalysisArrows,
    getAnalysisCached,
    getEngineForCurrentTurn,
  ]);

  const handleNewGame = useCallback(() => {
    chess.reset();
    setMoveHistory([]);
    setAnalysis(null);
    setAnalysisArrows([]);
    setHintMove(null);
    clearSelection();
    updateGameState();
  }, [chess, clearSelection, updateGameState]);

  const handleStartAsWhite = useCallback(() => {
    chess.reset();
    setMoveHistory([]);
    setAnalysis(null);
    setAnalysisArrows([]);
    setHintMove(null);
    clearSelection();
    setSettings((prev) => ({
      ...prev,
      humanColor: "white",
      aiColor: "black",
      boardOrientation: "white", // Set board orientation to match human color
    }));
    updateGameState();
  }, [chess, clearSelection, updateGameState]);

  const handleStartAsBlack = useCallback(() => {
    chess.reset();
    setMoveHistory([]);
    setAnalysis(null);
    setAnalysisArrows([]);
    setHintMove(null);
    clearSelection();
    setSettings((prev) => ({
      ...prev,
      humanColor: "black",
      aiColor: "white",
      boardOrientation: "black", // Set board orientation to match human color
    }));
    updateGameState();

    // If playing as black in human vs AI, let AI (white) make first move
    if (settings.mode === "human-vs-ai") {
      setTimeout(() => handleBotMove(), 500);
    }
  }, [chess, clearSelection, updateGameState, settings.mode, handleBotMove]);

  const handleUndo = useCallback(() => {
    const move = chess.undo();
    if (move) {
      setMoveHistory((prev) => prev.slice(0, -1));
      setAnalysis(null);
      setAnalysisArrows([]);
      setHintMove(null);
      clearSelection();
      updateGameState();
    }
  }, [chess, clearSelection, updateGameState]);

  const handleLoadFen = useCallback(
    (fen: string) => {
      try {
        chess.load(fen);
        setMoveHistory([]);
        setAnalysis(null);
        setAnalysisArrows([]);
        setHintMove(null);
        clearSelection();
        updateGameState();
      } catch (error) {
        console.error("Invalid FEN:", error);
      }
    },
    [chess, clearSelection, updateGameState],
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
      setSettings((prev) => ({ ...prev, ...newSettings }));

      // Clear arrows if analysis arrows are disabled
      if (newSettings.showAnalysisArrows === false) {
        setAnalysisArrows([]);
      }

      // Auto-analyze if analysis mode is enabled
      if (newSettings.analysisMode === true && !isThinking) {
        setTimeout(() => handleAnalyzePosition(), 100);
      }
    },
    [isThinking, handleAnalyzePosition],
  );

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
        // Load the position from the provided chess instance
        chess.load(newChess.fen());

        // Create move history from the game moves
        const moveHistory = gameInfo.moves.map((move, index) => {
          // Try to apply the move to get the SAN notation
          const tempChess = new Chess();
          for (let i = 0; i <= index; i++) {
            try {
              const moveResult = tempChess.move(gameInfo.moves[i]);
              if (i === index && moveResult) {
                return moveResult.san;
              }
            } catch {
              // If move fails, just use the original notation
              return gameInfo.moves[i];
            }
          }
          return move;
        });

        setMoveHistory(moveHistory);
        setAnalysis(null);
        setAnalysisArrows([]);
        setHintMove(null);
        clearSelection();
        updateGameState();

        // Auto-analyze the loaded position if analysis mode is on
        if (settings.autoAnalysis || settings.analysisMode) {
          setTimeout(() => handleAnalyzePosition(), 100);
        }

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
      chess,
      clearSelection,
      updateGameState,
      settings.autoAnalysis,
      settings.analysisMode,
      handleAnalyzePosition,
    ],
  );

  // AI vs AI game loop
  useEffect(() => {
    let timeoutId: number;

    if (
      settings.mode === "ai-vs-ai" &&
      !chess.isGameOver() &&
      !isThinking &&
      !settings.analysisMode
    ) {
      timeoutId = window.setTimeout(() => {
        handleBotMove();
      }, 1000); // 1 second delay between moves
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [settings.mode, settings.analysisMode, chess, isThinking, handleBotMove]);

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

  // Auto-analyze in analysis mode
  useEffect(() => {
    if (settings.analysisMode && settings.autoAnalysis && !isThinking) {
      const timeoutId = setTimeout(() => {
        handleAnalyzePosition();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [
    settings.analysisMode,
    settings.autoAnalysis,
    currentFen,
    isThinking,
    handleAnalyzePosition,
  ]);

  return {
    chess,
    gameState,
    selectedSquare,
    availableMoves,
    settings,
    gameStatus: getGameStatus(),
    isThinking,
    analysis,
    moveHistory,
    analysisArrows,
    hintMove,
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
  };
};
