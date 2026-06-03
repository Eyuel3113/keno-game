import { useStore } from '../store';
import { useGame } from '../hooks/useGame';

export default function Board() {
  const { picks, drawnNumbers, allRoundPicks } = useStore();
  const { togglePick } = useGame();

  const numbers = Array.from({ length: 80 }, (_, i) => i + 1);
  const isResultPhase = drawnNumbers.length > 0;

  // Hits = intersection of allRoundPicks and drawn numbers
  const hitNumbers = allRoundPicks.filter((p) => drawnNumbers.includes(p));
  const hitCount = hitNumbers.length;

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/50 flex items-start justify-between gap-4">
        {isResultPhase ? (
          /* Result phase: show what the player picked */
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Your Picks This Round
            </h2>
            {allRoundPicks.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {[...allRoundPicks].sort((a, b) => a - b).map((n) => {
                  const isHit = drawnNumbers.includes(n);
                  return (
                    <span
                      key={n}
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
                        isHit
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-900/50 ring-2 ring-emerald-400/60'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {n}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No bets placed this round</p>
            )}
          </div>
        ) : (
          /* Betting phase: show title + current picks */
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white tracking-wide">Pick Your Numbers</h2>
            {picks.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {[...picks].sort((a, b) => a - b).map((n) => (
                  <span
                    key={n}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-bold"
                  >
                    {n}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">Select 1–10 numbers from the board</p>
            )}
          </div>
        )}

        {/* Legend - hidden on mobile (hidden sm:flex) to avoid crowding title */}
        <div className="hidden sm:flex gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-violet-500 inline-block" />
            <span className="text-slate-400">Picked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span className="text-slate-400">Drawn</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span className="text-slate-400">Hit!</span>
          </div>
        </div>
      </div>

      {/* Hits banner */}
      {isResultPhase && allRoundPicks.length > 0 && (
        <div className={`px-5 py-2 text-sm font-semibold text-center ${
          hitCount > 0
            ? 'bg-emerald-600/20 text-emerald-300 border-b border-emerald-700/40'
            : 'bg-slate-700/30 text-slate-400 border-b border-slate-700/40'
        }`}>
          {hitCount > 0
            ? `🎯 ${hitCount} hit${hitCount !== 1 ? 's' : ''} from ${allRoundPicks.length} picks across all your bets!`
            : `No hits this round. Better luck next time!`}
        </div>
      )}

      {/* Grid */}
      <div className="p-4 grid grid-cols-10 gap-1.5">
        {numbers.map((num) => {
          const isPicked = picks.includes(num);
          const isDrawn = drawnNumbers.includes(num);
          const isHit = allRoundPicks.includes(num) && isDrawn;

          let cls = 'bg-slate-700/60 hover:bg-slate-600/80 text-slate-200 border border-slate-600/40';
          if (isHit)        cls = 'bg-emerald-500 text-white border border-emerald-400 shadow-lg shadow-emerald-900/60 scale-110';
          else if (isPicked) cls = 'bg-violet-600 hover:bg-violet-500 text-white border border-violet-400 shadow-lg shadow-violet-900/50';
          else if (isDrawn)  cls = 'bg-amber-500/90 text-black border border-amber-400 font-extrabold';

          return (
            <button
              key={num}
              id={`ball-${num}`}
              onClick={() => togglePick(num)}
              disabled={isResultPhase}
              className={`
                aspect-square w-full rounded-lg flex items-center justify-center text-xs font-bold
                transition-all duration-200 cursor-pointer select-none
                disabled:cursor-default
                ${cls}
                ${isHit ? 'animate-pulse' : ''}
              `}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
