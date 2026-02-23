import { Chess, Square } from "chess.js";

export type GameMode = "human-vs-ai" | "ai-vs-ai" | "human-vs-human";
export type BoardOrientation = "white" | "black";
export type PlayerColor = "white" | "black";
export type AIEngine = "stockfish-online" | "chess-api";
export type AnalysisEngineMode = "single" | "safe" | "both";

export interface GameSettings {
  mode: GameMode;
  boardOrientation: BoardOrientation;
  humanColor: PlayerColor; // Human player color
  aiColor: PlayerColor; // AI color
  aiDepth: number;
  aiEngine: AIEngine;
  analysisEngineMode: AnalysisEngineMode;
  battleEnabled: boolean;
  battleOpponentEngine: AIEngine;
  showAnalysisArrows: boolean;
  wdlPolicyArrows: boolean;
  wdlShowAllArrowsDefault: boolean;
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

export interface WdlArrowScore {
  engine: AIEngine;
  move: string;
  rank: number;
  win: number;
  draw: number;
  loss: number;
  deltaLoss: number;
  quality: number;
  verdict: "best" | "safe" | "risky" | "blunder";
  color: string;
}

export type MoveQualityClass =
  | "brilliant"
  | "great"
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export interface LiveAnalysisPoint {
  timestamp: number;
  consensus: number;
  stockfish?: number;
  chessApi?: number;
  quality: MoveQualityClass;
}

export interface AnalysisTimelinePoint {
  fen: string;
  ply: number;
  moveNumber: number;
  consensusCp: number;
  stockfishCp?: number;
  chessApiCp?: number;
  deltaCp: number;
  confidence: number;
  wdlWin: number;
  wdlDraw: number;
  wdlLoss: number;
  quality: MoveQualityClass;
}

export interface StockfishResponse {
  success: boolean;
  evaluation?: number;
  mate?: number;
  winChance?: number;
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

export interface EngineInsight {
  engine: AIEngine;
  evaluation?: number;
  mate?: number;
  bestMove?: string;
  predictionLine: string[];
}

export interface PersistedGameState {
  fen: string;
  pgn: string;
  moveHistory: string[];
  settings: GameSettings;
  lastMove: string | null;
}
