import { useState, useEffect, useCallback } from "react";
import { Chess } from "chess.js";
import { ChessBot } from "./ChessBot";
import type { GameSettings, PersistedGameState } from "../types/chess";

interface ChessTab {
  id: string;
  name: string;
  gameState: PersistedGameState;
  timestamp: number;
}

export function TabSystem() {
  const [tabs, setTabs] = useState<ChessTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tabId: string;
  } | null>(null);
  const TABS_STORAGE_KEY = "chessbot-tabs";

  // Save tabs to localStorage whenever tabs change
  useEffect(() => {
    if (tabs.length > 0) {
      try {
        localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
      } catch (error) {
        console.error("Error saving tabs:", error);
      }
    }
  }, [tabs]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };

    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("click", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [contextMenu]);

  const generateTabId = useCallback(() => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }, []);

  const createNewTab = useCallback(() => {
    const newId = generateTabId();
    const chess = new Chess();
    const defaultSettings: GameSettings = {
      mode: "human-vs-ai",
      boardOrientation: "white",
      humanColor: "white",
      aiColor: "black",
      aiDepth: 10,
      showAnalysisArrows: true,
      autoAnalysis: false,
      analysisMode: false,
    };
    const newTab: ChessTab = {
      id: newId,
      name: "",
      gameState: {
        fen: chess.fen(),
        pgn: chess.pgn(),
        moveHistory: [],
        settings: defaultSettings,
        lastMove: null,
      },
      timestamp: Date.now(),
    };

    setTabs((prev) => [
      ...prev,
      {
        ...newTab,
        name: `Game ${prev.length + 1}`,
      },
    ]);
    setActiveTabId(newId);
  }, [generateTabId]);

  // Load tabs from localStorage on mount
  useEffect(() => {
    try {
      const savedTabs = localStorage.getItem(TABS_STORAGE_KEY);
      if (savedTabs) {
        const parsedTabs = JSON.parse(savedTabs) as ChessTab[];
        setTabs(parsedTabs);
        if (parsedTabs.length > 0) {
          setActiveTabId(parsedTabs[0].id);
        }
      } else {
        // Create initial tab
        createNewTab();
      }
    } catch (error) {
      console.error("Error loading tabs:", error);
      createNewTab();
    }
  }, [createNewTab]);

  const closeTab = useCallback(
    (tabId: string, forceClose = false) => {
      // Show confirmation for unsaved changes (you can implement this logic)
      if (!forceClose && tabs.length > 1) {
        const confirmed = window.confirm(
          "Are you sure you want to close this tab?",
        );
        if (!confirmed) return;
      }

      setTabs((prev) => {
        const filtered = prev.filter((tab) => tab.id !== tabId);

        // If closing active tab, switch to another tab
        if (tabId === activeTabId) {
          if (filtered.length > 0) {
            setActiveTabId(filtered[0].id);
          } else {
            // If no tabs left, create a new one
            setTimeout(createNewTab, 0);
          }
        }

        return filtered;
      });
    },
    [activeTabId, createNewTab, tabs.length],
  );

  const closeAllTabs = useCallback(() => {
    const confirmed = window.confirm(
      "Are you sure you want to close all tabs? This will create a new game.",
    );
    if (confirmed) {
      setTabs([]);
      setTimeout(createNewTab, 0);
    }
  }, [createNewTab]);

  const closeOtherTabs = useCallback((keepTabId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to close all other tabs?",
    );
    if (confirmed) {
      setTabs((prev) => prev.filter((tab) => tab.id === keepTabId));
      setActiveTabId(keepTabId);
    }
  }, []);

  const renameTab = useCallback((tabId: string, newName: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, name: newName } : tab)),
    );
  }, []);

  const updateTabGameState = useCallback(
    (tabId: string, gameState: Partial<ChessTab["gameState"]>) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId
            ? {
                ...tab,
                gameState: { ...tab.gameState, ...gameState },
                timestamp: Date.now(),
              }
            : tab,
        ),
      );
    },
    [],
  );

  // Keyboard shortcuts for tab management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+W to close current tab
      if (e.ctrlKey && e.key === "w" && tabs.length > 1) {
        e.preventDefault();
        closeTab(activeTabId);
      }
      // Ctrl+Shift+W to close all tabs
      else if (e.ctrlKey && e.shiftKey && e.key === "W" && tabs.length > 1) {
        e.preventDefault();
        closeAllTabs();
      }
      // Ctrl+T to create new tab
      else if (e.ctrlKey && e.key === "t") {
        e.preventDefault();
        createNewTab();
      }
      // Ctrl+Tab to switch to next tab
      else if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTabId(tabs[nextIndex].id);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeTabId, tabs, closeTab, closeAllTabs, createNewTab]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Tab Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-2 md:px-4 py-2 shadow-lg">
        <div className="flex items-center gap-1 md:gap-2 overflow-x-auto tab-container scrollbar-hide">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`tab-item relative flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-2 rounded-t-lg cursor-pointer group min-w-fit whitespace-nowrap touch-manipulation ${
                tab.id === activeTabId
                  ? "tab-item active bg-gray-700 text-white border-b-2 border-blue-500 shadow-md"
                  : "bg-gray-600 text-gray-300 hover:bg-gray-500"
              }`}
              onClick={() => setActiveTabId(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  tabId: tab.id,
                });
              }}
              style={{ minWidth: "80px", maxWidth: "160px" }}
            >
              <span className="text-xs md:text-sm font-medium truncate flex-1">
                {tab.name}
              </span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="tab-close-button text-gray-400 hover:text-red-400 transition-all duration-200 p-1 rounded-full hover:bg-red-500/20 touch-manipulation ml-1"
                  title="Close tab"
                >
                  <svg
                    className="w-3 h-3 md:w-4 md:h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}

              {/* Always visible close option for active tab on mobile */}
              {tabs.length > 1 && tab.id === activeTabId && (
                <div className="md:hidden absolute -top-1 -right-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs touch-manipulation shadow-lg"
                    title="Close tab"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* New Tab Button */}
          <button
            onClick={createNewTab}
            className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-lg transition-colors ml-1 md:ml-2 touch-manipulation shadow-md hover:shadow-lg"
            title="New tab"
          >
            <svg
              className="w-4 h-4 md:w-5 md:h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Close All Tabs Button (only show if more than 1 tab) */}
          {tabs.length > 1 && (
            <button
              onClick={closeAllTabs}
              className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors ml-1 touch-manipulation shadow-md hover:shadow-lg"
              title="Close all tabs"
            >
              <svg
                className="w-4 h-4 md:w-5 md:h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Mobile Tab Indicator */}
        <div className="md:hidden mt-2 flex justify-center">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <div
                key={`indicator-${tab.id}`}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  tab.id === activeTabId ? "bg-blue-500" : "bg-gray-600"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab && (
          <div className="fade-in">
            <ChessBot
              key={activeTab.id}
              tabId={activeTab.id}
              tabName={activeTab.name}
              initialGameState={activeTab.gameState}
              onGameStateChange={(gameState) =>
                updateTabGameState(activeTab.id, gameState)
              }
              onRename={(newName) => renameTab(activeTab.id, newName)}
            />
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-2 z-50 min-w-[180px]"
          style={{
            left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px`,
            top: `${Math.min(contextMenu.y, window.innerHeight - 150)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              closeTab(contextMenu.tabId, true);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <span className="text-red-400">✕</span>
            Close Tab
          </button>

          {tabs.length > 1 && (
            <button
              onClick={() => {
                closeOtherTabs(contextMenu.tabId);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
            >
              <span className="text-orange-400">⚡</span>
              Close Other Tabs
            </button>
          )}

          {tabs.length > 1 && (
            <button
              onClick={() => {
                closeAllTabs();
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
            >
              <span className="text-red-500">🗑️</span>
              Close All Tabs
            </button>
          )}

          <hr className="border-gray-600 my-1" />

          <button
            onClick={() => {
              const newName = prompt(
                "Enter new tab name:",
                tabs.find((t) => t.id === contextMenu.tabId)?.name,
              );
              if (newName && newName.trim()) {
                renameTab(contextMenu.tabId, newName.trim());
              }
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <span className="text-blue-400">✏️</span>
            Rename Tab
          </button>
        </div>
      )}
    </div>
  );
}
