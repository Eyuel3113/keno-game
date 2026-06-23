import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { authApi } from '../api';

export default function RegisterPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialReferralCode = searchParams.get('ref') || '';

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { register, loading } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast('Password must be at least 6 characters.', 'warning');
      return;
    }
    if (password !== confirm) {
      toast('Passwords do not match.', 'warning');
      return;
    }

    let formattedPhone = undefined;
    if (phone) {
      let cleanPhone = phone.replace(/[^\d]/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.slice(1);
      }
      if (cleanPhone.startsWith('251')) {
        cleanPhone = cleanPhone.slice(3);
      }
      if (cleanPhone.length < 9) {
        toast('Please enter a valid 9-digit phone number.', 'warning');
        return;
      }
      formattedPhone = `+251${cleanPhone}`;
    }

    try {
      await register(email, password, formattedPhone, toast, referralCode);
      setSubmitted(true);
    } catch {
      // error already shown via toast
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await authApi.resendVerification(email);
      toast('Verification email resent! Check your inbox.', 'success');
    } catch {
      toast('Could not resend. Please try again.', 'error');
    } finally {
      setResendLoading(false);
    }
  };

  const strengthScore = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthScore];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500'][strengthScore];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 60% 30%, #0d3320 0%, #051a0e 40%, #020d07 100%)' }}
    >
      {/* Animated green glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-green-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-0 w-48 h-48 bg-lime-500/6 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo-banner.jpg" alt="Kendo" className="w-full max-w-sm rounded-2xl object-cover shadow-2xl shadow-slate-950/60 mb-4" style={{ maxHeight: '180px' }} />
          <p className="text-slate-400 text-sm mt-1">Create your free account</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/70 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl p-8">

          {submitted ? (
            /* ── Email sent confirmation ── */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-3xl mx-auto">
                📬
              </div>
              <h2 className="text-xl font-bold text-white">Check your email!</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                We sent a verification link to{' '}
                <span className="text-violet-300 font-medium">{email}</span>.
                Click it to activate your account and get a 50% bonus on your first deposit.
              </p>
              <p className="text-slate-500 text-xs">
                Didn't get it?{' '}
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2 disabled:opacity-50"
                >
                  {resendLoading ? 'Sending…' : 'Resend verification email'}
                </button>
              </p>
              <Link
                to="/login"
                className="inline-block mt-2 text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium"
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            /* ── Registration form ── */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="reg-phone" className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number (Optional)
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-600 bg-slate-700/40 text-slate-400 text-sm font-semibold select-none">
                    +251
                  </span>
                  <input
                    id="reg-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="912345678"
                    className="w-full bg-slate-700/60 border border-slate-600 rounded-r-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-referral" className="block text-sm font-medium text-slate-300 mb-2">
                  Referral Code (Optional)
                </label>
                <input
                  id="reg-referral"
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="Enter referral code"
                  className="w-full bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all uppercase"
                />
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Min. 6 characters"
                    className="w-full bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 pr-11 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-lg transition-colors"
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
                {/* Strength meter */}
                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            i <= strengthScore ? strengthColor : 'bg-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">{strengthLabel}</span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="reg-confirm" className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  className={`w-full bg-slate-700/60 border rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
                    confirm && confirm !== password ? 'border-red-500' : 'border-slate-600'
                  }`}
                />
              </div>

              <button
                id="register-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>

              <p className="text-center text-sm text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
