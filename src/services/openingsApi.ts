export interface OpeningInfo {
  eco: string;
  name: string;
  pgn: string;
}

/**
 * Fetch the chess opening name for a given FEN using the Lichess Opening API.
 * Returns null if the position has no named opening or on network error.
 */
export async function fetchOpening(fen: string): Promise<OpeningInfo | null> {
  // Lichess opening API only covers standard starting positions (not mid-game
  // after many moves). We limit calls to the first 25 plies for performance.
  try {
    const url = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&topGames=0&recentGames=0`;
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      opening?: { eco: string; name: string } | null;
    };
    if (!data.opening) return null;
    return {
      eco: data.opening.eco,
      name: data.opening.name,
      pgn: "",
    };
  } catch {
    return null;
  }
}
