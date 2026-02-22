interface ChessApiResponse {
  eval?: number;
  centipawns?: string | number;
  move?: string;
  lan?: string;
  mate?: number | null;
}

interface EngineAnalysisResponse {
  success: boolean;
  evaluation?: number;
  mate?: number;
  bestmove?: string;
  continuation?: string;
}

export class ChessApiEngine {
  private readonly baseUrl = "https://chess-api.com/v1";

  async getAnalysis(
    fen: string,
    depth: number,
  ): Promise<EngineAnalysisResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fen,
          depth: Math.max(1, Math.min(depth, 18)),
        }),
      });

      if (!response.ok) {
        throw new Error(`Chess API request failed: ${response.status}`);
      }

      const data = (await response.json()) as ChessApiResponse;
      const centipawns = this.parseCentipawns(data);
      const bestMove = data.move || data.lan;

      if (!bestMove && centipawns === undefined && data.mate == null) {
        throw new Error("Chess API returned empty analysis");
      }

      return {
        success: true,
        evaluation: centipawns,
        mate: data.mate ?? undefined,
        bestmove: bestMove,
      };
    } catch (error) {
      console.error("Error fetching chess-api analysis:", error);
      throw error;
    }
  }

  async getBestMove(fen: string, depth: number): Promise<string | null> {
    const analysis = await this.getAnalysis(fen, depth);
    if (!analysis.bestmove) return null;
    return this.extractMoveFromString(analysis.bestmove);
  }

  extractMoveFromString(bestMoveString: string): string | null {
    if (!bestMoveString || bestMoveString === "none") {
      return null;
    }
    const moveMatch = bestMoveString.match(/[a-h][1-8][a-h][1-8][qrbn]?/);
    return moveMatch ? moveMatch[0] : null;
  }

  private parseCentipawns(data: ChessApiResponse): number | undefined {
    if (data.centipawns !== undefined && data.centipawns !== null) {
      const parsed = Number(data.centipawns);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    if (data.eval !== undefined && data.eval !== null) {
      const parsed = Number(data.eval);
      return Number.isFinite(parsed) ? Math.round(parsed * 100) : undefined;
    }
    return undefined;
  }
}
