import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';

const NEXT_ROUND_WAIT_S = 30;
// Post-draw gap: how long after animation complete before next round (matches server gap)
const POST_DRAW_GAP_S = 32;

export default function DrawResults() {
  const {
    drawnNumbers,
    isDrawing,
    countdown,
    currentRoundId,
    allRoundPicks,
    betHistory,
  } = useStore();

  const [visibleNumbers, setVisibleNumbers] = useState<number[]>([]);
  const [nextRoundSecs, setNextRoundSecs] = useState<number | null>(null);
  const [postDrawSecs, setPostDrawSecs] = useState<number | null>(null);
  const nextRoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postDrawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAnimationComplete = drawnNumbers.length > 0 && visibleNumbers.length === drawnNumbers.length;

  // ── Reveal balls one at a time with 1200ms gap ───────────────────────────
  useEffect(() => {
    if (drawnNumbers.length === 0) {
      setVisibleNumbers([]);
      setPostDrawSecs(null);
      if (postDrawTimerRef.current) clearInterval(postDrawTimerRef.current);
      return;
    }
    setVisibleNumbers([]);
    const total = drawnNumbers.length;
    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      setVisibleNumbers(drawnNumbers.slice(0, idx));
      if (idx >= total) {
        clearInterval(interval);
      }
    }, 1200);
    return () => clearInterval(interval);
  }, [drawnNumbers]);



  // ── Post-draw countdown: shows "Next round in Xs" after animation ────────
  useEffect(() => {
    if (isAnimationComplete) {
      let secs = POST_DRAW_GAP_S;
      setPostDrawSecs(secs);
      if (postDrawTimerRef.current) clearInterval(postDrawTimerRef.current);
      postDrawTimerRef.current = setInterval(() => {
        secs -= 1;
        setPostDrawSecs(secs > 0 ? secs : 0);
        if (secs <= 0) {
          clearInterval(postDrawTimerRef.current!);
          postDrawTimerRef.current = null;
        }
      }, 1000);
    } else {
      if (postDrawTimerRef.current) clearInterval(postDrawTimerRef.current);
      setPostDrawSecs(null);
    }
    return () => {
      if (postDrawTimerRef.current) clearInterval(postDrawTimerRef.current);
    };
  }, [isAnimationComplete]);

  const isCountingDown = countdown > 0;
  const hasResult = drawnNumbers.length > 0;
  const countdownUrgent = countdown <= 10 && isCountingDown;
  const isWaiting = !hasResult && !isDrawing && !isCountingDown;

  // ── Pre-draw "next round" countdown (between rounds) ────────────────────
  useEffect(() => {
    if (isWaiting) {
      setNextRoundSecs(NEXT_ROUND_WAIT_S);
      let remaining = NEXT_ROUND_WAIT_S;
      nextRoundTimerRef.current = setInterval(() => {
        remaining -= 1;
        setNextRoundSecs(remaining);
        if (remaining <= 0) {
          clearInterval(nextRoundTimerRef.current!);
          nextRoundTimerRef.current = null;
        }
      }, 1000);
    } else {
      if (nextRoundTimerRef.current) {
        clearInterval(nextRoundTimerRef.current);
        nextRoundTimerRef.current = null;
      }
      setNextRoundSecs(null);
    }
    return () => {
      if (nextRoundTimerRef.current) clearInterval(nextRoundTimerRef.current);
    };
  }, [isWaiting]);

  const currentRoundBets = currentRoundId
    ? betHistory.filter((b) => b.roundId === currentRoundId)
    : [];
  const totalPayout = currentRoundBets.reduce((sum, b) => sum + (Number(b.payout) || 0), 0);
  const hasPlacedBets = currentRoundBets.length > 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">Live Draw</h2>
          {currentRoundId && (
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Round #{currentRoundId.slice(-8).toUpperCase()}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {/* Status Pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isDrawing
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : isCountingDown
              ? (countdownUrgent ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-violet-500/20 text-violet-300 border border-violet-500/30')
              : hasResult
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isDrawing ? 'bg-amber-400 animate-pulse'
              : isCountingDown ? (countdownUrgent ? 'bg-red-400 animate-ping' : 'bg-violet-400 animate-pulse')
              : hasResult ? 'bg-emerald-400'
              : 'bg-slate-500'
            }`} />
            {isDrawing
              ? 'Drawing...'
              : isCountingDown
              ? 'Betting Open'
              : hasResult
              ? 'Round Complete'
              : 'Waiting...'}
          </div>

          {/* Countdown clock */}
          {isCountingDown && (
            <div className="flex items-center gap-1 text-[11px] font-bold font-mono text-slate-400 pr-1.5">
              <span>⏱</span>
              <span className={countdownUrgent ? 'text-red-400 animate-pulse font-extrabold' : 'text-violet-300'}>
                {formatTime(countdown)}
              </span>
            </div>
          )}

          {/* Post-draw next round pill */}
          {isAnimationComplete && postDrawSecs !== null && postDrawSecs > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold font-mono pr-1.5">
              <span className="text-slate-500">Next round in</span>
              <span className={`tabular-nums ${postDrawSecs <= 10 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                {postDrawSecs}s
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-5 pt-3">
        {isWaiting ? (
          <div className="text-center py-6 flex flex-col items-center justify-center">
            <img src="/logo-icon.png" alt="Kendo Logo" className="h-24 w-auto object-contain mb-2.5 animate-pulse" />
            <p className="text-slate-500 text-sm mb-2">Waiting for next round…</p>
            {nextRoundSecs !== null && nextRoundSecs > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-700/40 border border-slate-600/30 rounded-full px-3 py-1">
                <span className="text-emerald-400 text-xs">⏱</span>
                <span className={`text-xs font-extrabold font-mono tabular-nums ${
                  nextRoundSecs <= 5 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                }`}>
                  Next round in {nextRoundSecs}s
                </span>
              </div>
            )}
          </div>
        ) : isDrawing ? (
          <div className="text-center py-6">
            <div className="flex justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
            <p className="text-amber-300 text-sm font-medium">Drawing numbers…</p>
          </div>
        ) : hasResult ? (
          <div>
            {/* Drawn number balls */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Drawn Numbers</p>
              <span className="text-xs text-slate-500 tabular-nums">{visibleNumbers.length} / {drawnNumbers.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleNumbers.map((num, i) => {
                const isHit = allRoundPicks.includes(num);
                return (
                  <div
                    key={`${num}-${i}`}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
                      isHit
                        ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-emerald-900/50 ring-2 ring-emerald-300/60'
                        : 'bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-amber-900/40'
                    }`}
                    style={{ animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
                  >
                    {num}
                  </div>
                );
              })}
              {Array.from({ length: drawnNumbers.length - visibleNumbers.length }).map((_, i) => (
                <div key={`ghost-${i}`} className="w-10 h-10 rounded-full border-2 border-dashed border-slate-600/40 animate-pulse" />
              ))}
            </div>

            {/* Win/Loss Banner — only after animation complete */}
            {isAnimationComplete && (
              <div className="mt-6 border-t border-slate-700/50 pt-5 text-center">
                {hasPlacedBets ? (
                  totalPayout > 0 ? (
                    <div className="space-y-1">
                      <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 uppercase tracking-wider animate-bounce">
                        🎉 YOU WIN!
                      </p>
                      <p className="text-lg font-extrabold text-emerald-400 font-mono">
                        +{totalPayout.toFixed(2)} ETB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-rose-400 uppercase tracking-wider animate-pulse">
                        🔴 YOU LOSE
                      </p>
                      <p className="text-xs text-slate-400">
                        Better luck next round!
                      </p>
                    </div>
                  )
                ) : (
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Round Complete</p>
                )}
              </div>
            )}

            {/* Your bets this round */}
            {currentRoundBets.length > 0 && (
              <div className="mt-5 border-t border-slate-700/50 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs text-slate-500 uppercase tracking-widest">Your Bets This Round</p>
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">YOU</span>
                </div>
                <div className="flex flex-col gap-2">
                  {currentRoundBets.map((bet, idx) => {
                    const hitsCount = bet.picks.filter((p) => visibleNumbers.includes(p)).length;
                    return (
                      <div key={bet.id} className="flex items-center justify-between bg-emerald-900/10 border border-emerald-700/20 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-mono">#{idx + 1}</span>
                          <div className="flex flex-wrap gap-1">
                            {[...bet.picks].sort((a, b) => a - b).map((n) => {
                              const isHit = visibleNumbers.includes(n);
                              return (
                                <span
                                  key={n}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all ${
                                    isHit
                                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-900/50 ring-1 ring-emerald-400'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {n}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-[10px] text-slate-500">{bet.amount} ETB bet</p>
                          <p className={`text-xs font-bold ${bet.payout > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {hitsCount} hit{hitsCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        ) : null}
      </div>
    </div>
  );
}


