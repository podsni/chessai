import {
  estimateWdl,
  getEvaluationBarPercent,
  hasEvaluationData,
} from "../utils/evaluation";

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
  const hasData = hasEvaluationData(evaluation, mate);
  const percentWhite = hasData
    ? getEvaluationBarPercent(evaluation ?? undefined, mate)
    : 50;
  const wdl = hasData ? estimateWdl(evaluation ?? undefined, mate) : null;
  const scoreLabel =
    mate !== null && mate !== undefined
      ? `M${Math.abs(mate)}`
      : evaluation !== null && evaluation !== undefined
        ? `${evaluation > 0 ? "+" : ""}${(evaluation / 100).toFixed(2)}`
        : "--";

  return (
    <div className="w-full md:w-20 flex md:flex-col items-center gap-2">
      <div className="md:hidden w-full">
        <div className="flex items-center justify-between text-[11px] text-gray-300 mb-1">
          <span className="font-semibold text-white">Eval {scoreLabel}</span>
          {wdl ? (
            <span>
              W {wdl.win}% · D {wdl.draw}% · L {wdl.loss}%
            </span>
          ) : (
            <span className="text-gray-400">Belum dianalisis</span>
          )}
        </div>
        <div className="h-4 w-full rounded-full overflow-hidden border border-gray-600 bg-gray-900 relative">
          <div className="absolute inset-0 bg-gray-950" />
          <div
            className="absolute left-0 top-0 h-full bg-white transition-all duration-300"
            style={{ width: `${percentWhite}%` }}
          />
          <div className="absolute left-1/2 top-0 h-full w-px bg-blue-400/60" />
          {isThinking && (
            <div className="absolute inset-0 bg-blue-300/15 animate-pulse" />
          )}
        </div>
      </div>

      <div className="hidden md:flex flex-col items-center w-16">
        <div className="text-[10px] tracking-wide text-gray-300 mb-1">EVAL</div>
        <div className="text-xs font-bold text-white mb-1">{scoreLabel}</div>
        <div className="relative h-[420px] w-10 rounded-xl overflow-hidden border border-gray-600 bg-gray-900 shadow-inner">
          <div className="absolute inset-0 bg-gray-950" />
          <div
            className="absolute top-0 left-0 w-full bg-white transition-all duration-300"
            style={{ height: `${percentWhite}%` }}
          />
          <div className="absolute left-0 top-1/2 w-full h-px bg-blue-400/65" />
          <div
            className="absolute left-0 w-full h-[2px] bg-emerald-400/80 transition-all duration-300"
            style={{ top: `${100 - percentWhite}%` }}
          />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-gray-900">
            +8
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-gray-100">
            -8
          </div>
          {isThinking && (
            <div className="absolute inset-0 bg-blue-400/20 animate-pulse" />
          )}
        </div>
        {wdl ? (
          <div className="mt-2 text-[10px] text-center text-gray-300 leading-4 bg-gray-900/60 border border-gray-700 rounded-md px-2 py-1">
            <div>W {wdl.win}%</div>
            <div>D {wdl.draw}%</div>
            <div>L {wdl.loss}%</div>
          </div>
        ) : (
          <div className="mt-2 text-[10px] text-center text-gray-400 leading-4 bg-gray-900/60 border border-gray-700 rounded-md px-2 py-1">
            Menunggu
            <br />
            analisis
          </div>
        )}
      </div>
    </div>
  );
}
