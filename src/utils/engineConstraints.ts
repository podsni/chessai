import type { AIEngine, GameSettings } from "../types/chess";

export const ENGINE_MAX_DEPTH: Record<AIEngine, number> = {
  "stockfish-online": 15,
  "chess-api": 18,
};

export const getEngineMaxDepth = (engine: AIEngine): number =>
  ENGINE_MAX_DEPTH[engine];

const getMinDepthForEngines = (engines: AIEngine[]): number =>
  Math.min(...engines.map(getEngineMaxDepth));

export const getAiMoveDepthLimit = (settings: GameSettings): number => {
  if (settings.mode === "ai-vs-ai") {
    return getMinDepthForEngines([
      settings.aiEngine,
      settings.battleOpponentEngine,
    ]);
  }
  return getEngineMaxDepth(settings.aiEngine);
};

export const getAnalysisDepthLimit = (settings: GameSettings): number => {
  if (settings.analysisEngineMode === "single") {
    return getEngineMaxDepth(settings.aiEngine);
  }
  return getMinDepthForEngines(["stockfish-online", "chess-api"]);
};

export const getUiDepthLimit = (settings: GameSettings): number =>
  settings.analysisMode
    ? getAnalysisDepthLimit(settings)
    : getAiMoveDepthLimit(settings);
