export interface WdlEstimate {
  win: number;
  draw: number;
  loss: number;
}

export const hasEvaluationData = (
  evaluation?: number | null,
  mate?: number | null,
  winChance?: number | null,
): boolean =>
  (evaluation !== null && evaluation !== undefined) ||
  (mate !== null && mate !== undefined) ||
  (winChance !== null && winChance !== undefined);

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const getEvaluationBarPercent = (
  evaluation?: number,
  mate?: number | null,
  winChance?: number | null,
): number => {
  if (mate !== null && mate !== undefined) {
    return mate > 0 ? 99 : 1;
  }

  if (winChance !== null && winChance !== undefined) {
    return clamp(winChance, 1, 99);
  }

  const cp = evaluation ?? 0;
  const normalized = clamp(cp, -1200, 1200);
  return clamp(50 + normalized / 24, 1, 99);
};

export const cpToWinChance = (cp: number): number => {
  const winChance = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
  return clamp(winChance, 1, 99);
};

export const estimateWdl = (
  evaluation?: number,
  mate?: number | null,
  winChance?: number | null,
): WdlEstimate => {
  if (mate !== null && mate !== undefined) {
    if (mate > 0) {
      return { win: 99, draw: 1, loss: 0 };
    }
    return { win: 0, draw: 1, loss: 99 };
  }

  const cp = evaluation ?? 0;
  const whiteWinChance =
    winChance !== null && winChance !== undefined
      ? clamp(winChance, 1, 99)
      : cpToWinChance(cp);
  const drawRate = clamp(
    0.34 - Math.abs(whiteWinChance - 50) / 120,
    0.05,
    0.34,
  );
  const decisiveRate = 1 - drawRate;
  const win = Math.round((whiteWinChance / 100) * decisiveRate * 100);
  let draw = Math.round(drawRate * 100);
  let loss = 100 - win - draw;

  // Keep totals stable at 100.
  if (loss < 0) {
    loss = 0;
    draw = 100 - win;
  }

  return { win, draw, loss };
};
