class HapticManager {
  private enabled: boolean = true;

  constructor() {
    // Check if device supports haptic feedback
    this.enabled = "vibrate" in navigator;
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.enabled || !navigator.vibrate) return;

    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn("Haptic feedback not supported:", error);
    }
  }

  // Light tap for UI interactions
  lightTap(): void {
    this.vibrate(10);
  }

  // Medium tap for piece selection
  mediumTap(): void {
    this.vibrate(25);
  }

  // Strong tap for captures or important moves
  strongTap(): void {
    this.vibrate(50);
  }

  // Pattern for successful move
  successPattern(): void {
    this.vibrate([10, 50, 10]);
  }

  // Pattern for errors
  errorPattern(): void {
    this.vibrate([100, 50, 100]);
  }

  // Pattern for check
  checkPattern(): void {
    this.vibrate([30, 30, 30, 30, 30]);
  }

  // Pattern for checkmate/game end
  gameEndPattern(): void {
    this.vibrate([50, 100, 50, 100, 50]);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled && "vibrate" in navigator;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const hapticManager = new HapticManager();
