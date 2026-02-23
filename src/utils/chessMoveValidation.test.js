import { describe, expect, test } from "bun:test";
import { Chess } from "chess.js";
import { canMoveToSquare, getPromotionForMove } from "./chessMoveValidation";

describe("chessMoveValidation", () => {
  test("returns false for illegal move", () => {
    const chess = new Chess();
    expect(canMoveToSquare(chess, "e2", "f2")).toBe(false);
  });

  test("returns true for legal move", () => {
    const chess = new Chess();
    expect(canMoveToSquare(chess, "e2", "e4")).toBe(true);
  });

  test("adds queen promotion only when promotion move is legal", () => {
    const chess = new Chess("8/P7/8/8/8/8/8/k6K w - - 0 1");
    expect(getPromotionForMove(chess, "a7", "a8")).toBe("q");
  });

  test("does not force promotion for non-promotion move", () => {
    const chess = new Chess();
    expect(getPromotionForMove(chess, "e2", "e4")).toBeUndefined();
  });
});
