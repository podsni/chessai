import { useEffect, useMemo, useState } from "react";
import type {
  AnalysisTimelinePoint,
  LiveAnalysisPoint,
  MoveQualityClass,
} from "../types/chess";

interface AnalysisTimelineChartProps {
  timeline: AnalysisTimelinePoint[];
  liveSeries: LiveAnalysisPoint[];
  mode: "human-vs-ai" | "ai-vs-ai" | "human-vs-human";
  gameStatus: string;
  gameOver: boolean;
  pgnResult?: string | null;
}

const qualityColor: Record<MoveQualityClass, string> = {
  brilliant: "#22c55e",
  great: "#14b8a6",
  best: "#3b82f6",
  good: "#84cc16",
  inaccuracy: "#eab308",
  mistake: "#f97316",
  blunder: "#ef4444",
};

const qualityLabel: Record<MoveQualityClass, string> = {
  brilliant: "Brilliant",
  great: "Great",
  best: "Best",
  good: "Good",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};

const qualityWeight: Record<MoveQualityClass, number> = {
  brilliant: 100,
  great: 95,
  best: 90,
  good: 80,
  inaccuracy: 65,
  mistake: 40,
  blunder: 15,
};

const orderedQualities: MoveQualityClass[] = [
  "brilliant",
  "great",
  "best",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
];

const toChartY = (cp: number) => {
  const clamped = Math.max(-1200, Math.min(1200, cp));
  return 100 - ((clamped + 1200) / 2400) * 100;
};

const buildPath = (
  points: number[],
  resolver: (point: number) => number | undefined,
) => {
  if (points.length < 2) return "";
  let path = "";
  for (let index = 0; index < points.length; index += 1) {
    const value = resolver(index);
    if (value === undefined) continue;
    const x = (index / (points.length - 1)) * 100;
    path += `${path ? " L" : "M"}${x.toFixed(2)},${value.toFixed(2)}`;
  }
  return path;
};

export function AnalysisTimelineChart({
  timeline,
  liveSeries,
  mode,
  gameStatus,
  gameOver,
  pgnResult,
}: AnalysisTimelineChartProps) {
  const timelinePoints = timeline.slice(-80);
  const timelineIndex = timelinePoints.map((_, index) => index);
  const livePoints = liveSeries.slice(-40);
  const liveIndex = livePoints.map((_, index) => index);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  useEffect(() => {
    if (timelinePoints.length === 0) {
      setSelectedIndex(-1);
      return;
    }
    setSelectedIndex((prev) =>
      prev < 0 || prev >= timelinePoints.length
        ? timelinePoints.length - 1
        : prev,
    );
  }, [timelinePoints.length]);

  const selectedPoint =
    selectedIndex >= 0 && selectedIndex < timelinePoints.length
      ? timelinePoints[selectedIndex]
      : null;

  const qualityCounts = useMemo(() => {
    const init = () =>
      Object.fromEntries(
        orderedQualities.map((quality) => [quality, 0]),
      ) as Record<MoveQualityClass, number>;
    const white = init();
    const black = init();

    for (const point of timelinePoints) {
      const mover = point.ply % 2 === 1 ? "white" : "black";
      if (mover === "white") {
        white[point.quality] += 1;
      } else {
        black[point.quality] += 1;
      }
    }
    return { white, black };
  }, [timelinePoints]);

  const sideAccuracy = useMemo(() => {
    const compute = (side: "white" | "black") => {
      const relevant = timelinePoints.filter((point) =>
        side === "white" ? point.ply % 2 === 1 : point.ply % 2 === 0,
      );
      if (relevant.length === 0) return 0;
      const score =
        relevant.reduce((sum, point) => sum + qualityWeight[point.quality], 0) /
        relevant.length;
      return Math.round(score * 10) / 10;
    };
    return {
      white: compute("white"),
      black: compute("black"),
    };
  }, [timelinePoints]);

  const averageConfidence = useMemo(() => {
    if (timelinePoints.length === 0) return 0;
    const total = timelinePoints.reduce(
      (sum, point) => sum + point.confidence,
      0,
    );
    return Math.round((total / timelinePoints.length) * 10) / 10;
  }, [timelinePoints]);

  const finalPoint = timelinePoints[timelinePoints.length - 1];
  const predictedWinner = useMemo(() => {
    if (!finalPoint) return "Balanced";
    if (finalPoint.consensusCp > 35) return "White advantage";
    if (finalPoint.consensusCp < -35) return "Black advantage";
    return "Balanced";
  }, [finalPoint]);

  const finalResult = useMemo(() => {
    if (gameOver) {
      if (gameStatus.toLowerCase().includes("draw")) return "Draw";
      if (gameStatus.toLowerCase().includes("white")) return "White won";
      if (gameStatus.toLowerCase().includes("black")) return "Black won";
      return gameStatus;
    }
    if (pgnResult === "1-0") return "White won (PGN)";
    if (pgnResult === "0-1") return "Black won (PGN)";
    if (pgnResult === "1/2-1/2") return "Draw (PGN)";
    return "Game in progress";
  }, [gameOver, gameStatus, pgnResult]);

  const sfPath = buildPath(timelineIndex, (index) => {
    const cp = timelinePoints[index]?.stockfishCp;
    return cp === undefined ? undefined : toChartY(cp);
  });
  const apiPath = buildPath(timelineIndex, (index) => {
    const cp = timelinePoints[index]?.chessApiCp;
    return cp === undefined ? undefined : toChartY(cp);
  });
  const consensusPath = buildPath(timelineIndex, (index) =>
    toChartY(timelinePoints[index]?.consensusCp ?? 0),
  );

  const liveSfPath = buildPath(liveIndex, (index) =>
    livePoints[index]?.stockfish === undefined
      ? undefined
      : 100 - (livePoints[index]?.stockfish ?? 50),
  );
  const liveApiPath = buildPath(liveIndex, (index) =>
    livePoints[index]?.chessApi === undefined
      ? undefined
      : 100 - (livePoints[index]?.chessApi ?? 50),
  );
  const liveConsensusPath = buildPath(
    liveIndex,
    (index) => 100 - (livePoints[index]?.consensus ?? 50),
  );

  const selectedX =
    selectedIndex >= 0 && timelinePoints.length > 1
      ? (selectedIndex / (timelinePoints.length - 1)) * 100
      : null;
  const selectedY = selectedPoint ? toChartY(selectedPoint.consensusCp) : null;

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-gray-700 bg-gray-900/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
        <div>
          <div className="font-semibold text-white">Analysis Timeline</div>
          <div className="text-[11px] text-gray-400">
            Dual engine, consensus, quality markers
          </div>
        </div>
        <div className="rounded-md border border-gray-700 bg-gray-800/60 px-2 py-1 text-[11px] text-gray-200">
          Avg Confidence:{" "}
          <span className="font-semibold text-white">{averageConfidence}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-gray-700 bg-black/30 p-2">
          <div className="mb-1 flex items-center justify-between text-[11px] text-gray-300">
            <span>Per-Move Timeline</span>
            {selectedPoint && (
              <span className="text-gray-400">
                Move {selectedPoint.moveNumber} •{" "}
                {qualityLabel[selectedPoint.quality]}
              </span>
            )}
          </div>
          <svg
            viewBox="0 0 100 100"
            className="h-32 w-full"
            preserveAspectRatio="none"
          >
            <line
              x1="0"
              y1="50"
              x2="100"
              y2="50"
              stroke="#334155"
              strokeWidth="0.8"
            />
            <line
              x1="0"
              y1="20"
              x2="100"
              y2="20"
              stroke="#1e293b"
              strokeWidth="0.5"
            />
            <line
              x1="0"
              y1="80"
              x2="100"
              y2="80"
              stroke="#1e293b"
              strokeWidth="0.5"
            />
            {sfPath && (
              <path d={sfPath} fill="none" stroke="#3b82f6" strokeWidth="1.4" />
            )}
            {apiPath && (
              <path
                d={apiPath}
                fill="none"
                stroke="#22c55e"
                strokeWidth="1.4"
              />
            )}
            {consensusPath && (
              <path
                d={consensusPath}
                fill="none"
                stroke="#facc15"
                strokeWidth="1.8"
              />
            )}
            {selectedX !== null && (
              <line
                x1={selectedX}
                y1="0"
                x2={selectedX}
                y2="100"
                stroke="#f8fafc"
                strokeOpacity="0.35"
                strokeWidth="0.7"
              />
            )}
            {timelinePoints.map((point, index) => {
              const x =
                timelinePoints.length > 1
                  ? (index / (timelinePoints.length - 1)) * 100
                  : 50;
              const y = toChartY(point.consensusCp);
              return (
                <circle
                  key={`${point.fen}-${index}`}
                  cx={x}
                  cy={y}
                  r={index === selectedIndex ? "2.2" : "1.4"}
                  fill={qualityColor[point.quality]}
                >
                  <title>
                    {`Move ${point.moveNumber} | ${qualityLabel[point.quality]} | Δ${point.deltaCp}cp | Conf ${point.confidence}%`}
                  </title>
                </circle>
              );
            })}
            {selectedX !== null && selectedY !== null && (
              <circle cx={selectedX} cy={selectedY} r="2.6" fill="#f8fafc" />
            )}
          </svg>
          <div className="mt-2 grid grid-cols-4 gap-2">
            <button
              className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-[11px] text-gray-200 hover:bg-gray-700 disabled:opacity-40"
              onClick={() => setSelectedIndex(0)}
              disabled={timelinePoints.length === 0 || selectedIndex <= 0}
            >
              {"|<"}
            </button>
            <button
              className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-[11px] text-gray-200 hover:bg-gray-700 disabled:opacity-40"
              onClick={() => setSelectedIndex((prev) => Math.max(0, prev - 1))}
              disabled={timelinePoints.length === 0 || selectedIndex <= 0}
            >
              {"<"}
            </button>
            <button
              className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-[11px] text-gray-200 hover:bg-gray-700 disabled:opacity-40"
              onClick={() =>
                setSelectedIndex((prev) =>
                  Math.min(timelinePoints.length - 1, prev + 1),
                )
              }
              disabled={
                timelinePoints.length === 0 ||
                selectedIndex >= timelinePoints.length - 1
              }
            >
              {">"}
            </button>
            <button
              className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-[11px] text-gray-200 hover:bg-gray-700 disabled:opacity-40"
              onClick={() => setSelectedIndex(timelinePoints.length - 1)}
              disabled={
                timelinePoints.length === 0 ||
                selectedIndex >= timelinePoints.length - 1
              }
            >
              {">|"}
            </button>
          </div>
        </div>

        <div className="rounded-md border border-gray-700 bg-black/30 p-2">
          <div className="mb-1 text-[11px] text-gray-300">
            Live Stream (500ms window)
          </div>
          <svg
            viewBox="0 0 100 100"
            className="h-32 w-full"
            preserveAspectRatio="none"
          >
            <line
              x1="0"
              y1="50"
              x2="100"
              y2="50"
              stroke="#334155"
              strokeWidth="0.8"
            />
            {liveSfPath && (
              <path
                d={liveSfPath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.3"
              />
            )}
            {liveApiPath && (
              <path
                d={liveApiPath}
                fill="none"
                stroke="#22c55e"
                strokeWidth="1.3"
              />
            )}
            {liveConsensusPath && (
              <path
                d={liveConsensusPath}
                fill="none"
                stroke="#facc15"
                strokeWidth="1.7"
              />
            )}
          </svg>
          {selectedPoint && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded border border-gray-700 bg-gray-800/60 px-2 py-1 text-gray-300">
                <div className="text-gray-400">Consensus</div>
                <div className="font-semibold text-white">
                  {(selectedPoint.consensusCp / 100).toFixed(2)}
                </div>
              </div>
              <div className="rounded border border-gray-700 bg-gray-800/60 px-2 py-1 text-gray-300">
                <div className="text-gray-400">Engine Delta</div>
                <div className="font-semibold text-white">
                  {selectedPoint.deltaCp} cp
                </div>
              </div>
              <div className="rounded border border-gray-700 bg-gray-800/60 px-2 py-1 text-gray-300">
                <div className="text-gray-400">WDL</div>
                <div className="font-semibold text-white">
                  {selectedPoint.wdlWin}/{selectedPoint.wdlDraw}/
                  {selectedPoint.wdlLoss}
                </div>
              </div>
              <div className="rounded border border-gray-700 bg-gray-800/60 px-2 py-1 text-gray-300">
                <div className="text-gray-400">Confidence</div>
                <div className="font-semibold text-white">
                  {selectedPoint.confidence}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-md border border-gray-700 bg-black/30 p-2">
          <div className="mb-2 text-[11px] text-gray-300">Accuracy</div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded border border-gray-700 bg-gray-800/60 p-2">
              <div className="text-xl font-bold text-white">
                {sideAccuracy.white}
              </div>
              <div className="text-[11px] text-gray-400">White Accuracy</div>
            </div>
            <div className="rounded border border-gray-700 bg-gray-800/60 p-2">
              <div className="text-xl font-bold text-white">
                {sideAccuracy.black}
              </div>
              <div className="text-[11px] text-gray-400">Black Accuracy</div>
            </div>
          </div>
        </div>
        <div className="rounded-md border border-gray-700 bg-black/30 p-2">
          <div className="mb-2 text-[11px] text-gray-300">
            Move Quality Breakdown
          </div>
          <div className="space-y-1 text-[11px]">
            {orderedQualities.map((quality) => (
              <div
                key={quality}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-2"
              >
                <span style={{ color: qualityColor[quality] }}>
                  {qualityLabel[quality]}
                </span>
                <span className="rounded bg-gray-800/70 px-1.5 py-0.5 text-gray-200">
                  W {qualityCounts.white[quality]}
                </span>
                <span className="rounded bg-gray-800/70 px-1.5 py-0.5 text-gray-200">
                  B {qualityCounts.black[quality]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-md border border-gray-700 bg-black/30 px-3 py-2 text-[11px]">
          <div className="text-gray-400">Mode</div>
          <div className="font-semibold text-white capitalize">
            {mode.replace(/-/g, " ")}
          </div>
        </div>
        <div className="rounded-md border border-gray-700 bg-black/30 px-3 py-2 text-[11px]">
          <div className="text-gray-400">Predicted Outcome</div>
          <div className="font-semibold text-emerald-300">
            {predictedWinner}
          </div>
        </div>
        <div className="rounded-md border border-gray-700 bg-black/30 px-3 py-2 text-[11px]">
          <div className="text-gray-400">Final Result</div>
          <div className="font-semibold text-yellow-300">{finalResult}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-300">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Stockfish
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Chess-API
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-400" /> Consensus
        </span>
        <span className="text-gray-400">
          Marker color = move quality (Brilliant → Blunder)
        </span>
      </div>
    </div>
  );
}
