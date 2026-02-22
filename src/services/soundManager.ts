class SoundManager {
  private enabled: boolean = true;
  private volume: number = 0.5;
  private audioContext: AudioContext | null = null;

  constructor() {
    // Check if user prefers reduced motion (also often correlates with reduced audio)
    if (typeof window !== "undefined") {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      this.enabled = !prefersReducedMotion;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!this.audioContext && typeof window !== "undefined") {
      try {
        const extendedWindow = window as Window & {
          webkitAudioContext?: typeof AudioContext;
        };
        const AudioContextConstructor =
          globalThis.AudioContext || extendedWindow.webkitAudioContext;
        if (!AudioContextConstructor) {
          return null;
        }
        this.audioContext = new AudioContextConstructor();
      } catch (error) {
        console.warn("Audio not supported:", error);
        return null;
      }
    }
    return this.audioContext;
  }

  private createTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
  ): void {
    if (!this.enabled) return;

    const audioContext = this.getAudioContext();
    if (!audioContext) return;

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        this.volume * 0.3,
        audioContext.currentTime + 0.01,
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + duration,
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.warn("Error playing sound:", error);
    }
  }

  playMove(): void {
    // Pleasant move sound - two quick tones
    this.createTone(800, 0.1);
    setTimeout(() => this.createTone(600, 0.1), 50);
  }

  playCapture(): void {
    // More dramatic capture sound
    this.createTone(400, 0.15, "triangle");
    setTimeout(() => this.createTone(300, 0.1, "triangle"), 80);
  }

  playCheck(): void {
    // Alert sound for check
    this.createTone(1000, 0.2);
    setTimeout(() => this.createTone(1200, 0.15), 100);
  }

  playGameEnd(): void {
    // Victory/defeat fanfare
    const notes = [523, 659, 784, 1047]; // C, E, G, C
    notes.forEach((note, index) => {
      setTimeout(() => this.createTone(note, 0.3), index * 150);
    });
  }

  playError(): void {
    // Error beep
    this.createTone(200, 0.2, "sawtooth");
  }

  playClick(): void {
    // Subtle UI click
    this.createTone(1000, 0.05);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }
}

export const soundManager = new SoundManager();
