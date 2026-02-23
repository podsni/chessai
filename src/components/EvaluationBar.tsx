import { estimateWdl, getEvaluationBarPercent } from "../utils/evaluation";

interface EvaluationBarProps {
  evaluation?: number | null;
  mate?: number | null;
  isThinking?: boolean;
}

export function EvaluationBar({
  evaluation,
  mate,
  isThinking = false,
}: EvaluationBarProps) {
  const percentWhite = getEvaluationBarPercent(evaluation ?? undefined, mate);
  const percentBlack = 100 - percentWhite;
  const wdl = estimateWdl(evaluation ?? undefined, mate);
  const scoreLabel =
    mate !== null && mate !== undefined
      ? `M${Math.abs(mate)}`
      : evaluation !== null && evaluation !== undefined
        ? `${evaluation > 0 ? "+" : ""}${(evaluation / 100).toFixed(2)}`
        : "0.00";

  return (
    <div className="w-full md:w-16 flex md:flex-col items-center gap-2">
      <div className="md:hidden w-full">
        <div className="flex items-center justify-between text-[11px] text-gray-300 mb-1">
          <span>Eval {scoreLabel}</span>
          <span>
            W {wdl.win}% · D {wdl.draw}% · L {wdl.loss}%
          </span>
        </div>
        <div className="h-3 w-full rounded-full overflow-hidden border border-gray-600 bg-gray-900">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${percentWhite}%` }}
          />
        </div>
      </div>

      <div className="hidden md:flex flex-col items-center w-14">
        <div className="text-xs font-semibold text-white mb-1">
          {scoreLabel}
        </div>
        <div className="relative h-[420px] w-8 rounded-full overflow-hidden border border-gray-600 bg-gray-900">
          <div
            className="absolute bottom-0 left-0 w-full bg-white transition-all duration-300"
            style={{ height: `${percentWhite}%` }}
          />
          <div
            className="absolute top-0 left-0 w-full bg-gray-950 transition-all duration-300"
            style={{ height: `${percentBlack}%` }}
          />
          {isThinking && (
            <div className="absolute inset-0 bg-blue-400/20 animate-pulse" />
          )}
        </div>
        <div className="mt-2 text-[10px] text-center text-gray-300 leading-4">
          <div>W {wdl.win}%</div>
          <div>D {wdl.draw}%</div>
          <div>L {wdl.loss}%</div>
        </div>
      </div>
    </div>
  );
}
