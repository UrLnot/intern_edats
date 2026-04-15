'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Trees, ShieldCheck } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useThemeValue } from '@/components/ThemeProvider';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme } = useThemeValue();

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
      className={`min-h-screen flex flex-col items-center justify-center px-4 py-6 relative overflow-hidden ${
        theme === 'dark' ? 'dark' : 'light'
      }`}
      style={{
        backgroundImage: 'url("/image.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-[2px]"></div>

      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl mb-4 border border-white/20">
            <Trees className="text-emerald-400" size={40} />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Internal <span className="text-emerald-400">eDTS</span>
          </h1>
          <p className="text-xs sm:text-sm font-bold text-emerald-200 mt-3 uppercase tracking-[0.2em] sm:tracking-[0.3em]">
            Planning and Management Division
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-gray-200 dark:border-slate-700">
          <div className="mb-8">
            <div className="flex items-center gap-3 text-emerald-900 dark:text-white mb-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                <ShieldCheck className="text-emerald-600 dark:text-emerald-400" size={24} />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">System Login</h2>
            </div>
            <p className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400">
              Please enter your authorized credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 ml-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                placeholder="Enter your username"
                className="w-full rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-4 sm:p-4 text-gray-900 dark:text-white outline-none transition-all focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500 text-base"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-4 sm:p-4 pr-12 text-gray-900 dark:text-white outline-none transition-all focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500 text-base"
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              </div>
            </div>

            {error ? (
              <div className="rounded-xl sm:rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 text-sm font-semibold text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl sm:rounded-2xl bg-emerald-600 dark:bg-emerald-600 px-4 py-4 text-sm sm:text-base font-bold text-white shadow-xl shadow-emerald-600/30 transition-all hover:bg-emerald-700 dark:hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 uppercase tracking-widest"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Authenticating...
                </span>
              ) : 'Access Dashboard'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
            <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-bold text-center uppercase tracking-widest">
                Document Tracking &bull; v1.0
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs sm:text-sm font-bold text-emerald-200/60 uppercase tracking-widest">
          Department of Environment and Natural Resources - CAR
        </p>
      </div>
    </main>
  );
}
