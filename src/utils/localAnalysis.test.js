import { describe, expect, test } from "bun:test";
import { Chess } from "chess.js";
import { buildLocalAnalysis } from "./localAnalysis";

describe("buildLocalAnalysis", () => {
  test("returns a legal bestmove for starting position", () => {
    const analysis = buildLocalAnalysis(new Chess().fen());
    expect(analysis.success).toBe(true);
    expect(typeof analysis.bestmove).toBe("string");
    expect(analysis.bestmove.length).toBeGreaterThanOrEqual(4);
  });

  test("returns neutral-ish evaluation for balanced material", () => {
    const analysis = buildLocalAnalysis(new Chess().fen());
    expect(Math.abs(analysis.evaluation ?? 0)).toBeLessThanOrEqual(15);
    expect(analysis.winChance).toBeGreaterThanOrEqual(1);
    expect(analysis.winChance).toBeLessThanOrEqual(99);
  });

  test("returns no bestmove when no legal move exists", () => {
    const analysis = buildLocalAnalysis("7k/5Q2/7K/8/8/8/8/8 b - - 0 1");
    expect(analysis.bestmove).toBeUndefined();
  });
});
