'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EDATEntry } from '@/types/edat';
import EDATCards from '@/components/EDATCards';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import SearchInput from '@/components/SearchInput';
import ThemeToggle from '@/components/ThemeToggle';
import { useThemeValue } from '@/components/ThemeProvider';
import { LogOut, Plus, Trees, Filter, ChevronDown, CheckCircle2, X } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<EDATEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [officeFilter, setOfficeFilter] = useState('all');
  const [isLoaded, setIsLoaded] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; trackingNumber: string }>({
    isOpen: false,
    id: '',
    trackingNumber: '',
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [createdToast, setCreatedToast] = useState<{ open: boolean; trackingNumber: string }>({
    open: false,
    trackingNumber: '',
  });
  const [highlightedId, setHighlightedId] = useState<string>('');
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

  useEffect(() => {
    const created = searchParams.get('created') === '1';
    const newId = searchParams.get('newId');
    if (!created || !newId) return;

    setCreatedToast({ open: true, trackingNumber: newId });
    setHighlightedId(newId);

    const clear = setTimeout(() => {
      setCreatedToast({ open: false, trackingNumber: '' });
      setHighlightedId('');
      router.replace('/');
    }, 3500);

    return () => clearTimeout(clear);
  }, [searchParams, router]);

  useEffect(() => {
    if (!highlightedId) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`card-${highlightedId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => clearTimeout(t);
  }, [highlightedId, entries.length, searchQuery, statusFilter, officeFilter]);

  const filteredEntries = useMemo(() => {
    let result = entries;

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((entry) =>
        entry.trackingNumber.toLowerCase().includes(query) ||
        entry.edatsNumber.toLowerCase().includes(query) ||
        entry.sender.toLowerCase().includes(query) ||
        entry.subject.toLowerCase().includes(query) ||
        entry.receiver.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((entry) => (entry.status || 'Pending').toLowerCase() === statusFilter.toLowerCase());
    }

    // Office filter
    if (officeFilter !== 'all') {
      result = result.filter((entry) => entry.section === officeFilter);
    }

    return result;
  }, [entries, searchQuery, statusFilter, officeFilter]);

  const statusOptions = useMemo(() => {
    const toTitleCase = (value: string) =>
      value
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0]?.toUpperCase() + word.slice(1))
        .join(' ');

    const seen = new Set<string>();
    const ordered: string[] = [];

    for (const entry of entries) {
      const status = (entry.status || 'Pending').toLowerCase();
      if (!seen.has(status)) {
        seen.add(status);
        ordered.push(status);
      }
    }

    return ordered.map((value) => ({ value, label: toTitleCase(value) }));
  }, [entries]);

  const uniqueSections = useMemo(() => {
    const sections = new Set<string>();
    entries.forEach((entry) => {
      if (entry.section) sections.add(entry.section);
    });
    return Array.from(sections).sort();
  }, [entries]);

  const handleView = (entry: EDATEntry) => {
    router.push(`/edats/${encodeURIComponent(entry.id)}`);
  };

  const handleDelete = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (entry) {
      setDeleteModal({
        isOpen: true,
        id: id,
        trackingNumber: entry.trackingNumber
      });
    }
  };

  const confirmDelete = async () => {
    const { id } = deleteModal;
    try {
      const response = await fetch(`/api/edats/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setEntries(prev => prev.filter(e => e.id !== id));
        setDeleteModal({ isOpen: false, id: '', trackingNumber: '' });
      }
    } catch (error) {
      console.error('Failed to delete entry', error);
      alert('Failed to delete entry.');
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
        {createdToast.open ? (
          <div className="fixed top-4 right-4 z-[110] w-[min(420px,calc(100vw-2rem))]">
            <div className="rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60 bg-white/80 dark:bg-emerald-900/40 backdrop-blur-2xl shadow-2xl">
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shadow-inner">
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-emerald-900 dark:text-emerald-50 uppercase tracking-wider">
                      Entry Logged Successfully
                    </div>
                    <div className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-200/70 font-mono truncate">
                      {createdToast.trackingNumber}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedToast({ open: false, trackingNumber: '' });
                    setHighlightedId('');
                    router.replace('/');
                  }}
                  className="shrink-0 p-2 rounded-xl text-emerald-700/70 hover:text-emerald-900 hover:bg-emerald-50 dark:text-emerald-300/70 dark:hover:text-emerald-50 dark:hover:bg-emerald-900/40 transition-colors"
                  title="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : null}

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

        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <SearchInput value={searchQuery} onChange={setSearchQuery} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-48">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 lg:pl-4 pointer-events-none text-emerald-500/70 dark:text-emerald-400/70">
                <Filter size={16} />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-3 lg:p-4 pl-11 lg:pl-12 pr-12 lg:pr-14 text-sm lg:text-base rounded-xl lg:rounded-2xl border appearance-none cursor-pointer
                  bg-white/80 dark:bg-emerald-900/30 backdrop-blur-md
                  border-emerald-200/60 dark:border-emerald-800/60
                  text-emerald-900 dark:text-emerald-50 font-semibold tracking-tight
                  focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 outline-none
                  transition-all shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-emerald-900/40"
              >
                <option value="all" className="bg-white dark:bg-emerald-950">All Status</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-white dark:bg-emerald-950">
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 lg:pr-4 pointer-events-none text-emerald-500/70 dark:text-emerald-400/70">
                <ChevronDown size={16} />
              </div>
            </div>

            <div className="relative w-full sm:w-48">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 lg:pl-4 pointer-events-none text-emerald-500/70 dark:text-emerald-400/70">
                <Trees size={16} />
              </div>
              <select
                value={officeFilter}
                onChange={(e) => setOfficeFilter(e.target.value)}
                className="w-full p-3 lg:p-4 pl-11 lg:pl-12 pr-12 lg:pr-14 text-sm lg:text-base rounded-xl lg:rounded-2xl border appearance-none cursor-pointer
                  bg-white/80 dark:bg-emerald-900/30 backdrop-blur-md
                  border-emerald-200/60 dark:border-emerald-800/60
                  text-emerald-900 dark:text-emerald-50 font-semibold tracking-tight
                  focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 outline-none
                  transition-all shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-emerald-900/40"
              >
                <option value="all" className="bg-white dark:bg-emerald-950">All Sections</option>
                {uniqueSections.map((section) => (
                  <option key={section} value={section} className="bg-white dark:bg-emerald-950">
                    {section}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 lg:pr-4 pointer-events-none text-emerald-500/70 dark:text-emerald-400/70">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="w-full lg:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3 lg:py-4 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-xl lg:rounded-2xl transition-all font-bold text-sm lg:text-base shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98]"
          >
            <Plus size={18} />
            <span>New Entry</span>
          </button>
        </div>

        <section className="bg-white/50 dark:bg-emerald-900/10 backdrop-blur-xl rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/50 overflow-hidden transition-all">
          <div className="px-6 py-4 bg-emerald-50/50 dark:bg-emerald-900/30 border-b border-emerald-200/50 dark:border-emerald-800/50 flex items-center justify-between">
             <h2 className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Document Registry</h2>
             <span className="text-xs font-bold text-emerald-700/60 dark:text-emerald-400/60 bg-emerald-100/50 dark:bg-emerald-800/50 px-3 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-700/50">
               {filteredEntries.length} Records Found
             </span>
          </div>
          
          <div className="p-2 sm:p-4">
            <EDATCards
              entries={filteredEntries}
              onDelete={handleDelete}
              onView={handleView}
              highlightedId={highlightedId}
            />
          </div>
        </section>

        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, id: '', trackingNumber: '' })}
          onConfirm={confirmDelete}
          trackingNumber={deleteModal.trackingNumber}
        />
      </div>

      <footer className="w-full bg-gray-100 dark:bg-emerald-950 border-t border-emerald-200 dark:border-emerald-800 py-3 px-4 sm:px-6 flex flex-col justify-center items-center text-center gap-1 shrink-0">
        <p className="text-[10px] sm:text-sm font-medium text-gray-600 dark:text-emerald-400/60">© {new Date().getFullYear()} Department of Environment and Natural Resources - CAR</p>
        <p className="text-[10px] text-gray-500 dark:text-emerald-600/50 uppercase tracking-wider italic">Working towards a sustainable environment</p>
      </footer>
    </main>
  );
}
