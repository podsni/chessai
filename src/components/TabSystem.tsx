import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Pencil, Plus, Sparkles, Trash2, X, XCircle } from "lucide-react";
import { ChessBot } from "./ChessBot";
import { useTabsStore } from "../stores/useTabsStore";

export function TabSystem() {
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const setActiveTabId = useTabsStore((state) => state.setActiveTabId);
  const createNewTab = useTabsStore((state) => state.createNewTab);
  const hydrateTabs = useTabsStore((state) => state.hydrateTabs);
  const closeTabStore = useTabsStore((state) => state.closeTab);
  const closeOtherTabs = useTabsStore((state) => state.closeOtherTabs);
  const closeAllTabsStore = useTabsStore((state) => state.closeAllTabs);
  const renameTab = useTabsStore((state) => state.renameTab);
  const updateTabGameState = useTabsStore((state) => state.updateTabGameState);
  const duplicateTab = useTabsStore((state) => state.duplicateTab);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tabId: string;
  } | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);
  const TABS_STORAGE_KEY = "chessbot-tabs";
  const ACTIVE_TAB_KEY = "chessbot-active-tab";

  useEffect(() => {
    if (hydratedRef.current) return;
    try {
      const savedTabs = localStorage.getItem(TABS_STORAGE_KEY);
      const savedActiveTabId = localStorage.getItem(ACTIVE_TAB_KEY) ?? undefined;
      if (savedTabs) {
        hydrateTabs(JSON.parse(savedTabs), savedActiveTabId);
      } else {
        createNewTab();
      }
    } catch (error) {
      console.error("Error loading tabs:", error);
      createNewTab();
    } finally {
      hydratedRef.current = true;
    }
  }, [hydrateTabs, createNewTab]);

  useEffect(() => {
    if (!hydratedRef.current || tabs.length === 0) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
        if (activeTabId) {
          localStorage.setItem(ACTIVE_TAB_KEY, activeTabId);
        }
      } catch (error) {
        console.error("Error saving tabs:", error);
      }
    }, 120);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [tabs, activeTabId]);

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

  const closeTab = useCallback(
    (tabId: string, forceClose = false) => {
      if (!forceClose && tabs.length > 1) {
        const confirmed = window.confirm(
          "Are you sure you want to close this tab?",
        );
        if (!confirmed) return;
      }
      closeTabStore(tabId);
      if (tabs.length <= 1) {
        createNewTab();
      }
    },
    [tabs.length, closeTabStore, createNewTab],
  );

  const closeAllTabs = useCallback(() => {
    const confirmed = window.confirm(
      "Are you sure you want to close all tabs? This will create a new game.",
    );
    if (confirmed) {
      closeAllTabsStore();
      createNewTab();
    }
  }, [closeAllTabsStore, createNewTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "w" && tabs.length > 1) {
        e.preventDefault();
        closeTab(activeTabId);
      } else if (e.ctrlKey && e.shiftKey && e.key === "W" && tabs.length > 1) {
        e.preventDefault();
        closeAllTabs();
      } else if (e.ctrlKey && e.key === "t") {
        e.preventDefault();
        createNewTab();
      } else if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        if (tabs.length === 0) return;
        const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTabId(tabs[nextIndex].id);
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (activeTabId) {
          duplicateTab(activeTabId);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTabId,
    tabs,
    createNewTab,
    setActiveTabId,
    duplicateTab,
    closeTab,
    closeAllTabs,
  ]);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId),
    [tabs, activeTabId],
  );

  const handleActiveGameStateChange = useCallback(
    (gameState: Parameters<typeof updateTabGameState>[1]) => {
      if (activeTabId) {
        updateTabGameState(activeTabId, gameState);
      }
    },
    [activeTabId, updateTabGameState],
  );

  const handleActiveTabRename = useCallback(
    (newName: string) => {
      if (activeTabId) {
        renameTab(activeTabId, newName);
      }
    },
    [activeTabId, renameTab],
  );

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-700/80 px-2 md:px-4 py-2 shadow-lg">
        <div className="flex items-center gap-1 md:gap-2 overflow-x-auto tab-container scrollbar-hide pb-1">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`tab-item relative flex items-center gap-1.5 px-2.5 md:px-3 py-2 rounded-xl cursor-pointer group min-w-[92px] max-w-[148px] whitespace-nowrap touch-manipulation transition-all duration-150 ${
                tab.id === activeTabId
                  ? "tab-item active bg-slate-700 text-white border border-blue-500/70 shadow-[0_0_0_1px_rgba(59,130,246,0.22)]"
                  : "bg-slate-700/70 text-slate-300 border border-slate-600/70 hover:bg-slate-600/80"
              }`}
              onClick={() => {
                if (tab.id !== activeTabId) {
                  setActiveTabId(tab.id);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  tabId: tab.id,
                });
              }}
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
                  className="tab-close-button text-slate-400 hover:text-red-300 transition-all duration-150 p-1 rounded-full hover:bg-red-500/20 touch-manipulation"
                  title="Close tab"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {tabs.length > 1 && tab.id === activeTabId && (
                <div className="md:hidden absolute -top-1 -right-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center touch-manipulation shadow-lg"
                    title="Close tab"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={createNewTab}
            className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition-colors ml-1 md:ml-2 touch-manipulation shadow-md"
            title="New tab"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {activeTab && (
            <button
              onClick={() => duplicateTab(activeTab.id)}
              className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-blue-700 hover:bg-blue-600 text-white rounded-xl transition-colors ml-1 touch-manipulation shadow-md"
              title="Copy current tab"
            >
              <Copy className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}

          {tabs.length > 1 && (
            <button
              onClick={closeAllTabs}
              className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors ml-1 touch-manipulation shadow-md"
              title="Close all tabs"
            >
              <XCircle className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}
        </div>

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

      <div className="flex-1">
        {activeTab && (
          <ChessBot
            key={activeTab.id}
            tabId={activeTab.id}
            tabName={activeTab.name}
            initialGameState={activeTab.gameState}
            onGameStateChange={handleActiveGameStateChange}
            onRename={handleActiveTabRename}
          />
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-2 z-50 min-w-[180px]"
          style={{
            left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px`,
            top: `${Math.min(contextMenu.y, window.innerHeight - 180)}px`,
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
            <X className="w-4 h-4 text-red-400" />
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
              <Sparkles className="w-4 h-4 text-orange-400" />
              Close Other Tabs
            </button>
          )}

          <button
            onClick={() => {
              duplicateTab(contextMenu.tabId);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <Copy className="w-4 h-4 text-blue-300" />
            Copy Tab
          </button>

          {tabs.length > 1 && (
            <button
              onClick={() => {
                closeAllTabs();
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
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
            <Pencil className="w-4 h-4 text-blue-400" />
            Rename Tab
          </button>
        </div>
      )}
    </div>
  );
}
