import type {
  AnalysisTimelinePoint,
  LiveAnalysisPoint,
  MoveQualityClass,
} from "../types/chess";

interface AnalysisTimelineChartProps {
  timeline: AnalysisTimelinePoint[];
  liveSeries: LiveAnalysisPoint[];
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
}: AnalysisTimelineChartProps) {
  const timelinePoints = timeline.slice(-80);
  const timelineIndex = timelinePoints.map((_, index) => index);
  const livePoints = liveSeries.slice(-40);
  const liveIndex = livePoints.map((_, index) => index);

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

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-gray-700 bg-gray-900/70 p-3">
      <div className="flex items-center justify-between text-xs text-gray-300">
        <div className="font-semibold text-white">Analysis Timeline</div>
        <div className="text-[11px] text-gray-400">
          Move quality + dual engine + consensus
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-gray-700 bg-black/30 p-2">
          <div className="mb-1 text-[11px] text-gray-300">
            Per-Move Timeline
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
                  r="1.4"
                  fill={qualityColor[point.quality]}
                >
                  <title>
                    {`Move ${point.moveNumber} | ${qualityLabel[point.quality]} | Δ${point.deltaCp}cp | Conf ${point.confidence}%`}
                  </title>
                </circle>
              );
            })}
          </svg>
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
