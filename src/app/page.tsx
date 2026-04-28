'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EDATLog } from '@/types/edat';
import EDATCards from '@/components/EDATCards';
import ConfirmationModal from '@/components/ConfirmationModal';
import FeedbackToast from '@/components/FeedbackToast';
import SearchInput from '@/components/SearchInput';
import ThemeToggle from '@/components/ThemeToggle';
import { useThemeValue } from '@/components/ThemeProvider';
import { Search, Plus, Filter, LayoutGrid, List, FileText, Calendar, Clock, ChevronRight, User, Trash2, Trees, LogOut, Check, X, AlertCircle, ChevronDown, CheckCircle2 } from 'lucide-react';

function HomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<EDATLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoaded, setIsLoaded] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; trackingNumber: string }>({
    isOpen: false,
    trackingNumber: '',
  });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
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
  }, [highlightedId, entries.length, searchQuery, statusFilter]);

  const filteredEntries = useMemo(() => {
    let result = entries;

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((log) => {
        const latestStep = log.steps.length > 0 ? log.steps[log.steps.length - 1] : null;
        const firstStep = log.steps.length > 0 ? log.steps[0] : null;
        
        return (
          log.trackingNumber.toLowerCase().includes(query) ||
          (latestStep?.edatsNumber || '').toLowerCase().includes(query) ||
          (firstStep?.sender || '').toLowerCase().includes(query) ||
          log.subject.toLowerCase().includes(query) ||
          (latestStep?.receiver || '').toLowerCase().includes(query)
        );
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((log) => (log.status || 'Pending').toLowerCase() === statusFilter.toLowerCase());
    }

    return result;
  }, [entries, searchQuery, statusFilter]);

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

  const handleView = (log: EDATLog) => {
    router.push(`/edats/${encodeURIComponent(log.trackingNumber)}`);
  };

  const handleDelete = (trackingNumber: string) => {
    const log = entries.find(e => e.trackingNumber === trackingNumber);
    if (log) {
      setDeleteModal({
        isOpen: true,
        trackingNumber: log.trackingNumber
      });
    }
  };

  const confirmDelete = async () => {
    const { trackingNumber } = deleteModal;
    try {
      const response = await fetch(`/api/edats/${trackingNumber}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setEntries(prev => prev.filter(e => e.trackingNumber !== trackingNumber));
        setToast({ show: true, message: 'Record deleted successfully!', type: 'success' });
      } else {
        setToast({ show: true, message: 'Failed to delete record.', type: 'error' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      setToast({ show: true, message: 'An error occurred while deleting.', type: 'error' });
    } finally {
      setDeleteModal({ isOpen: false, trackingNumber: '' });
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

  const stats = useMemo(() => {
    const total = entries.length;
    const pending = entries.filter(e => (e.status || 'Pending').toLowerCase() === 'pending').length;
    const completed = entries.filter(e => (e.status || '').toLowerCase() === 'completed').length;
    
    // Count forwarded today
    const today = new Date().toISOString().split('T')[0];
    const forwardedToday = entries.filter(e => {
      const lastStep = e.steps.length > 0 ? e.steps[e.steps.length - 1] : null;
      return lastStep?.dateForwarded === today;
    }).length;

    return { total, pending, completed, forwardedToday };
  }, [entries]);

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

        <header className="mb-8">
          <div className="flex items-center justify-between pb-6 border-b border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-emerald-700 dark:bg-emerald-800 rounded-xl sm:rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                <Trees size={24} className="sm:w-8 sm:h-8" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-black text-emerald-900 dark:text-emerald-50 tracking-tight">eDTS</h1>
                <p className="text-[10px] sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-tight">Document Tracking System</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100 rounded-xl transition-all font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs sm:text-sm shadow-sm"
              >
                <LogOut size={16} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/60 dark:bg-emerald-900/20 backdrop-blur-md border border-emerald-100 dark:border-emerald-800/50 p-4 rounded-2xl shadow-sm">
              <div className="text-[10px] font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest mb-1">Total Registry</div>
              <div className="text-2xl font-black text-emerald-900 dark:text-emerald-50">{stats.total}</div>
            </div>
            <div className="bg-white/60 dark:bg-emerald-900/20 backdrop-blur-md border border-emerald-100 dark:border-emerald-800/50 p-4 rounded-2xl shadow-sm">
              <div className="text-[10px] font-black text-amber-600/60 dark:text-amber-400/60 uppercase tracking-widest mb-1">Pending Action</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.pending}</div>
            </div>
            <div className="bg-white/60 dark:bg-emerald-900/20 backdrop-blur-md border border-emerald-100 dark:border-emerald-800/50 p-4 rounded-2xl shadow-sm">
              <div className="text-[10px] font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest mb-1">Completed</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
            </div>
            <div className="bg-white/60 dark:bg-emerald-900/20 backdrop-blur-md border border-emerald-100 dark:border-emerald-800/50 p-4 rounded-2xl shadow-sm ring-2 ring-emerald-500/20 ring-offset-2 ring-offset-emerald-50 dark:ring-offset-emerald-950">
              <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Forwarded Today
              </div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.forwardedToday}</div>
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

        <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, trackingNumber: '' })}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message="Are you sure you want to permanently remove this document from the registry? This action cannot be undone."
        confirmLabel="Delete Record"
        variant="danger"
      />

      <FeedbackToast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>

    <footer className="w-full bg-gray-100 dark:bg-emerald-950 border-t border-emerald-200 dark:border-emerald-800 py-3 px-4 sm:px-6 flex flex-col justify-center items-center text-center gap-1 shrink-0">
        <p className="text-[10px] sm:text-sm font-medium text-gray-600 dark:text-emerald-400/60">© {new Date().getFullYear()} Department of Environment and Natural Resources - CAR</p>
        <p className="text-[10px] text-gray-500 dark:text-emerald-600/50 uppercase tracking-wider italic">Working towards a sustainable environment</p>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}
