import { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import GamePage from './pages/GamePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { useStore } from './store';
import { walletApi } from './api';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token } = useStore();
  if (token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { setBalance } = useStore();
  const [depositAmount, setDepositAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleDeposit = async () => {
    if (depositAmount <= 0) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await walletApi.deposit(depositAmount);
      setBalance(res.data.balance);
      setMessage({ text: `+${depositAmount} ETB deposited successfully!`, type: 'success' });
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1500);
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
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700/60 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-scale-up my-8 sm:my-16"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 border-b border-slate-700/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl">
              💰
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Deposit Funds</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">Add chips instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-1.5">
            {[50, 100, 200, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => setDepositAmount(amt)}
                className={`text-xs py-2 rounded-xl border transition-all font-bold cursor-pointer ${
                  depositAmount === amt
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                    : 'bg-slate-800 border-slate-700/50 text-slate-300 hover:border-emerald-500'
                }`}
              >
                {amt} ETB
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="number"
              value={depositAmount}
              min={1}
              onChange={(e) => setDepositAmount(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-800 border border-slate-700/60 rounded-2xl pl-4 pr-12 py-3 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">ETB</span>
          </div>

          <button
            onClick={handleDeposit}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 transition-all shadow-lg shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? 'Processing…' : `Confirm ${depositAmount} ETB Deposit`}
          </button>

          {message && (
            <p className={`text-xs text-center font-semibold animate-pulse ${
              message.type === 'success' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const { balance, setBalance } = useStore();
  const [withdrawAmount, setWithdrawAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleWithdraw = async () => {
    if (withdrawAmount <= 0) return;
    if (withdrawAmount > (balance ?? 0)) {
      setMessage({ text: 'Insufficient balance.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await walletApi.withdraw(withdrawAmount);
      setBalance(res.data.balance);
      setMessage({ text: `-${withdrawAmount} ETB withdrawn successfully!`, type: 'success' });
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Withdrawal failed.';
      setMessage({ text: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700/60 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-scale-up my-8 sm:my-16"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 border-b border-slate-700/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl">
              🏦
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Withdraw Funds</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">Cash out your chips</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-1.5">
            {[50, 100, 200, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => setWithdrawAmount(amt)}
                className={`py-2 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  withdrawAmount === amt
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                }`}
              >
                {amt} ETB
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="number"
              value={withdrawAmount}
              min={1}
              onChange={(e) => setWithdrawAmount(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-850 border border-slate-700/60 rounded-2xl pl-4 pr-12 py-3 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">ETB</span>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white transition-all shadow-lg shadow-blue-950/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? 'Processing…' : `Confirm ${withdrawAmount} ETB Withdrawal`}
          </button>

          {message && (
            <p className={`text-xs text-center font-semibold animate-pulse ${
              message.type === 'success' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  createdAt: string;
}

function TransactionHistoryModal({ isOpen, onClose }: TransactionHistoryModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await walletApi.getTransactions();
        setTransactions(res.data.transactions);
      } catch (err) {
        console.error(err);
        setError('Failed to load transaction history.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700/60 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-scale-up my-8 sm:my-16"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 border-b border-slate-700/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xl">
              📜
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Transactions</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">Your recent deposits & withdrawals</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Loading history...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs text-center font-semibold animate-pulse">
              {error}
            </div>
          )}

          {!loading && !error && transactions.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs font-semibold">
              No transactions recorded yet.
            </div>
          )}

          {!loading && !error && transactions.length > 0 && (
            <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2">
              {transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/85 hover:border-slate-700/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                      tx.type === 'DEPOSIT' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {tx.type === 'DEPOSIT' ? 'IN' : 'OUT'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {tx.type === 'DEPOSIT' ? 'Deposit Funds' : 'Withdraw Funds'}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 font-semibold font-mono">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-black font-mono ${
                      tx.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-blue-400'
                    }`}>
                      {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount} ETB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface HeaderProps {
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenHistory: () => void;
}

function Header({ onOpenDeposit, onOpenWithdraw, onOpenHistory }: HeaderProps) {
  const { user, logout, balance } = useStore();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/logo-banner.jpg" alt="Kendo" className="h-9 w-auto object-cover rounded-lg" style={{maxWidth: '120px'}} />
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-medium border border-violet-500/30">
            Live
          </span>
        </div>

        {/* User info & Balance */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Balance Pill */}
          <div 
            onClick={onOpenDeposit}
            className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full pl-2.5 sm:pl-3 pr-1 py-0.5 sm:py-1 cursor-pointer hover:bg-emerald-500/20 transition-colors"
            title="Deposit Funds"
          >
            <span className="text-[10px] sm:text-sm font-extrabold text-emerald-400 tabular-nums">
              {Math.floor(balance ?? 0)} ETB
            </span>
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white hover:scale-105 transition-transform cursor-pointer shadow-md"
            >
              {user.email[0].toUpperCase()}
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 origin-top-right">
                <div className="px-4 py-2 border-b border-slate-700/50 mb-1">
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                
                <button
                  onClick={() => { onOpenDeposit(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-emerald-400 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="opacity-70">💰</span> Deposit
                </button>
                 <button
                  onClick={() => { onOpenWithdraw(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-blue-400 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="opacity-70">🏦</span> Withdraw
                </button>
                <button
                  onClick={() => { onOpenHistory(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-violet-400 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="opacity-70">📜</span> Transaction History
                </button>
                <button
                  onClick={() => { alert('Settings coming soon!'); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700/50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="opacity-70">⚙️</span> Settings
                </button>
                
                <div className="border-t border-slate-700/50 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="opacity-70">🚪</span> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

function App() {
  const { token } = useStore();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col">
      {/* Subtle background pattern */}
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {token && (
        <Header 
          onOpenDeposit={() => setIsDepositOpen(true)} 
          onOpenWithdraw={() => setIsWithdrawOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
        />
      )}

      <main className={`flex-grow flex flex-col ${token ? 'p-3 sm:p-6' : ''}`}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <GamePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Modals */}
      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
      <WithdrawModal isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} />
      <TransactionHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </div>
  );
}

export default App;
