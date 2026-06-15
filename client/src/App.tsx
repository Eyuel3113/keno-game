import { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import GamePage from './pages/GamePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import { useStore } from './store';
import { walletApi, authApi } from './api';

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
  const [depositAmount, setDepositAmount] = useState(100);
  const [depositMethod, setDepositMethod] = useState<'CBE' | 'Telebirr'>('CBE');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const ACCOUNTS = {
    CBE: '1000123456789',
    Telebirr: '0911234567'
  };

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ text: 'Account number copied!', type: 'success' });
    setTimeout(() => setMessage(null), 2000);
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
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage({ text: "Deposit requested successfully!", type: 'success' });
      setTimeout(() => {
        onClose();
        setMessage(null);
        setPaymentProof(null);
      }, 2000);
    } catch (err: unknown) {
      setMessage({ text: "You can't deposit now, try later", type: 'error' });
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
        {/* Header */}
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

        {/* Deposit panel */}
        <div className="space-y-4">
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/40">
            <button
              type="button"
              onClick={() => setDepositMethod('CBE')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                depositMethod === 'CBE' ? 'bg-yellow-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CBE
            </button>
            <button
              type="button"
              onClick={() => setDepositMethod('Telebirr')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                depositMethod === 'Telebirr' ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Telebirr
            </button>
          </div>

          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 flex justify-between items-center">
             <div>
               <p className="text-xs text-slate-400 mb-1">Deposit to {depositMethod}:</p>
               <p className="text-sm font-mono text-white font-bold">{ACCOUNTS[depositMethod]}</p>
             </div>
             <button 
               onClick={() => copyToClipboard(ACCOUNTS[depositMethod])}
               className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer text-white"
             >
               📋 Copy
             </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Amount (ETB)</label>
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
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Upload Payment Proof</label>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-700/60 border-dashed rounded-2xl cursor-pointer bg-slate-800/50 hover:bg-slate-800 hover:border-emerald-500/50 transition-all group">
              <div className="flex flex-col items-center justify-center pt-4 pb-4">
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📤</span>
                <p className="text-xs font-semibold text-slate-400 group-hover:text-emerald-400 transition-colors">
                  {paymentProof ? paymentProof.name : "Click to upload proof"}
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <button
            onClick={handleDeposit}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 transition-all shadow-lg shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? 'Processing…' : `Confirm ${depositAmount} ETB Deposit`}
          </button>
        </div>

        {message && (
          <p className={`text-xs text-center font-semibold mt-3 animate-pulse ${
            message.type === 'success' ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function TransferModal({ isOpen, onClose }: TransferModalProps) {
  const { setBalance } = useStore();
  const [transferMethod, setTransferMethod] = useState<'email' | 'phone'>('email');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [transferAmount, setTransferAmount] = useState(50);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleTransfer = async () => {
    let recipient = '';
    if (transferMethod === 'email') {
      if (!recipientEmail) {
        setMessage({ text: 'Recipient email is required.', type: 'error' });
        return;
      }
      recipient = recipientEmail;
    } else {
      if (!recipientPhone) {
        setMessage({ text: 'Recipient phone is required.', type: 'error' });
        return;
      }
      // Format Ethiopian phone: strip prefix, pass raw digits — backend will format
      let clean = recipientPhone.replace(/[^\d]/g, '');
      if (clean.startsWith('0')) clean = clean.slice(1);
      if (clean.startsWith('251')) clean = clean.slice(3);
      if (clean.length < 9) {
        setMessage({ text: 'Enter a valid 9-digit phone number.', type: 'error' });
        return;
      }
      recipient = clean; // backend will prepend +251
    }
    if (transferAmount <= 0) {
      setMessage({ text: 'Amount must be positive.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await walletApi.transfer(recipient, transferAmount);
      setBalance(res.data.balance);
      setMessage({ text: `${transferAmount} ETB sent successfully!`, type: 'success' });
      setRecipientEmail('');
      setRecipientPhone('');
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1800);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Transfer failed.';
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
        {/* Header */}
        <div className="flex items-center justify-between mb-5 border-b border-slate-700/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-violet-500/10 border border-violet-500/20">
              💸
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Transfer Funds</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">Send ETB to another player</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Transfer panel */}
        <div className="space-y-4">
          {/* Recipient method sub-tabs */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/40">
            <button
              type="button"
              onClick={() => { setTransferMethod('email'); setMessage(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                transferMethod === 'email'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ✉️ By Email
            </button>
            <button
              type="button"
              onClick={() => { setTransferMethod('phone'); setMessage(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                transferMethod === 'phone'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📱 By Phone
            </button>
          </div>

          {/* Recipient input */}
          {transferMethod === 'email' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full bg-slate-800 border border-slate-700/60 rounded-2xl px-4 py-3 text-white text-sm font-semibold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Recipient Phone</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-2xl border border-r-0 border-slate-700/60 bg-slate-700/40 text-slate-400 text-sm font-bold select-none">
                  +251
                </span>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="912345678"
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-r-2xl px-4 py-3 text-white text-sm font-semibold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Amount</label>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {[20, 50, 100, 200].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTransferAmount(amt)}
                  className={`text-xs py-2 rounded-xl border transition-all font-bold cursor-pointer ${
                    transferAmount === amt
                      ? 'bg-violet-500 border-violet-400 text-white'
                      : 'bg-slate-800 border-slate-700/50 text-slate-300 hover:border-violet-500'
                  }`}
                >
                  {amt} ETB
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="number"
                value={transferAmount}
                min={1}
                onChange={(e) => setTransferAmount(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-slate-700/60 rounded-2xl pl-4 pr-12 py-3 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">ETB</span>
            </div>
          </div>

          <button
            onClick={handleTransfer}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white transition-all shadow-lg shadow-violet-950/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? 'Sending…' : `Send ${transferAmount} ETB`}
          </button>
        </div>

        {message && (
          <p className={`text-xs text-center font-semibold mt-3 animate-pulse ${
            message.type === 'success' ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { logout, user } = useStore();
  const [view, setView] = useState<'menu' | 'email' | 'password'>('menu');

  // Email change state
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Password change state
  const [passwordCurrentPassword, setPasswordCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setView('menu');
      setEmailCurrentPassword(''); setNewEmail(''); setEmailMessage(null);
      setPasswordCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const goBack = () => { setView('menu'); setEmailMessage(null); setPasswordMessage(null); };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailCurrentPassword || !newEmail) { setEmailMessage({ text: 'All fields are required.', type: 'error' }); return; }
    setEmailLoading(true); setEmailMessage(null);
    try {
      const res = await authApi.changeEmail(emailCurrentPassword, newEmail);
      setEmailMessage({ text: res.data.message || 'Email updated! Check your new inbox to verify.', type: 'success' });
      setTimeout(() => { logout(); window.location.href = '/login'; }, 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to change email.';
      setEmailMessage({ text: msg, type: 'error' });
    } finally { setEmailLoading(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordCurrentPassword || !newPassword || !confirmPassword) { setPasswordMessage({ text: 'All fields are required.', type: 'error' }); return; }
    if (newPassword !== confirmPassword) { setPasswordMessage({ text: 'Passwords do not match.', type: 'error' }); return; }
    if (newPassword.length < 6) { setPasswordMessage({ text: 'New password must be at least 6 characters.', type: 'error' }); return; }
    setPasswordLoading(true); setPasswordMessage(null);
    try {
      const res = await authApi.changePassword(passwordCurrentPassword, newPassword);
      setPasswordMessage({ text: res.data.message || 'Password changed successfully.', type: 'success' });
      setPasswordCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => { onClose(); setPasswordMessage(null); }, 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to change password.';
      setPasswordMessage({ text: msg, type: 'error' });
    } finally { setPasswordLoading(false); }
  };

  const inputCls = (ring: string) =>
    `w-full bg-slate-800 border border-slate-700/60 rounded-2xl px-4 py-3 text-white text-sm font-semibold placeholder-slate-600 focus:outline-none focus:ring-2 ${ring} transition-all`;

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/60 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/50">
          {view !== 'menu' ? (
            <button onClick={goBack} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-base flex-shrink-0">
              ←
            </button>
          ) : (
            <div className="w-8 h-8 flex items-center justify-center text-lg flex-shrink-0">⚙️</div>
          )}
          <h3 className="flex-1 text-sm font-bold text-white">
            {view === 'menu' && 'Settings'}
            {view === 'email' && 'Change Email'}
            {view === 'password' && 'Change Password'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer flex-shrink-0">
            ✕
          </button>
        </div>

        {/* Menu list */}
        {view === 'menu' && (
          <div className="py-2">
            <button
              onClick={() => setView('email')}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-800/60 transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                ✉️
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white">Change Email</p>
                <p className="text-xs text-slate-400">Update your login email address</p>
              </div>
              <span className="text-slate-500 group-hover:text-white transition-colors text-xl font-light">›</span>
            </button>

            <div className="mx-5 h-px bg-slate-700/40" />

            <button
              onClick={() => setView('password')}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-800/60 transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                🔒
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white">Change Password</p>
                <p className="text-xs text-slate-400">Set a new secure password</p>
              </div>
              <span className="text-slate-500 group-hover:text-white transition-colors text-xl font-light">›</span>
            </button>

            <div className="mx-5 h-px bg-slate-700/40" />

            {user?.role === 'ADMIN' && (
              <button
                onClick={() => window.location.href = '/admin'}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-800/60 transition-colors group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                  👑
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-white">Admin Dashboard</p>
                  <p className="text-xs text-slate-400">Manage users and settings</p>
                </div>
                <span className="text-slate-500 group-hover:text-white transition-colors text-xl font-light">›</span>
              </button>
            )}
          </div>
        )}

        {/* Change Email form */}
        {view === 'email' && (
          <form onSubmit={handleChangeEmail} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">New Email Address</label>
              <input type="email" required autoFocus value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="newemail@example.com" className={inputCls('focus:ring-violet-500')} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Current Password</label>
              <input type="password" required value={emailCurrentPassword} onChange={(e) => setEmailCurrentPassword(e.target.value)} placeholder="••••••••" className={inputCls('focus:ring-violet-500')} />
            </div>
            <button type="submit" disabled={emailLoading} className="w-full py-3 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer">
              {emailLoading ? 'Updating…' : 'Update Email'}
            </button>
            {emailMessage && <p className={`text-xs text-center font-semibold animate-pulse ${emailMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{emailMessage.text}</p>}
          </form>
        )}

        {/* Change Password form */}
        {view === 'password' && (
          <form onSubmit={handleChangePassword} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Current Password</label>
              <input type="password" required autoFocus value={passwordCurrentPassword} onChange={(e) => setPasswordCurrentPassword(e.target.value)} placeholder="••••••••" className={inputCls('focus:ring-blue-500')} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">New Password</label>
              <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className={inputCls('focus:ring-blue-500')} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Confirm New Password</label>
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className={inputCls('focus:ring-blue-500')} />
            </div>
            <button type="submit" disabled={passwordLoading} className="w-full py-3 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer">
              {passwordLoading ? 'Changing…' : 'Change Password'}
            </button>
            {passwordMessage && <p className={`text-xs text-center font-semibold animate-pulse ${passwordMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{passwordMessage.text}</p>}
          </form>
        )}
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
  const [withdrawMethod, setWithdrawMethod] = useState<'CBE' | 'Telebirr'>('CBE');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleWithdraw = async () => {
    if (withdrawAmount <= 0) return;
    if (!withdrawAccount.trim()) {
      setMessage({ text: 'Please enter your account number.', type: 'error' });
      return;
    }
    if (withdrawAmount > (balance ?? 0)) {
      setMessage({ text: 'Insufficient balance.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await walletApi.withdraw(withdrawAmount);
      setBalance(res.data.balance);
      setMessage({ text: `Withdrawal of ${withdrawAmount} ETB requested!`, type: 'success' });
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
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-xs text-yellow-200/80 font-medium text-center">
              ⚠️ Caution: Payment withdraw takes max 2 hours.
            </p>
          </div>

          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/40">
            <button
              type="button"
              onClick={() => setWithdrawMethod('CBE')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                withdrawMethod === 'CBE' ? 'bg-yellow-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CBE
            </button>
            <button
              type="button"
              onClick={() => setWithdrawMethod('Telebirr')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                withdrawMethod === 'Telebirr' ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Telebirr
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Your {withdrawMethod} Account</label>
            <input
              type="text"
              value={withdrawAccount}
              onChange={(e) => setWithdrawAccount(e.target.value)}
              placeholder={withdrawMethod === 'CBE' ? 'e.g. 1000123456789' : 'e.g. 0911234567'}
              className="w-full bg-slate-850 border border-slate-700/60 rounded-2xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Amount (ETB)</label>
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
          </div>

          <button
            onClick={handleWithdraw}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white transition-all shadow-lg shadow-blue-950/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? 'Processing…' : `Request Withdrawal`}
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
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER_SENT' | 'TRANSFER_RECEIVED';
  amount: number;
  description?: string;
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
              <p className="text-[10px] sm:text-xs text-slate-400">Your recent deposits & transfers</p>
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
              {transactions.map((tx) => {
                const isIncoming = tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_RECEIVED';
                const typeLabel = tx.type === 'DEPOSIT'
                  ? 'Deposit Funds'
                  : tx.type === 'WITHDRAW'
                  ? 'Withdraw Funds'
                  : tx.type === 'TRANSFER_SENT'
                  ? 'Transfer Sent'
                  : 'Transfer Received';

                return (
                  <div 
                    key={tx.id} 
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/85 hover:border-slate-700/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                        isIncoming 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {isIncoming ? 'IN' : 'OUT'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {tx.description || typeLabel}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-slate-500 font-semibold font-mono">
                          {formatDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black font-mono ${
                        isIncoming ? 'text-emerald-400' : 'text-blue-400'
                      }`}>
                        {isIncoming ? '+' : '-'}{tx.amount} ETB
                      </p>
                    </div>
                  </div>
                );
              })}
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
  onOpenTransfer: () => void;
  onOpenSettings: () => void;
}

function Header({ onOpenDeposit, onOpenWithdraw, onOpenHistory, onOpenTransfer, onOpenSettings }: HeaderProps) {
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
          <button onClick={() => navigate('/')} className="cursor-pointer">
            <img src="/logo-banner.jpg" alt="Kendo" className="h-9 w-auto object-cover rounded-lg" style={{maxWidth: '120px'}} />
          </button>
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
                  onClick={() => { onOpenTransfer(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-violet-400 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="opacity-70">💸</span> Transfer
                </button>
                <button
                  onClick={() => { onOpenHistory(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-violet-400 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="opacity-70">📜</span> Transaction History
                </button>
                <button
                  onClick={() => { onOpenSettings(); setIsMenuOpen(false); }}
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
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
          onOpenTransfer={() => setIsTransferOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
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
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route
            path="/reset-password"
            element={<ResetPasswordPage />}
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Modals */}
      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
      <TransferModal isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} />
      <WithdrawModal isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} />
      <TransactionHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default App;
