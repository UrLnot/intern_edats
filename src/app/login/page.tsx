'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Trees, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Unable to login');
        return;
      }

      router.push('/');
      router.refresh();
    } catch (loginError) {
      console.error('Login request failed:', loginError);
      setError('Unable to login right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main 
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{
        backgroundImage: 'url("/image.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Darkened Overlay for readability */}
      <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-[2px]"></div>

      {/* Top Accent Line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 z-20"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-white/90 dark:bg-slate-900/90 rounded-3xl shadow-2xl backdrop-blur-md mb-4 border border-white/20">
            <Trees className="text-emerald-600" size={40} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-lg">
            DENR-CAR <span className="text-emerald-400">eDTs</span>
          </h1>
          <p className="text-xs font-bold text-emerald-50 mt-2 uppercase tracking-[0.3em] drop-shadow-md">
            Planning and Management Division
          </p>
        </div>

        <div className="bg-white/85 dark:bg-slate-900/85 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-xl border border-white/30 dark:border-slate-800/50">
          <div className="mb-8">
            <div className="flex items-center gap-3 text-slate-900 dark:text-white mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <ShieldCheck className="text-emerald-600 dark:text-emerald-400" size={24} />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">System Login</h2>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Please enter your authorized credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 ml-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                placeholder="Enter your username"
                className="w-full rounded-2xl border border-slate-200 bg-white/50 p-4 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-800/50 dark:text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full rounded-2xl border border-slate-200 bg-white/50 p-4 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-800/50 dark:text-white placeholder:text-slate-400"
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50/90 p-4 text-sm font-semibold text-red-600 animate-in fade-in slide-in-from-top-1 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-black text-white shadow-xl shadow-emerald-600/30 transition-all hover:bg-emerald-700 hover:shadow-emerald-700/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 uppercase tracking-widest"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Authenticating...
                </span>
              ) : 'Access Dashboard'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
            <div className="bg-emerald-50/50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100/50 dark:border-emerald-800/50">
              <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold text-center uppercase tracking-widest">
                Document Tracking &bull; v1.0
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] font-bold text-white/60 uppercase tracking-widest">
          Department of Environment and Natural Resources
        </p>
      </div>
    </main>
  );
}
