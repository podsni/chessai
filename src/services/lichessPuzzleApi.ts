export interface LichessPuzzle {
  id: string;
  fen: string;
  /** Solution moves in UCI format, e.g. ["e2e4", "d7d5"] */
  solution: string[];
  /** Puzzle rating */
  rating: number;
  /** Puzzle themes (tactics tags) */
  themes: string[];
  /** The color that is to move in the puzzle */
  colorToMove: "white" | "black";
}

interface LichessPuzzleApiResponse {
  puzzle: {
    id: string;
    initialPly: number;
    rating: number;
    solution: string[];
    themes: string[];
  };
  game: {
    id: string;
    pgn: string;
  };
}

/**
 * Fetch a random daily puzzle from Lichess.
 * Uses the /api/puzzle/daily endpoint for a consistent puzzle.
 */
export async function fetchLichessPuzzle(): Promise<LichessPuzzle | null> {
  try {
    const response = await fetch("https://lichess.org/api/puzzle/next", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as LichessPuzzleApiResponse;

    // Replay the game PGN up to the puzzle start position to get the FEN
    const { Chess } = await import("chess.js");
    const chess = new Chess();

    // Parse PGN moves
    const pgn = data.game.pgn;
    const moveTokens = pgn
      .replace(/\{[^}]*\}/g, "") // strip comments
      .replace(/\d+\.\s*/g, " ") // strip move numbers
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);

    // Play up to initialPly
    const targetPly = data.puzzle.initialPly;
    for (let i = 0; i < targetPly && i < moveTokens.length; i++) {
      try {
        chess.move(moveTokens[i]);
      } catch {
        break;
      }
    }

    const fen = chess.fen();
    const colorToMove: "white" | "black" =
      chess.turn() === "w" ? "white" : "black";

    return {
      id: data.puzzle.id,
      fen,
      solution: data.puzzle.solution,
      rating: data.puzzle.rating,
      themes: data.puzzle.themes,
      colorToMove,
    };
  } catch {
    return null;
  }
}
