import { Chess } from "chess.js";
import { create } from "zustand";
import type { GameSettings, PersistedGameState } from "../types/chess";

export interface ChessTab {
  id: string;
  name: string;
  gameState: PersistedGameState;
  timestamp: number;
}

interface TabsStore {
  tabs: ChessTab[];
  activeTabId: string;
  setActiveTabId: (tabId: string) => void;
  createNewTab: () => string;
  hydrateTabs: (tabs: ChessTab[]) => void;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (keepTabId: string) => void;
  closeAllTabs: () => void;
  renameTab: (tabId: string, newName: string) => void;
  updateTabGameState: (
    tabId: string,
    gameState: Partial<PersistedGameState>,
  ) => void;
  duplicateTab: (sourceTabId: string) => string | null;
}

const generateTabId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const defaultSettings: GameSettings = {
  mode: "human-vs-ai",
  boardOrientation: "white",
  humanColor: "white",
  aiColor: "black",
  aiDepth: 10,
  aiEngine: "stockfish-online",
  battleEnabled: false,
  battleOpponentEngine: "chess-api",
  showAnalysisArrows: true,
  autoAnalysis: false,
  analysisMode: false,
};

const createInitialGameState = (): PersistedGameState => {
  const chess = new Chess();
  return {
    fen: chess.fen(),
    pgn: chess.pgn(),
    moveHistory: [],
    settings: defaultSettings,
    lastMove: null,
  };
};

const cloneGameState = (gameState: PersistedGameState): PersistedGameState => ({
  fen: gameState.fen,
  pgn: gameState.pgn,
  moveHistory: [...gameState.moveHistory],
  settings: { ...gameState.settings },
  lastMove: gameState.lastMove,
});

const buildCopyName = (name: string): string => {
  const baseName = name.replace(/\s+Copy(?:\s+\d+)?$/i, "").trim();
  return `${baseName} Copy`;
};

const isSameGameState = (
  prev: PersistedGameState,
  next: PersistedGameState,
): boolean => {
  if (
    prev.fen !== next.fen ||
    prev.pgn !== next.pgn ||
    prev.lastMove !== next.lastMove
  ) {
    return false;
  }

  if (prev.moveHistory.length !== next.moveHistory.length) {
    return false;
  }

  for (let i = 0; i < prev.moveHistory.length; i += 1) {
    if (prev.moveHistory[i] !== next.moveHistory[i]) {
      return false;
    }
  }

  return JSON.stringify(prev.settings) === JSON.stringify(next.settings);
};

export const useTabsStore = create<TabsStore>((set, get) => ({
  tabs: [],
  activeTabId: "",

  setActiveTabId: (tabId) => set({ activeTabId: tabId }),

  createNewTab: () => {
    const newId = generateTabId();
    set((state) => ({
      tabs: [
        ...state.tabs,
        {
          id: newId,
          name: `Game ${state.tabs.length + 1}`,
          gameState: createInitialGameState(),
          timestamp: Date.now(),
        },
      ],
      activeTabId: newId,
    }));
    return newId;
  },

  hydrateTabs: (tabs) => {
    const safeTabs = Array.isArray(tabs) ? tabs : [];
    set({
      tabs: safeTabs,
      activeTabId: safeTabs[0]?.id || "",
    });
  },

  closeTab: (tabId) => {
    set((state) => {
      const filtered = state.tabs.filter((tab) => tab.id !== tabId);
      const isActive = state.activeTabId === tabId;
      return {
        tabs: filtered,
        activeTabId: isActive ? filtered[0]?.id || "" : state.activeTabId,
      };
    });
  },

  closeOtherTabs: (keepTabId) => {
    set((state) => ({
      tabs: state.tabs.filter((tab) => tab.id === keepTabId),
      activeTabId: keepTabId,
    }));
  },

  closeAllTabs: () => {
    set({ tabs: [], activeTabId: "" });
  },

  renameTab: (tabId, newName) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, name: newName } : tab,
      ),
    }));
  },

  updateTabGameState: (tabId, gameState) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? (() => {
              const merged = { ...tab.gameState, ...gameState };
              if (isSameGameState(tab.gameState, merged)) {
                return tab;
              }
              return {
                ...tab,
                gameState: merged,
                timestamp: Date.now(),
              };
            })()
          : tab,
      ),
    }));
  },

  duplicateTab: (sourceTabId) => {
    const sourceTab = get().tabs.find((tab) => tab.id === sourceTabId);
    if (!sourceTab) return null;

    const newId = generateTabId();
    set((state) => ({
      tabs: [
        ...state.tabs,
        {
          ...sourceTab,
          id: newId,
          name: buildCopyName(sourceTab.name),
          gameState: cloneGameState(sourceTab.gameState),
          timestamp: Date.now(),
        },
      ],
      activeTabId: newId,
    }));

    return newId;
  },
}));
