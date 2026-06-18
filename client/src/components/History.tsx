import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useGame } from '../hooks/useGame';
import { authApi } from '../api';
import { useToast } from '../context/ToastContext';

export default function History() {
  const { betHistory } = useStore();
  const { refreshHistory } = useGame();
  const [activeTab, setActiveTab] = useState<'bets' | 'referral'>('bets');
  const [referralCode, setReferralCode] = useState('');
  const [referredCount, setReferredCount] = useState(0);
  const [completedReferrals, setCompletedReferrals] = useState(0);
  const [referralLoading, setReferralLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    refreshHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'referral') {
      fetchReferralInfo();
    }
  }, [activeTab]);

  const fetchReferralInfo = async () => {
    setReferralLoading(true);
    try {
      const res = await authApi.getReferralInfo();
      setReferralCode(res.data.referralCode);
      setReferredCount(res.data.referredCount);
      setCompletedReferrals(res.data.completedReferrals);
    } catch (error) {
      console.error('Failed to fetch referral info:', error);
    } finally {
      setReferralLoading(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast('Referral code copied!', 'success');
  };

  const shareReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast('Referral link copied!', 'success');
  };

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
      {/* Header with tabs */}
      <div className="px-5 py-4 border-b border-slate-700/50">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('bets')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'bets'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Recent Bets
          </button>
          <button
            onClick={() => setActiveTab('referral')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'referral'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            🎁 Referral
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-96">
        {activeTab === 'bets' ? (
          <>
            <div className="px-5 py-3 flex items-center justify-between border-b border-slate-700/30">
              <span className="text-sm text-slate-400">Your betting history</span>
              <button
                id="refresh-history-btn"
                onClick={refreshHistory}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                title="Refresh history"
              >
                ↻ Refresh
              </button>
            </div>
            <div className="divide-y divide-slate-700/40">
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
          </>
        ) : (
          <div className="p-5 space-y-4">
            {referralLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                <div className="h-12 bg-slate-700 rounded"></div>
                <div className="h-4 bg-slate-700 rounded w-3/4"></div>
              </div>
            ) : (
              <>
                {/* Referral Code Card */}
                <div className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-xl p-4">
                  <p className="text-violet-300 text-sm font-semibold mb-2">Your Referral Code</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-900/80 rounded-lg px-4 py-3 text-white font-mono text-xl tracking-wider font-bold">
                      {referralCode}
                    </div>
                    <button
                      onClick={copyReferralCode}
                      className="p-3 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
                      title="Copy code"
                    >
                      📋
                    </button>
                  </div>
                </div>

                {/* Share Button */}
                <button
                  onClick={shareReferralLink}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl text-white font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <span>🔗</span>
                  Share Referral Link
                </button>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                    <p className="text-slate-400 text-xs mb-1">Total Referred</p>
                    <p className="text-white text-2xl font-bold">{referredCount}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                    <p className="text-slate-400 text-xs mb-1">Completed Deposits</p>
                    <p className="text-emerald-400 text-2xl font-bold">{completedReferrals}</p>
                  </div>
                </div>

                {/* Bonus Info */}
                <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-xl p-4">
                  <p className="text-emerald-300 text-sm font-semibold mb-1">🎉 Earn 10% Bonus!</p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Get 10% of your referral's first deposit amount as a bonus when they make their first deposit.
                  </p>
                </div>

                {/* How it works */}
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <p className="text-white text-sm font-semibold mb-2">How it works:</p>
                  <ol className="text-slate-400 text-xs space-y-1.5 list-decimal list-inside">
                    <li>Share your referral code or link with friends</li>
                    <li>They register using your code</li>
                    <li>When they make their first deposit, you get 10% bonus!</li>
                  </ol>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
