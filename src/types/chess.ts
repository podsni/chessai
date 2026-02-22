import { Chess, Square } from "chess.js";

export type GameMode = "human-vs-ai" | "ai-vs-ai" | "human-vs-human";
export type BoardOrientation = "white" | "black";
export type PlayerColor = "white" | "black";
export type AIEngine = "stockfish-online" | "chess-api";

export interface GameSettings {
  mode: GameMode;
  boardOrientation: BoardOrientation;
  humanColor: PlayerColor; // Human player color
  aiColor: PlayerColor; // AI color
  aiDepth: number;
  aiEngine: AIEngine;
  battleEnabled: boolean;
  battleOpponentEngine: AIEngine;
  showAnalysisArrows: boolean;
  autoAnalysis: boolean;
  analysisMode: boolean;
}

export interface GameState {
  chess: Chess;
  fen: string;
  gameOver: boolean;
  winner: string | null;
  lastMove: string | null;
}

export interface AnalysisArrow {
  from: Square;
  to: Square;
  color: string;
}

export interface StockfishResponse {
  success: boolean;
  evaluation?: number;
  mate?: number;
  bestmove?: string;
  continuation?: string;
}

export interface AnalysisData {
  evaluation: number | null;
  mate: number | null;
  bestMove: string | null;
  arrows: AnalysisArrow[];
  pv: string[];
}

export interface PersistedGameState {
  fen: string;
  pgn: string;
  moveHistory: string[];
  settings: GameSettings;
  lastMove: string | null;
}
