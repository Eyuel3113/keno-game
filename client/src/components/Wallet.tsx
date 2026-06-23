import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { walletApi, authApi } from '../api';
import { useToast } from '../context/ToastContext';

export default function Wallet() {
  const { balance, setBalance } = useStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'transfer' | 'referral' | null>(null);

  // Deposit State
  const [depositAmount, setDepositAmount] = useState(100);
  const [depositMethod, setDepositMethod] = useState<'CBE' | 'Telebirr'>('CBE');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  // Withdraw State
  const [withdrawAmount, setWithdrawAmount] = useState(100);
  const [withdrawMethod, setWithdrawMethod] = useState<'CBE' | 'Telebirr'>('CBE');

  // Transfer State
  const [recipientEmail, setRecipientEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState(50);

  // Referral State
  const [referralCode, setReferralCode] = useState('');
  const [referredCount, setReferredCount] = useState(0);
  const [completedReferrals, setCompletedReferrals] = useState(0);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [referralLoading, setReferralLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const ACCOUNTS = {
    CBE: '1000123456789',
    Telebirr: '0911234567'
  };

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
      setReferredUsers(res.data.referredUsers || []);
    } catch (error) {
      console.error('Failed to fetch referral info:', error);
    } finally {
      setReferralLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ text: 'Account number copied!', type: 'success' });
    setTimeout(() => setMessage(null), 2000);
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast('Referral code copied!', 'success');
  };

  const shareViaTelegram = () => {
    const message = `🎁 Join Keno Game using my referral code: ${referralCode}\n\nGet a 50% bonus on your first deposit when you sign up!\n\n${window.location.origin}?ref=${referralCode}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin + '?ref=' + referralCode)}&text=${encodeURIComponent(message)}`;
    window.open(telegramUrl, '_blank');
  };

  const handleDeposit = async () => {
    if (depositAmount <= 0) return;
    if (!paymentProof) {
      setMessage({ text: 'Please upload payment proof.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      // Assuming api just needs amount for now, in real app we'd upload the file
      const res = await walletApi.deposit(depositAmount);
      setBalance(res.data.balance);
      setMessage({ text: `+${depositAmount} ETB deposit requested successfully!`, type: 'success' });
      setTimeout(() => {
        setActiveTab(null);
        setMessage(null);
        setPaymentProof(null);
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

  const handleWithdraw = async () => {
    if (withdrawAmount <= 0) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await walletApi.withdraw(withdrawAmount);
      setBalance(res.data.balance);
      setMessage({ text: `${withdrawAmount} ETB withdrawal requested!`, type: 'success' });
      setTimeout(() => {
        setActiveTab(null);
        setMessage(null);
      }, 2000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Withdrawal failed.';
      setMessage({ text: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!recipientEmail) {
      setMessage({ text: 'Recipient email is required.', type: 'error' });
      return;
    }
    if (transferAmount <= 0) {
      setMessage({ text: 'Amount must be positive.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await walletApi.transfer(recipientEmail, transferAmount);
      setBalance(res.data.balance);
      setMessage({ text: `${transferAmount} ETB transferred to ${recipientEmail}!`, type: 'success' });
      setRecipientEmail('');
      setTimeout(() => {
        setActiveTab(null);
        setMessage(null);
      }, 2000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Transfer failed.';
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

        {/* Actions selection */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setActiveTab(activeTab === 'deposit' ? null : 'deposit'); setMessage(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              activeTab === 'deposit'
                ? 'bg-emerald-600 border-emerald-400 text-white'
                : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 border-emerald-600/20 hover:border-emerald-500'
            }`}
          >
            💰 Deposit
          </button>
          <button
            onClick={() => { setActiveTab(activeTab === 'withdraw' ? null : 'withdraw'); setMessage(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              activeTab === 'withdraw'
                ? 'bg-blue-600 border-blue-400 text-white'
                : 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 border-blue-600/20 hover:border-blue-500'
            }`}
          >
            🏦 Withdraw
          </button>
          <button
            onClick={() => { setActiveTab(activeTab === 'transfer' ? null : 'transfer'); setMessage(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              activeTab === 'transfer'
                ? 'bg-violet-600 border-violet-400 text-white'
                : 'bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 border-violet-600/20 hover:border-violet-500'
            }`}
          >
            💸 Transfer
          </button>
          <button
            onClick={() => { setActiveTab(activeTab === 'referral' ? null : 'referral'); setMessage(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              activeTab === 'referral'
                ? 'bg-amber-600 border-amber-400 text-white'
                : 'bg-amber-600/10 hover:bg-amber-600/20 text-amber-300 border-amber-600/20 hover:border-amber-500'
            }`}
          >
            🎁 Referral
          </button>
        </div>

        {/* Deposit panel */}
        {activeTab === 'deposit' && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
               <button
                  onClick={() => setDepositMethod('CBE')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${depositMethod === 'CBE' ? 'bg-yellow-600 border-yellow-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-yellow-500'}`}
               >CBE</button>
               <button
                  onClick={() => setDepositMethod('Telebirr')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${depositMethod === 'Telebirr' ? 'bg-green-600 border-green-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-green-500'}`}
               >Telebirr</button>
            </div>
            
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
               <div>
                 <p className="text-xs text-slate-400 mb-1">Deposit to {depositMethod} Account:</p>
                 <p className="text-sm font-mono text-white font-bold">{ACCOUNTS[depositMethod]}</p>
               </div>
               <button 
                 onClick={() => copyToClipboard(ACCOUNTS[depositMethod])}
                 className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
               >
                 📋 Copy
               </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Amount (ETB)</label>
              <div className="relative">
                <input
                  type="number"
                  value={depositAmount}
                  min={1}
                  onChange={(e) => setDepositAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-700/60 border border-slate-600 rounded-xl pl-4 pr-12 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">ETB</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Upload Payment Proof</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 transition-all cursor-pointer"
              />
            </div>

            <button
              onClick={handleDeposit}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Processing…' : `Confirm Deposit`}
            </button>
          </div>
        )}

        {/* Withdraw panel */}
        {activeTab === 'withdraw' && (
          <div className="mt-3 space-y-3">
             <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
               <p className="text-xs text-yellow-200/80 font-medium text-center">
                 ⚠️ Caution: Payment withdraw takes max 2 hours.
               </p>
             </div>

             <div className="flex gap-2">
               <button
                  onClick={() => setWithdrawMethod('CBE')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${withdrawMethod === 'CBE' ? 'bg-yellow-600 border-yellow-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-yellow-500'}`}
               >CBE</button>
               <button
                  onClick={() => setWithdrawMethod('Telebirr')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${withdrawMethod === 'Telebirr' ? 'bg-green-600 border-green-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-green-500'}`}
               >Telebirr</button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Amount (ETB)</label>
              <div className="relative">
                <input
                  type="number"
                  value={withdrawAmount}
                  min={1}
                  onChange={(e) => setWithdrawAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-700/60 border border-slate-600 rounded-xl pl-4 pr-12 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">ETB</span>
              </div>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Processing…' : `Request Withdrawal`}
            </button>
          </div>
        )}

        {/* Transfer panel */}
        {activeTab === 'transfer' && (
          <div className="mt-3 space-y-2.5">
            <div>
              <label htmlFor="transfer-recipient" className="block text-xs font-medium text-slate-400 mb-1">
                Recipient (Email, Phone, @username, or Telegram ID)
              </label>
              <input
                id="transfer-recipient"
                type="text"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="@username, email, phone, or Telegram ID"
                className="w-full bg-slate-700/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>
            <div>
              <label htmlFor="transfer-amount" className="block text-xs font-medium text-slate-400 mb-1">
                Amount (ETB)
              </label>
              <div className="relative">
                <input
                  id="transfer-amount"
                  type="number"
                  value={transferAmount}
                  min={1}
                  onChange={(e) => setTransferAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-700/60 border border-slate-600 rounded-xl pl-3 pr-12 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">ETB</span>
              </div>
            </div>
            <button
              id="confirm-transfer-btn"
              onClick={handleTransfer}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Processing…' : `Transfer ${transferAmount} ETB`}
            </button>
          </div>
        )}

        {/* Referral panel */}
        {activeTab === 'referral' && (
          <div className="mt-3 space-y-3">
            {referralLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                <div className="h-12 bg-slate-700 rounded"></div>
                <div className="h-4 bg-slate-700 rounded w-3/4"></div>
              </div>
            ) : (
              <>
                {/* Referral Code Card */}
                <div className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-xl p-4">
                  <p className="text-amber-300 text-sm font-semibold mb-2">Your Referral Code</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-900/80 rounded-lg px-4 py-3 text-white font-mono text-xl tracking-wider font-bold">
                      {referralCode}
                    </div>
                    <button
                      onClick={copyReferralCode}
                      className="p-3 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
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
                            <div className="w-8 h-8 bg-amber-600/20 rounded-full flex items-center justify-center">
                              <span className="text-amber-400 text-sm">👤</span>
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
                  <p className="text-emerald-300 text-sm font-semibold mb-1">🎉 Earn 10% Referral Bonus!</p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Get 10% of your referral's first deposit as a bonus. Your referred friends also get a 50% bonus on their first deposit!
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {message && (
          <p className={`text-xs text-center mt-2.5 ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
