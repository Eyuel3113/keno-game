import { useState, useEffect } from 'react';
import { authApi } from '../api';
import { useToast } from '../context/ToastContext';

export default function Referral() {
  const [referralCode, setReferralCode] = useState('');
  const [referredCount, setReferredCount] = useState(0);
  const [completedReferrals, setCompletedReferrals] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReferralInfo();
  }, []);

  const fetchReferralInfo = async () => {
    try {
      const res = await authApi.getReferralInfo();
      setReferralCode(res.data.referralCode);
      setReferredCount(res.data.referredCount);
      setCompletedReferrals(res.data.completedReferrals);
    } catch (error) {
      console.error('Failed to fetch referral info:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="bg-slate-800/70 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/2 mb-4"></div>
          <div className="h-12 bg-slate-700 rounded mb-4"></div>
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/70 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🎁</span>
        Referral Program
      </h3>
      
      <div className="space-y-4">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-2">Your Referral Code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 rounded-lg px-4 py-3 text-white font-mono text-lg tracking-wider">
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

        <button
          onClick={shareReferralLink}
          className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl text-white font-semibold transition-all"
        >
          Share Referral Link
        </button>

        <div className="bg-slate-700/50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Total Referred</span>
            <span className="text-white font-bold">{referredCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Completed Deposits</span>
            <span className="text-emerald-400 font-bold">{completedReferrals}</span>
          </div>
        </div>

        <div className="bg-violet-600/10 border border-violet-500/30 rounded-xl p-4">
          <p className="text-violet-300 text-sm font-semibold mb-1">🎉 Earn 10% Bonus!</p>
          <p className="text-slate-400 text-xs">
            Get 10% of your referral's first deposit amount as a bonus when they make their first deposit.
          </p>
        </div>
      </div>
    </div>
  );
}
