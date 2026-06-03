import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useGame } from '../hooks/useGame';

interface PlacedBet { picks: number[]; amount: number; }

export default function BetPanel() {
  const [amount, setAmount] = useState(10);
  const [betError, setBetError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);

  const { picks, isDrawing, countdown, currentRoundId, balance, drawnNumbers } = useStore();
  const { placeBet } = useGame();

  // Reset placed bets list when a new round starts
  useEffect(() => {
    setPlacedBets([]);
    setBetError(null);
  }, [currentRoundId]);

  const canBet = picks.length > 0 && !isDrawing && countdown > 0 && !!currentRoundId && amount > 0 && amount <= balance;
  const isResultPhase = countdown === 0 && !isDrawing;
  const isBettingPhase = !isDrawing && drawnNumbers.length === 0;

  const handleBet = async () => {
    setBetError(null);
    setLoading(true);
    const snap = [...picks]; // snapshot before placeBet clears them
    try {
      await placeBet(amount);
      setPlacedBets((prev) => [...prev, { picks: snap, amount }]);
    } catch (err: unknown) {
      setBetError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to place bet.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecrease = () => {
    setAmount((prev) => Math.max(1, prev - 5));
  };

  const handleIncrease = () => {
    setAmount((prev) => Math.min(balance || 1000, prev + 5));
  };

  const handleMultiply = () => {
    setAmount((prev) => Math.min(balance || 1000, prev * 5));
  };

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl p-3 flex flex-col gap-3">
      
      {/* Betting Control Row (Betting phase only) */}
      {!isResultPhase && (
        <div className="flex gap-1.5 items-center bg-slate-900/40 p-1.5 rounded-xl border border-slate-700/30">
          
          {/* Bet Input Container */}
          <div className="flex-1 min-w-[55px] bg-slate-800/80 border border-slate-700/50 rounded-lg px-2 py-1 flex flex-col justify-center">
            <span className="text-[7.5px] uppercase tracking-wider text-slate-500 font-bold select-none leading-none">
              ETB
            </span>
            <input
              id="bet-amount-input"
              type="number"
              value={amount}
              min={1}
              max={balance}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
              className="w-full bg-transparent text-white text-xs sm:text-sm font-extrabold focus:outline-none focus:ring-0 select-all border-none p-0 mt-0.5"
              disabled={isDrawing || loading}
            />
          </div>

          {/* Adjustments: [-] [x5] [+] */}
          <div className="flex gap-0.5 shrink-0">
            <button
              onClick={handleDecrease}
              disabled={isDrawing || loading}
              className="w-8 h-8 rounded-lg bg-violet-600/10 border border-violet-500/20 hover:border-violet-400 text-violet-300 hover:text-white hover:bg-violet-600/30 text-xs font-bold flex items-center justify-center cursor-pointer transition-all disabled:opacity-40"
              title="Decrease by 5 ETB"
            >
              －
            </button>
            <button
              onClick={handleMultiply}
              disabled={isDrawing || loading}
              className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 border border-violet-500/40 text-white text-[10px] font-black flex items-center justify-center cursor-pointer transition-all shadow-md active:scale-95 disabled:opacity-40"
              title="Multiply bet by 5"
            >
              x5
            </button>
            <button
              onClick={handleIncrease}
              disabled={isDrawing || loading}
              className="w-8 h-8 rounded-lg bg-violet-600/10 border border-violet-500/20 hover:border-violet-400 text-violet-300 hover:text-white hover:bg-violet-600/30 text-xs font-bold flex items-center justify-center cursor-pointer transition-all disabled:opacity-40"
              title="Increase by 5 ETB"
            >
              ＋
            </button>
          </div>

          {/* BET Action Button */}
          <button
            onClick={handleBet}
            disabled={!canBet || loading}
            className={`h-8 px-2.5 sm:px-4 rounded-lg text-[10px] sm:text-xs font-extrabold uppercase tracking-widest transition-all shrink-0 ${
              canBet && !loading
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer font-black'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed font-bold'
            }`}
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin inline-block" />
            ) : picks.length === 0 ? (
              'Pick Nums'
            ) : (
              'Bet'
            )}
          </button>

        </div>
      )}

      {/* Error message */}
      {betError && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-2.5 text-sm text-red-300">
          {betError}
        </div>
      )}

      {/* Placed bets this round - only visible during betting phase */}
      {placedBets.length > 0 && isBettingPhase && (
        <div className="border-t border-slate-700/50 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400 uppercase tracking-widest">This Round's Bets</p>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {placedBets.length} placed
            </span>
          </div>
          <div className="flex flex-col gap-1.5 pr-1">
            {placedBets.map((bet, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-700/40 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 w-4">#{idx + 1}</span>
                  <div className="flex flex-wrap gap-0.5">
                    {[...bet.picks].sort((a, b) => a - b).map((n) => {
                      const isHit = drawnNumbers.includes(n);
                      return (
                        <span
                          key={n}
                          className={`text-xs font-bold rounded px-1 transition-all ${
                            isHit
                              ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 font-extrabold animate-pulse'
                              : 'text-violet-300 bg-violet-900/40'
                          }`}
                        >
                          {n}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400 shrink-0">{bet.amount} ETB</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result phase */}
      {isResultPhase && (
        <div className="text-center py-2 border border-dashed border-slate-700/40 rounded-xl">
          <p className="text-slate-400 text-xs">
            {placedBets.length > 0
              ? `${placedBets.length} bet${placedBets.length !== 1 ? 's' : ''} placed — checking results…`
              : 'No bets placed this round.'}
          </p>
        </div>
      )}

    </div>
  );
}
