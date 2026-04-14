'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Trees } from 'lucide-react';

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
    <main className="min-h-screen bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-white/95 dark:bg-emerald-900/70 shadow-2xl shadow-emerald-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden">
        <div className="bg-emerald-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-700 p-2">
              <Trees size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">DENR-CAR eDTs</h1>
              <p className="text-xs uppercase tracking-wider text-emerald-100">Planning and Management Division</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2 text-emerald-800 dark:text-emerald-100">
              <Lock size={18} />
              <h2 className="text-lg font-semibold">Login</h2>
            </div>
            <p className="text-sm text-emerald-700/80 dark:text-emerald-200/80">
              Sign in to access the internal document tracking system.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                className="w-full rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 text-emerald-900 outline-none transition-all focus:ring-2 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-50"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 text-emerald-900 outline-none transition-all focus:ring-2 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-50"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-4 text-xs text-emerald-600/80 dark:text-emerald-300/70">
            Default login: `pmd_admin` / `pmd_admin`
          </p>
        </div>
      </div>
    </main>
  );
}
