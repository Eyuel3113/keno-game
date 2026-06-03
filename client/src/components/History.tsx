import { useEffect } from 'react';
import { useStore } from '../store';
import { useGame } from '../hooks/useGame';

export default function History() {
  const { betHistory } = useStore();
  const { refreshHistory } = useGame();

  useEffect(() => {
    refreshHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white tracking-wide">Recent Bets</h2>
        <button
          id="refresh-history-btn"
          onClick={refreshHistory}
          className="text-xs text-slate-400 hover:text-violet-300 transition-colors"
          title="Refresh history"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="overflow-y-auto max-h-72 divide-y divide-slate-700/40">
        {betHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🎰</p>
            <p className="text-slate-500 text-sm">No bets yet. Place your first bet!</p>
          </div>
        ) : (
          betHistory.map((bet) => {
            const isPending = bet.roundStatus === 'PENDING' || bet.roundStatus === 'DRAWING';
            const won = bet.payout > 0;
            const profitLoss = bet.payout - bet.amount;
            return (
              <div
                key={bet.id}
                className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-700/30 transition-colors"
              >
                {/* Left: time + hits */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-xs font-semibold ${
                      isPending ? 'text-violet-400 animate-pulse' : won ? 'text-emerald-400' : 'text-slate-400'
                    }`}>
                      {isPending ? '⏳ Pending' : won ? '🏆 Win' : '• Loss'}
                    </span>
                    <span className="text-slate-600 text-xs">·</span>
                    <span className="text-xs text-slate-500">
                      {isPending ? '-' : bet.hits}/{bet.picks.length} hits
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {new Date(bet.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Middle: bet amount */}
                <div className="text-center">
                  <p className="text-xs text-slate-500">Bet</p>
                  <p className="text-sm font-semibold text-slate-300">{bet.amount} ETB</p>
                </div>

                {/* Right: payout */}
                <div className="text-right">
                  <p className="text-xs text-slate-500">P/L</p>
                  {isPending ? (
                    <p className="text-sm font-semibold text-slate-400 italic">Pending</p>
                  ) : (
                    <p className={`text-sm font-bold ${won ? 'text-emerald-400' : 'text-red-400'}`}>
                      {profitLoss >= 0 ? `+${profitLoss.toFixed(2)} ETB` : `-${Math.abs(profitLoss).toFixed(2)} ETB`}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
