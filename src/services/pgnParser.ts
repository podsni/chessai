export interface PGNGameInfo {
  headers: Record<string, string>;
  moves: string[];
  result: string;
}

export interface ParsedPGN {
  success: boolean;
  games: PGNGameInfo[];
  error?: string;
}

export class PGNParser {
  /**
   * Parse PGN text and extract game information
   */
  static parsePGN(pgnText: string): ParsedPGN {
    try {
      const games: PGNGameInfo[] = [];
      const trimmedText = pgnText.trim();

      if (!trimmedText) {
        return {
          success: false,
          games: [],
          error: "Empty PGN text",
        };
      }

      // Split multiple games (separated by double newlines or new headers)
      const gameTexts = this.splitIntoGames(trimmedText);

      for (const gameText of gameTexts) {
        const game = this.parseSingleGame(gameText);
        if (game) {
          games.push(game);
        }
      }

      if (games.length === 0) {
        return {
          success: false,
          games: [],
          error: "No valid games found in PGN",
        };
      }

      return {
        success: true,
        games,
      };
    } catch (error) {
      return {
        success: false,
        games: [],
        error: error instanceof Error ? error.message : "Unknown parsing error",
      };
    }
  }

  /**
   * Split PGN text into individual games
   */
  private static splitIntoGames(pgnText: string): string[] {
    // Split by event headers or double newlines
    const games: string[] = [];
    const lines = pgnText.split("\n");
    let currentGame: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // If we hit a new [Event] header and we already have content, start a new game
      if (trimmedLine.startsWith("[Event ") && currentGame.length > 0) {
        games.push(currentGame.join("\n"));
        currentGame = [line];
      } else {
        currentGame.push(line);
      }
    }

    // Add the last game
    if (currentGame.length > 0) {
      games.push(currentGame.join("\n"));
    }

    return games.filter((game) => game.trim().length > 0);
  }

  /**
   * Parse a single game from PGN text
   */
  private static parseSingleGame(gameText: string): PGNGameInfo | null {
    try {
      const lines = gameText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const headers: Record<string, string> = {};
      const moveLines: string[] = [];

      let inMoves = false;

      for (const line of lines) {
        if (line.startsWith("[") && line.endsWith("]")) {
          // Parse header
          const headerMatch = line.match(/^\[(\w+)\s+"([^"]+)"\]$/);
          if (headerMatch) {
            headers[headerMatch[1]] = headerMatch[2];
          }
        } else if (line.length > 0 && !line.startsWith("[")) {
          // This is a move line
          inMoves = true;
          moveLines.push(line);
        }
      }

      if (!inMoves && moveLines.length === 0) {
        return null;
      }

      // Parse moves from move lines
      const allMovesText = moveLines.join(" ");
      const moves = this.extractMoves(allMovesText);
      const result = this.extractResult(allMovesText);

      return {
        headers,
        moves,
        result,
      };
    } catch (error) {
      console.error("Error parsing single game:", error);
      return null;
    }
  }

  /**
   * Extract individual moves from moves text
   */
  private static extractMoves(movesText: string): string[] {
    const moves: string[] = [];

    // Remove comments in braces and parentheses
    let cleanText = movesText.replace(/\{[^}]*\}/g, "");
    cleanText = cleanText.replace(/\([^)]*\)/g, "");

    // Split by spaces and filter out move numbers and results
    const tokens = cleanText.split(/\s+/).filter((token) => token.length > 0);

    for (const token of tokens) {
      // Skip move numbers (like "1.", "2.", "10.")
      if (/^\d+\.+$/.test(token)) {
        continue;
      }

      // Skip results
      if (["1-0", "0-1", "1/2-1/2", "*"].includes(token)) {
        continue;
      }

      // Skip annotations
      if (/^[?!]+$/.test(token)) {
        continue;
      }

      // This should be a move
      if (
        (token.length > 0 &&
          /^[NBRQK]?[a-h]?[1-8]?[x]?[a-h][1-8](=[NBRQ])?[+#]?$/.test(token)) ||
        token === "O-O" ||
        token === "O-O-O"
      ) {
        moves.push(token);
      }
    }

    return moves;
  }

  /**
   * Extract game result from moves text
   */
  private static extractResult(movesText: string): string {
    const resultMatch = movesText.match(/(1-0|0-1|1\/2-1\/2|\*)(?:\s|$)/);
    return resultMatch ? resultMatch[1] : "*";
  }

  /**
   * Convert PGN game to a simple format for display
   */
  static gameToDisplayString(game: PGNGameInfo): string {
    const white = game.headers.White || "Unknown";
    const black = game.headers.Black || "Unknown";
    const result = game.result;
    const event = game.headers.Event || "Chess Game";
    const date = game.headers.Date || "Unknown Date";

    return `${event} (${date})\n${white} vs ${black}\nResult: ${result}\nMoves: ${game.moves.length}`;
  }
}
