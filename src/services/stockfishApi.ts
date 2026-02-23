interface StockfishApiResponse {
  success: boolean;
  evaluation?: number;
  mate?: number;
  winChance?: number;
  bestmove?: string;
  continuation?: string;
}

interface TopMove {
  move: string | null;
  evaluation?: number;
  mate?: number;
  rank: number;
}

export class StockfishAPI {
  private baseUrl = this.resolveBaseUrl();
  private cooldownUntil = 0;
  private cooldownReason: string | null = null;

  private resolveBaseUrl() {
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1")
    ) {
      return "/api/stockfish";
    }
    return "https://stockfish.online/api/s/v2.php";
  }

  private setCooldown(milliseconds: number, reason: string) {
    const nextUntil = Date.now() + milliseconds;
    if (nextUntil > this.cooldownUntil) {
      this.cooldownUntil = nextUntil;
      this.cooldownReason = reason;
    }
  }

  private normalizeEvaluation(raw?: number): number | undefined {
    if (raw === undefined || raw === null) return undefined;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return undefined;
    // stockfish.online may return pawn units (e.g. 1.36) instead of centipawns.
    if (Math.abs(parsed) <= 25) {
      return Math.round(parsed * 100);
    }
    return Math.round(parsed);
  }

  async getAnalysis(fen: string, depth: number): Promise<StockfishApiResponse> {
    if (Date.now() < this.cooldownUntil) {
      throw new Error(
        `Stockfish Online temporarily unavailable (${this.cooldownReason || "engine error"})`,
      );
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(
        `${this.baseUrl}?fen=${encodeURIComponent(fen)}&depth=${depth}`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        if (response.status === 429) {
          this.setCooldown(60_000, "rate limit (429)");
        }
        throw new Error(`Stockfish Online request failed: ${response.status}`);
      }

      const data = (await response.json()) as StockfishApiResponse;

      if (!data.success) {
        throw new Error("Analysis failed");
      }

      // Transform the API response to match our interface
      return {
        success: data.success,
        evaluation: this.normalizeEvaluation(data.evaluation),
        mate: data.mate ?? undefined,
        bestmove: data.bestmove ?? undefined, // Keep original field name
        continuation: data.continuation ?? undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          this.setCooldown(45_000, "request timeout");
        } else if (
          error instanceof TypeError ||
          error.message.includes("Failed to fetch")
        ) {
          this.setCooldown(120_000, "network/CORS blocked");
        }
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async getBestMove(fen: string, depth: number): Promise<string | null> {
    try {
      const data = await this.getAnalysis(fen, depth);

      if (!data.bestmove) {
        return null;
      }

      return this.extractMoveFromString(data.bestmove);
    } catch (error) {
      console.error("Error getting best move:", error);
      return null;
    }
  }

  extractMoveFromString(bestMoveString: string): string | null {
    if (!bestMoveString || bestMoveString === "none") {
      return null;
    }

    // Extract just the move part (e.g., "bestmove e2e4" -> "e2e4")
    const moveMatch = bestMoveString.match(
      /(?:bestmove\s+)?([a-h][1-8][a-h][1-8][qrbn]?)/,
    );
    if (!moveMatch) {
      return null;
    }

    return moveMatch[1]; // Return the raw move string like "e2e4"
  }

  parseBestMove(
    bestMoveString: string,
  ): { from: string; to: string; promotion?: string } | null {
    const moveStr = this.extractMoveFromString(bestMoveString);
    if (!moveStr) {
      return null;
    }

    const from = moveStr.substring(0, 2);
    const to = moveStr.substring(2, 4);
    const promotion = moveStr.length > 4 ? moveStr.substring(4) : undefined;

    return { from, to, promotion };
  }

  getEvaluationText(evaluation?: number, mate?: number | null): string {
    if (mate !== null && mate !== undefined) {
      return mate > 0 ? `Mate in ${mate}` : `Mate in ${Math.abs(mate)}`;
    }

    if (evaluation !== undefined) {
      const evalStr =
        evaluation > 0 ? `+${evaluation.toFixed(2)}` : evaluation.toFixed(2);
      return `Eval: ${evalStr}`;
    }

    return "No evaluation";
  }

  // Get multiple best moves for prediction display
  async getTopMoves(
    fen: string,
    depth: number,
    _count: number = 3,
  ): Promise<TopMove[]> {
    try {
      const data = await this.getAnalysis(fen, depth);

      const moves = [];

      // Add the best move
      if (data.bestmove) {
        const parsedMove = this.parseBestMove(data.bestmove);
        if (parsedMove) {
          moves.push({
            move: this.extractMoveFromString(data.bestmove),
            evaluation: data.evaluation,
            mate: data.mate,
            rank: 1,
          });
        }
      }

      // For now, we only have one move from the API
      // In a real implementation, you'd get multiple moves
      return moves;
    } catch (error) {
      console.error("Error getting top moves:", error);
      return [];
    }
  }
}
