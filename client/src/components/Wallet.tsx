import { useState } from 'react';
import { useStore } from '../store';
import { walletApi } from '../api';

export default function Wallet() {
  const { balance, setBalance } = useStore();
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleDeposit = async () => {
    if (depositAmount <= 0) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await walletApi.deposit(depositAmount);
      setBalance(res.data.balance);
      setMessage({ text: `+${depositAmount} ETB deposited successfully!`, type: 'success' });
      setTimeout(() => {
        setShowDeposit(false);
        setMessage(null);
      }, 2000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Deposit failed.';
      setMessage({ text: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
      <div className="px-5 py-4">
        {/* Balance display */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Balance</p>
            <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">
              {(balance ?? 0).toFixed(2)} ETB
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl">
            💰
          </div>
        </div>

        {/* Deposit button */}
        <button
          id="deposit-btn"
          onClick={() => setShowDeposit(!showDeposit)}
          className="w-full py-2 rounded-xl text-sm font-semibold bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-600/30 hover:border-emerald-400 transition-all cursor-pointer"
        >
          {showDeposit ? '✕ Cancel' : '+ Deposit Funds'}
        </button>

        {/* Deposit panel */}
        {showDeposit && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-1.5">
              {[50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setDepositAmount(amt)}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-all font-medium cursor-pointer ${depositAmount === amt
                      ? 'bg-emerald-600 border-emerald-400 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-emerald-500'
                    }`}
                >
                  {amt} ETB
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                id="deposit-amount-input"
                type="number"
                value={depositAmount}
                min={1}
                onChange={(e) => setDepositAmount(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-700/60 border border-slate-600 rounded-xl pl-4 pr-12 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">ETB</span>
            </div>
            <button
              id="confirm-deposit-btn"
              onClick={handleDeposit}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Processing…' : `Confirm ${depositAmount} ETB Deposit`}
            </button>
            {message && (
              <p className={`text-xs text-center ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {message.text}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
