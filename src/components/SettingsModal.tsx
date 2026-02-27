import { useState } from "react";
import { soundManager } from "../services/soundManager";
import { hapticManager } from "../services/hapticManager";
import { gameStorage } from "../services/gameStorage";
import type { BoardTheme, GameSettings } from "../types/chess";
import { getUiDepthLimit } from "../utils/engineConstraints";
import { BOARD_THEMES } from "../utils/boardThemes";

type SettingsModalState = GameSettings & {
  soundEnabled: boolean;
  hapticEnabled: boolean;
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: GameSettings;
  onSettingsChange: (settings: Partial<GameSettings>) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  currentSettings,
  onSettingsChange,
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<SettingsModalState>(() => {
    const saved = gameStorage.getSettings();
    return {
      ...currentSettings,
      soundEnabled: saved.soundEnabled,
      hapticEnabled: saved.hapticEnabled,
    };
  });

  if (!isOpen) return null;
  const uiDepthLimit = getUiDepthLimit(localSettings);

  const handleSettingChange = <K extends keyof SettingsModalState>(
    key: K,
    value: SettingsModalState[K],
  ) => {
    const newSettings: SettingsModalState = { ...localSettings, [key]: value };
    const depthLimit = getUiDepthLimit(newSettings);
    if (newSettings.aiDepth > depthLimit) {
      newSettings.aiDepth = depthLimit;
    }
    setLocalSettings(newSettings);

    // Apply immediately for feedback settings
    if (key === "soundEnabled") {
      if (typeof value === "boolean") {
        soundManager.setEnabled(value);
        if (value) soundManager.playClick();
      }
    }
    if (key === "hapticEnabled") {
      if (typeof value === "boolean") {
        hapticManager.setEnabled(value);
        if (value) hapticManager.lightTap();
      }
    }
  };

  const handleSave = () => {
    // Save to localStorage
    gameStorage.saveSettings({
      soundEnabled: localSettings.soundEnabled,
      hapticEnabled: localSettings.hapticEnabled,
      theme: "dark",
      boardOrientation: localSettings.boardOrientation,
      aiEngine: localSettings.aiEngine,
      analysisEngineMode: localSettings.analysisEngineMode,
      battleEnabled: localSettings.battleEnabled,
      battleOpponentEngine: localSettings.battleOpponentEngine,
      showAnalysisArrows: localSettings.showAnalysisArrows,
      wdlPolicyArrows: localSettings.wdlPolicyArrows,
      wdlShowAllArrowsDefault: localSettings.wdlShowAllArrowsDefault,
      autoAnalysis: localSettings.autoAnalysis,
      aiDepth: localSettings.aiDepth,
      boardTheme: localSettings.boardTheme,
    });

    // Apply to game settings
    onSettingsChange({
      mode: localSettings.mode,
      boardOrientation: localSettings.boardOrientation,
      humanColor: localSettings.humanColor,
      aiColor: localSettings.aiColor,
      aiDepth: localSettings.aiDepth,
      aiEngine: localSettings.aiEngine,
      analysisEngineMode: localSettings.analysisEngineMode,
      battleEnabled: localSettings.battleEnabled,
      battleOpponentEngine: localSettings.battleOpponentEngine,
      showAnalysisArrows: localSettings.showAnalysisArrows,
      wdlPolicyArrows: localSettings.wdlPolicyArrows,
      wdlShowAllArrowsDefault: localSettings.wdlShowAllArrowsDefault,
      autoAnalysis: localSettings.autoAnalysis,
      analysisMode: localSettings.analysisMode,
      boardTheme: localSettings.boardTheme,
    });
    onClose();
  };

  const handleTestSound = () => {
    soundManager.playMove();
  };

  const handleTestHaptic = () => {
    hapticManager.successPattern();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">⚙️ Game Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          {/* Audio Settings */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">
              🔊 Audio & Feedback
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Sound Effects</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestSound}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                    disabled={!localSettings.soundEnabled}
                  >
                    Test
                  </button>
                  <input
                    type="checkbox"
                    checked={localSettings.soundEnabled}
                    onChange={(e) =>
                      handleSettingChange("soundEnabled", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-gray-300">Haptic Feedback</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestHaptic}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                    disabled={!localSettings.hapticEnabled}
                  >
                    Test
                  </button>
                  <input
                    type="checkbox"
                    checked={localSettings.hapticEnabled}
                    onChange={(e) =>
                      handleSettingChange("hapticEnabled", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Board Appearance */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">
              🎨 Board Appearance
            </h3>
            <div className="space-y-2">
              <label className="block text-gray-300 text-sm mb-2">
                Board Theme
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  Object.entries(BOARD_THEMES) as [
                    BoardTheme,
                    (typeof BOARD_THEMES)[BoardTheme],
                  ][]
                ).map(([themeKey, theme]) => (
                  <button
                    key={themeKey}
                    onClick={() => handleSettingChange("boardTheme", themeKey)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                      localSettings.boardTheme === themeKey
                        ? "border-blue-500 bg-blue-900/30"
                        : "border-gray-600 hover:border-gray-400"
                    }`}
                    title={theme.label}
                  >
                    {/* Mini board swatch */}
                    <div className="grid grid-cols-4 gap-px w-12 h-6 rounded overflow-hidden">
                      {Array.from({ length: 16 }).map((_, i) => {
                        const row = Math.floor(i / 4);
                        const col = i % 4;
                        const isLight = (row + col) % 2 === 0;
                        return (
                          <div
                            key={i}
                            style={{
                              backgroundColor: isLight
                                ? theme.light
                                : theme.dark,
                            }}
                          />
                        );
                      })}
                    </div>
                    <span className="text-xs text-gray-300 text-center leading-tight">
                      {theme.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Board Settings */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">
              ♟️ Board Settings
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Board Orientation</label>
                <select
                  value={localSettings.boardOrientation}
                  onChange={(e) =>
                    handleSettingChange(
                      "boardOrientation",
                      e.target.value as GameSettings["boardOrientation"],
                    )
                  }
                  className="bg-gray-700 text-white rounded px-2 py-1"
                >
                  <option value="white">White</option>
                  <option value="black">Black</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-gray-300">Show Analysis Arrows</label>
                <input
                  type="checkbox"
                  checked={localSettings.showAnalysisArrows}
                  onChange={(e) =>
                    handleSettingChange("showAnalysisArrows", e.target.checked)
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-gray-300">Auto Analysis</label>
                <input
                  type="checkbox"
                  checked={localSettings.autoAnalysis}
                  onChange={(e) =>
                    handleSettingChange("autoAnalysis", e.target.checked)
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-gray-300">WDL Policy Arrows</label>
                <input
                  type="checkbox"
                  checked={localSettings.wdlPolicyArrows}
                  onChange={(e) =>
                    handleSettingChange("wdlPolicyArrows", e.target.checked)
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">
                  Default Show All WDL Arrows
                </label>
                <input
                  type="checkbox"
                  checked={localSettings.wdlShowAllArrowsDefault}
                  onChange={(e) =>
                    handleSettingChange(
                      "wdlShowAllArrowsDefault",
                      e.target.checked,
                    )
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
            </div>
          </div>

          {/* AI Settings */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">
              🤖 AI Settings
            </h3>
            <div>
              <label className="block text-gray-300 mb-2">
                AI Depth: {localSettings.aiDepth}
              </label>
              <input
                type="range"
                min="1"
                max={uiDepthLimit}
                value={localSettings.aiDepth}
                onChange={(e) =>
                  handleSettingChange("aiDepth", parseInt(e.target.value))
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Fast (1)</span>
                <span>Balanced (10)</span>
                <span>Strong ({uiDepthLimit})</span>
              </div>
            </div>
          </div>

          {/* Storage Info */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">💾 Storage</h3>
            <div className="text-sm text-gray-300">
              <div className="flex justify-between">
                <span>Saved Games:</span>
                <span>{gameStorage.getSavedGames().length}</span>
              </div>
              <div className="flex justify-between">
                <span>Auto-save:</span>
                <span>
                  {gameStorage.getAutoSavedGame() ? "Available" : "None"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 md:p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
