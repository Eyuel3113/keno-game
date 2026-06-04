import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err?.response?.data?.message || 'The verification link is invalid or has expired.'
        );
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 60% 30%, #0d3320 0%, #051a0e 40%, #020d07 100%)' }}
    >
      {/* Glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-green-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <img
            src="/logo-banner.jpg"
            alt="Keno"
            className="w-full max-w-sm rounded-2xl object-cover shadow-2xl shadow-slate-950/60 mb-4"
            style={{ maxHeight: '180px' }}
          />
        </div>

        <div className="bg-slate-800/70 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl p-8 text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center mx-auto">
                <span className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin inline-block" />
              </div>
              <h2 className="text-xl font-bold text-white">Verifying your email…</h2>
              <p className="text-slate-400 text-sm">Please wait a moment.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto animate-bounce">
                ✅
              </div>
              <h2 className="text-xl font-bold text-white">Email verified!</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
              <Link
                to="/login?verified=1"
                className="inline-block mt-2 w-full py-3.5 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-900/50 transition-all hover:scale-[1.01] active:scale-[0.99] text-center"
              >
                Sign In Now
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl mx-auto">
                ❌
              </div>
              <h2 className="text-xl font-bold text-white">Verification failed</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
              <p className="text-slate-500 text-xs">
                Try registering again or{' '}
                <Link to="/login" className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2">
                  go back to sign in
                </Link>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
