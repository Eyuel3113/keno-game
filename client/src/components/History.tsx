import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useGame } from '../hooks/useGame';
import { authApi } from '../api';
import { useToast } from '../context/ToastContext';

export default function History() {
  const { betHistory } = useStore();
  const { refreshHistory } = useGame();
  const [referralCode, setReferralCode] = useState('');
  const [referredCount, setReferredCount] = useState(0);
  const [completedReferrals, setCompletedReferrals] = useState(0);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [referralLoading, setReferralLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    refreshHistory();
    fetchReferralInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReferralInfo = async () => {
    setReferralLoading(true);
    try {
      const res = await authApi.getReferralInfo();
      setReferralCode(res.data.referralCode);
      setReferredCount(res.data.referredCount);
      setCompletedReferrals(res.data.completedReferrals);
      setReferredUsers(res.data.referredUsers || []);
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

  const shareViaTelegram = () => {
    const message = `🎁 Join Keno Game using my referral code: ${referralCode}\n\nGet 50 free chips when you sign up!\n\n${window.location.origin}?ref=${referralCode}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin + '?ref=' + referralCode)}&text=${encodeURIComponent(message)}`;
    window.open(telegramUrl, '_blank');
  };

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

      {/* Bets History */}
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

      {/* Referral Section */}
      <div className="border-t border-slate-700/50">
        <div className="px-5 py-4 bg-gradient-to-r from-violet-600/10 to-purple-600/10 border-b border-slate-700/30">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🎁</span>
            Referral Program
          </h3>
        </div>
        
        {referralLoading ? (
          <div className="p-5 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-1/2 mb-4"></div>
            <div className="h-12 bg-slate-700 rounded mb-4"></div>
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
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

            {/* Telegram Share Button */}
            <button
              onClick={shareViaTelegram}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 rounded-xl text-white font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0-.319 0-.6-.258-.6-.6 0-.06.012-.118.034-.172l2.09-5.03-4.61 1.15c-.5.125-.976-.017-1.14-.64L5.03 8.19c-.164-.623.21-1.05.848-1.05h10.66c.638 0 .954.427.79 1.05z"/>
              </svg>
              Share via Telegram
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

            {/* Referred Users List */}
            {referredUsers.length > 0 && (
              <div className="bg-slate-700/30 rounded-xl p-4">
                <p className="text-white text-sm font-semibold mb-3">Referred Users</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {referredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-violet-600/20 rounded-full flex items-center justify-center">
                          <span className="text-violet-400 text-sm">👤</span>
                        </div>
                        <div>
                          <p className="text-white text-xs font-medium">
                            {user.telegramUsername ? `@${user.telegramUsername}` : user.email || 'Unknown'}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {user.phoneNumber || 'No phone'}
                          </p>
                        </div>
                      </div>
                      {user.hasReceivedFirstDepositBonus ? (
                        <span className="text-emerald-400 text-xs font-semibold">✓ Completed</span>
                      ) : (
                        <span className="text-slate-500 text-xs">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bonus Info */}
            <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-emerald-300 text-sm font-semibold mb-1">🎉 Earn 10% Bonus!</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Get 10% of your referral's first deposit amount as a bonus when they make their first deposit.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
