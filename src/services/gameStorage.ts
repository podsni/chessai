import type { PersistedGameState } from "../types/chess";

interface SavedGame {
  id: string;
  name: string;
  fen: string;
  pgn: string;
  timestamp: number;
  moveCount: number;
  lastMove: string | null;
  gameMode: string;
  evaluation?: number;
}

interface GameSettings {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  theme: "light" | "dark";
  boardOrientation: "white" | "black";
  humanColor: "white" | "black";
  aiColor: "white" | "black";
  aiEngine: "stockfish-online" | "chess-api";
  battleEnabled: boolean;
  battleOpponentEngine: "stockfish-online" | "chess-api";
  showAnalysisArrows: boolean;
  autoAnalysis: boolean;
  aiDepth: number;
}

class GameStorage {
  private readonly GAMES_KEY = "chessbot-saved-games";
  private readonly SETTINGS_KEY = "chessbot-settings";
  private readonly MAX_SAVED_GAMES = 50;

  // Game saving/loading
  saveGame(game: Omit<SavedGame, "id" | "timestamp">): string {
    try {
      const gameId = this.generateId();
      const savedGame: SavedGame = {
        ...game,
        id: gameId,
        timestamp: Date.now(),
      };

      const savedGames = this.getSavedGames();
      savedGames.unshift(savedGame);

      // Keep only the most recent games
      if (savedGames.length > this.MAX_SAVED_GAMES) {
        savedGames.splice(this.MAX_SAVED_GAMES);
      }

      localStorage.setItem(this.GAMES_KEY, JSON.stringify(savedGames));
      return gameId;
    } catch (error) {
      console.error("Error saving game:", error);
      throw new Error("Failed to save game");
    }
  }

  loadGame(gameId: string): SavedGame | null {
    try {
      const savedGames = this.getSavedGames();
      return savedGames.find((game) => game.id === gameId) || null;
    } catch (error) {
      console.error("Error loading game:", error);
      return null;
    }
  }

  getSavedGames(): SavedGame[] {
    try {
      const gamesJson = localStorage.getItem(this.GAMES_KEY);
      return gamesJson ? JSON.parse(gamesJson) : [];
    } catch (error) {
      console.error("Error getting saved games:", error);
      return [];
    }
  }

  deleteGame(gameId: string): boolean {
    try {
      const savedGames = this.getSavedGames();
      const filteredGames = savedGames.filter((game) => game.id !== gameId);
      localStorage.setItem(this.GAMES_KEY, JSON.stringify(filteredGames));
      return true;
    } catch (error) {
      console.error("Error deleting game:", error);
      return false;
    }
  }

  clearAllGames(): void {
    try {
      localStorage.removeItem(this.GAMES_KEY);
    } catch (error) {
      console.error("Error clearing games:", error);
    }
  }

  // Settings management
  saveSettings(settings: Partial<GameSettings>): void {
    try {
      const currentSettings = this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  }

  getSettings(): GameSettings {
    try {
      const settingsJson = localStorage.getItem(this.SETTINGS_KEY);
      const defaultSettings: GameSettings = {
        soundEnabled: true,
        hapticEnabled: true,
        theme: "dark",
        boardOrientation: "white",
        humanColor: "white",
        aiColor: "black",
        aiEngine: "stockfish-online",
        battleEnabled: false,
        battleOpponentEngine: "chess-api",
        showAnalysisArrows: true,
        autoAnalysis: false,
        aiDepth: 10,
      };

      return settingsJson
        ? { ...defaultSettings, ...JSON.parse(settingsJson) }
        : defaultSettings;
    } catch (error) {
      console.error("Error getting settings:", error);
      return {
        soundEnabled: true,
        hapticEnabled: true,
        theme: "dark",
        boardOrientation: "white",
        humanColor: "white",
        aiColor: "black",
        aiEngine: "stockfish-online",
        battleEnabled: false,
        battleOpponentEngine: "chess-api",
        showAnalysisArrows: true,
        autoAnalysis: false,
        aiDepth: 10,
      };
    }
  }

  // Auto-save current game
  autoSaveCurrentGame(
    fen: string,
    pgn: string,
    moveCount: number,
    lastMove: string | null,
  ): void {
    try {
      const autoSaveGame = {
        name: "Auto-saved Game",
        fen,
        pgn,
        moveCount,
        lastMove,
        gameMode: "auto-save",
      };

      localStorage.setItem(
        "chessbot-auto-save",
        JSON.stringify({
          ...autoSaveGame,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      console.error("Error auto-saving game:", error);
    }
  }

  // Save complete tab state
  saveTabState(tabId: string, gameState: PersistedGameState): void {
    try {
      const key = `chessbot-tab-${tabId}`;
      localStorage.setItem(
        key,
        JSON.stringify({
          ...gameState,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      console.error("Error saving tab state:", error);
    }
  }

  // Load tab state
  loadTabState(tabId: string): PersistedGameState | null {
    try {
      const key = `chessbot-tab-${tabId}`;
      const stateJson = localStorage.getItem(key);
      return stateJson ? JSON.parse(stateJson) : null;
    } catch (error) {
      console.error("Error loading tab state:", error);
      return null;
    }
  }

  // Clear tab state
  clearTabState(tabId: string): void {
    try {
      const key = `chessbot-tab-${tabId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Error clearing tab state:", error);
    }
  }

  getAutoSavedGame(): SavedGame | null {
    try {
      const autoSaveJson = localStorage.getItem("chessbot-auto-save");
      return autoSaveJson ? JSON.parse(autoSaveJson) : null;
    } catch (error) {
      console.error("Error getting auto-saved game:", error);
      return null;
    }
  }

  clearAutoSave(): void {
    try {
      localStorage.removeItem("chessbot-auto-save");
    } catch (error) {
      console.error("Error clearing auto-save:", error);
    }
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Export/Import functionality
  exportGames(): string {
    const games = this.getSavedGames();
    const settings = this.getSettings();

    return JSON.stringify(
      {
        games,
        settings,
        exportDate: Date.now(),
        version: "1.0",
      },
      null,
      2,
    );
  }

  importGames(jsonData: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonData);

      if (data.games && Array.isArray(data.games)) {
        localStorage.setItem(this.GAMES_KEY, JSON.stringify(data.games));
      }

      if (data.settings) {
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(data.settings));
      }

      return { success: true, message: "Games imported successfully" };
    } catch (error) {
      console.error("Error importing games:", error);
      return { success: false, message: "Invalid import data" };
    }
  }

  // Storage space management
  getStorageInfo(): { used: number; available: number; percentage: number } {
    try {
      const totalSize = JSON.stringify(localStorage).length;
      const availableSize = 5 * 1024 * 1024; // Roughly 5MB limit for localStorage

      return {
        used: totalSize,
        available: availableSize - totalSize,
        percentage: (totalSize / availableSize) * 100,
      };
    } catch {
      return { used: 0, available: 0, percentage: 0 };
    }
  }
}

export const gameStorage = new GameStorage();
export type { SavedGame, GameSettings };
