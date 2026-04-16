'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { EDATEntry } from '@/types/edat';
import EDATTable from '@/components/EDATTable';
import SearchInput from '@/components/SearchInput';
import ThemeToggle from '@/components/ThemeToggle';
import { useThemeValue } from '@/components/ThemeProvider';
import { LogOut, Plus, Trees } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [entries, setEntries] = useState<EDATEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { theme } = useThemeValue();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch('/api/edats');
        if (response.ok) {
          const data = await response.json();
          setEntries(data);
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch from API:', response.status, errorText);
        }
      } catch (e) {
        console.error('Failed to fetch records', e);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchEntries();
  }, []);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter((entry) =>
      entry.trackingNumber.toLowerCase().includes(query) ||
      entry.edatsNumber.toLowerCase().includes(query) ||
      entry.sender.toLowerCase().includes(query) ||
      entry.subject.toLowerCase().includes(query) ||
      entry.receiver.toLowerCase().includes(query)
    );
  }, [entries, searchQuery]);

  const handleView = (entry: EDATEntry) => {
    router.push(`/edats/${encodeURIComponent(entry.id)}`);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      try {
        const response = await fetch(`/api/edats/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setEntries(prev => prev.filter(e => e.id !== id));
        }
      } catch (error) {
        console.error('Failed to delete entry', error);
        alert('Failed to delete entry.');
      }
    }
  };

  const openAddModal = () => {
    router.push('/edats/new');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  if (!isLoaded) return null;

  return (
    <main className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="bg-emerald-900 dark:bg-emerald-950 text-white py-2 px-4 text-xs sm:text-sm uppercase tracking-widest font-bold flex justify-between items-center shrink-0 border-b border-emerald-200 dark:border-emerald-800">
        <span className="hidden sm:block">Planning and Management Division</span>
        <span className="sm:hidden text-[10px]">PMD</span>
        <div className="flex items-center gap-3 font-mono text-[10px] sm:text-xs">
          <span>{formattedDate}</span>
          <span className="text-emerald-300">{formattedTime}</span>
        </div>
      </div>

      <div className="flex-1 max-w-[1800px] mx-auto px-2 sm:px-4 py-4 w-full">
        <header className="mb-4">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-emerald-700 dark:bg-emerald-800 rounded-lg sm:rounded-xl text-white">
                <Trees size={20} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-extrabold text-emerald-900 dark:text-emerald-50 tracking-tight">eDTS</h1>
                <p className="text-[10px] sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider leading-tight">Document Tracking System</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100 rounded-lg transition-all font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs sm:text-sm"
              >
                <LogOut size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="w-full">
            <SearchInput value={searchQuery} onChange={setSearchQuery} />
          </div>
          <button
            onClick={openAddModal}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-lg transition-all font-semibold text-sm sm:text-base shadow-md"
          >
            <Plus size={18} />
            <span>New Entry</span>
          </button>
        </div>

        <section className="bg-white dark:bg-emerald-900/50 rounded-xl sm:rounded-2xl shadow-lg border border-emerald-200 dark:border-emerald-800 overflow-hidden transition-all p-1.5">
          <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-emerald-50/50 dark:bg-emerald-900/30 border-b border-emerald-200 dark:border-emerald-800 flex items-center">
             <h2 className="text-[10px] sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Document Registry</h2>
          </div>
          <EDATTable
            entries={filteredEntries}
            onDelete={handleDelete}
            onView={handleView}
          />
        </section>
      </div>

      <footer className="w-full bg-gray-100 dark:bg-emerald-950 border-t border-emerald-200 dark:border-emerald-800 py-3 px-4 sm:px-6 flex flex-col justify-center items-center text-center gap-1 shrink-0">
        <p className="text-[10px] sm:text-sm font-medium text-gray-600 dark:text-emerald-400/60">© {new Date().getFullYear()} Department of Environment and Natural Resources - CAR</p>
        <p className="text-[10px] text-gray-500 dark:text-emerald-600/50 uppercase tracking-wider italic">Working towards a sustainable environment</p>
      </footer>
    </main>
  );
}
