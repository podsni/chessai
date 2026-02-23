export interface WdlEstimate {
  win: number;
  draw: number;
  loss: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const getEvaluationBarPercent = (
  evaluation?: number,
  mate?: number | null,
): number => {
  if (mate !== null && mate !== undefined) {
    return mate > 0 ? 99 : 1;
  }

  const cp = evaluation ?? 0;
  const normalized = clamp(cp, -1200, 1200);
  return clamp(50 + normalized / 24, 1, 99);
};

export const estimateWdl = (
  evaluation?: number,
  mate?: number | null,
): WdlEstimate => {
  if (mate !== null && mate !== undefined) {
    if (mate > 0) {
      return { win: 99, draw: 1, loss: 0 };
    }
    return { win: 0, draw: 1, loss: 99 };
  }

  const cp = evaluation ?? 0;
  const winRate = 1 / (1 + Math.exp(-cp / 140));
  const drawRate = clamp(0.38 - Math.abs(cp) / 1400, 0.06, 0.38);
  const win = Math.round(winRate * (1 - drawRate) * 100);
  let draw = Math.round(drawRate * 100);
  let loss = 100 - win - draw;

  // Keep totals stable at 100.
  if (loss < 0) {
    loss = 0;
    draw = 100 - win;
  }

  return { win, draw, loss };
};
