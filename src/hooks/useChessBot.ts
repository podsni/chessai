import { useState, useCallback, useEffect } from "react";
import { Chess, Square } from "chess.js";
import { StockfishAPI } from "../services/stockfishApi";
import { soundManager } from "../services/soundManager";
import { hapticManager } from "../services/hapticManager";
import { gameStorage } from "../services/gameStorage";
import type { PGNGameInfo } from "../services/pgnParser";
import type {
  GameState,
  StockfishResponse,
  GameSettings,
  AnalysisArrow,
  PersistedGameState,
} from "../types/chess";

const stockfishApi = new StockfishAPI();

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

  const [gameState, setGameState] = useState<GameState>({
    chess: chess,
    fen: chess.fen(),
    gameOver: chess.isGameOver(),
    winner: null,
    lastMove: initialGameState?.lastMove || null,
  });

  const [settings, setSettings] = useState<GameSettings>(() => {
    if (initialGameState?.settings) {
      return initialGameState.settings;
    }
    const savedSettings = gameStorage.getSettings();
    return {
      mode: "human-vs-ai",
      boardOrientation: savedSettings.boardOrientation,
      humanColor: "white", // Default: human plays white
      aiColor: "black", // Default: AI plays black
      aiDepth: savedSettings.aiDepth,
      showAnalysisArrows: savedSettings.showAnalysisArrows,
      autoAnalysis: savedSettings.autoAnalysis,
      analysisMode: false,
    };
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
        console.log("Created analysis arrows:", arrows); // Debug log
      } else {
        console.log("Failed to parse move:", bestMove); // Debug log
      }
    },
    [settings.showAnalysisArrows, parseMove],
  );

  const handleAnalyzePosition = useCallback(async () => {
    setIsThinking(true);
    try {
      const analysisResult = await stockfishApi.getAnalysis(
        chess.fen(),
        settings.aiDepth,
      );
      console.log("Analysis result:", analysisResult); // Debug log

      setAnalysis(analysisResult);

      if (analysisResult?.bestmove) {
        const cleanMove = stockfishApi.extractMoveFromString(
          analysisResult.bestmove,
        );
        console.log("Extracted best move for arrows:", cleanMove); // Debug log
        createAnalysisArrows(cleanMove);
      }
    } catch (error) {
      console.error("Error analyzing position:", error);
    } finally {
      setIsThinking(false);
    }
  }, [chess, settings.aiDepth, createAnalysisArrows]);

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

          console.log("Move successful:", move.san);
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
      console.log(
        "Square click handler:",
        square,
        "Game over:",
        chess.isGameOver(),
        "Analysis mode:",
        settings.analysisMode,
      );

      if (chess.isGameOver() && !settings.analysisMode) return;
      if (!isPlayerTurn() && !settings.analysisMode) return;

      const piece = chess.get(square);
      console.log(
        "Piece at square:",
        piece,
        "Selected square:",
        selectedSquare,
      );

      // If clicking the same square, deselect
      if (selectedSquare === square) {
        console.log("Deselecting same square");
        clearSelection();
        return;
      }

      // If we have a selected square and this is a valid move
      if (selectedSquare && availableMoves.includes(square)) {
        console.log("Attempting move from", selectedSquare, "to", square);
        const moveSuccessful = makeMove(selectedSquare, square);
        if (moveSuccessful) {
          console.log("Move successful, clearing selection");
          clearSelection();
        } else {
          console.log("Move failed");
        }
      }
      // If clicking on a piece (more permissive for mobile)
      else if (piece) {
        // In analysis mode, allow any piece
        // In normal mode, allow current player's pieces
        const canSelectPiece =
          settings.analysisMode || piece.color === chess.turn();

        if (canSelectPiece) {
          console.log("Selecting piece:", piece, "at", square);
          setSelectedSquare(square);
          const moves = chess.moves({
            square: square,
            verbose: true,
          });
          const moveSquares = moves.map((move) => move.to as Square);
          console.log("Available moves:", moveSquares);
          setAvailableMoves(moveSquares);
        } else {
          console.log("Cannot select piece - wrong color or not allowed");
          clearSelection();
        }
      }
      // Otherwise, clear selection
      else {
        console.log("Clicking empty square, clearing selection");
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
      console.log("Handling piece drop from", sourceSquare, "to", targetSquare);
      console.log(
        "Game state - Game over:",
        chess.isGameOver(),
        "Analysis mode:",
        settings.analysisMode,
        "Player turn:",
        isPlayerTurn(),
      );

      if (chess.isGameOver() && !settings.analysisMode) {
        console.log("Game over and not in analysis mode, blocking move");
        return false;
      }

      if (!isPlayerTurn() && !settings.analysisMode) {
        console.log("Not player turn and not in analysis mode, blocking move");
        return false;
      }

      // Validate the move is legal
      const piece = chess.get(sourceSquare);
      if (!piece) {
        console.log("No piece at source square");
        return false;
      }

      // In normal mode, check if it's the right player's piece
      if (!settings.analysisMode && piece.color !== chess.turn()) {
        console.log(
          "Wrong player piece - piece color:",
          piece.color,
          "current turn:",
          chess.turn(),
        );
        return false;
      }

      // Try to make the move
      const moveSuccessful = makeMove(sourceSquare, targetSquare);
      console.log("Move result:", moveSuccessful);

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
      const bestMove = await stockfishApi.getBestMove(
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
            const analysisResult = await stockfishApi.getAnalysis(
              chess.fen(),
              settings.aiDepth,
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
  ]);

  const handleGetHint = useCallback(async () => {
    setIsThinking(true);
    try {
      const analysisResult = await stockfishApi.getAnalysis(
        chess.fen(),
        settings.aiDepth,
      );
      console.log("Hint analysis result:", analysisResult); // Debug log

      if (analysisResult?.bestmove) {
        const cleanMove = stockfishApi.extractMoveFromString(
          analysisResult.bestmove,
        );
        console.log("Extracted hint move:", cleanMove); // Debug log

        setHintMove(cleanMove);
        setAnalysis(analysisResult);
        createAnalysisArrows(cleanMove);
      }
    } catch (error) {
      console.error("Error getting hint:", error);
    } finally {
      setIsThinking(false);
    }
  }, [chess, settings.aiDepth, createAnalysisArrows]);

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

        console.log(
          "PGN loaded successfully:",
          gameInfo.headers.Event || "Unknown Game",
        );
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
