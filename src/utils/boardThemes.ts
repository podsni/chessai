import type { BoardTheme } from "../types/chess";

export interface BoardThemeColors {
  light: string;
  dark: string;
  label: string;
  preview: [string, string]; // [light, dark] for preview swatch
}

export const BOARD_THEMES: Record<BoardTheme, BoardThemeColors> = {
  classic: {
    light: "#f0d9b5",
    dark: "#b58863",
    label: "Classic Wood",
    preview: ["#f0d9b5", "#b58863"],
  },
  blue: {
    light: "#dee3e6",
    dark: "#8ca2ad",
    label: "Blue Steel",
    preview: ["#dee3e6", "#8ca2ad"],
  },
  green: {
    light: "#ffffdd",
    dark: "#86a666",
    label: "Green Felt",
    preview: ["#ffffdd", "#86a666"],
  },
  dark: {
    light: "#5d7080",
    dark: "#2b3a44",
    label: "Dark Mode",
    preview: ["#5d7080", "#2b3a44"],
  },
  purple: {
    light: "#d8c8e8",
    dark: "#7a5c9a",
    label: "Purple Haze",
    preview: ["#d8c8e8", "#7a5c9a"],
  },
  red: {
    light: "#f2d0c4",
    dark: "#a84232",
    label: "Crimson",
    preview: ["#f2d0c4", "#a84232"],
  },
};
