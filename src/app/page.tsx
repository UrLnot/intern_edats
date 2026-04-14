'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { EDATEntry } from '@/types/edat';
import EDATTable from '@/components/EDATTable';
import EDATModal from '@/components/EDATModal';
import SearchInput from '@/components/SearchInput';
import { LogOut, Plus, Trees } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [entries, setEntries] = useState<EDATEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EDATEntry | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch from API on mount
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

  const handleAddEntry = async (newEntry: Omit<EDATEntry, 'id'> & { id?: string }) => {
    try {
      if (newEntry.id) {
        // Update existing via API
        const response = await fetch(`/api/edats/${newEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEntry),
        });
        if (response.ok) {
          const updated = await response.json();
          setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
        }
      } else {
        // Add new via API
        const response = await fetch('/api/edats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEntry),
        });
        if (response.ok) {
          const added = await response.json();
          setEntries(prev => [added, ...prev]);
        }
      }
    } catch (error) {
      console.error('Failed to save entry', error);
      alert('Failed to save entry. Please try again.');
    }
  };

  const handleEdit = (entry: EDATEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
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
    setEditingEntry(null);
    setIsModalOpen(true);
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
    <main className="min-h-screen flex flex-col bg-emerald-50/50 dark:bg-emerald-950/20">
      {/* Top Banner / Branding */}
      <div className="bg-emerald-900 text-white py-1 px-4 text-[10px] uppercase tracking-widest font-bold flex justify-center items-center gap-2 shrink-0">
        <span className="opacity-80">DENR-CAR</span>
        <span className="w-1 h-1 bg-white rounded-full opacity-50"></span>
        <span>Planning and Management Division</span>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 py-4 w-full">
        <header className="mb-4">
          <div className="flex items-end justify-between pb-4 border-b border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-emerald-700 rounded-xl text-white shadow-lg shadow-emerald-900/20">
                <Trees size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-50 tracking-tight">eDTs</h1>
                <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Internal Document Tracking System</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-3 py-2 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100 rounded-lg transition-all font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline text-sm">Logout</span>
            </button>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div className="w-full flex-1">
            <SearchInput value={searchQuery} onChange={setSearchQuery} />
          </div>
          <button 
            onClick={openAddModal}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-all font-semibold shadow-md hover:shadow-lg active:scale-95 text-sm"
          >
            <Plus size={18} />
            <span>New Entry</span>
          </button>
        </div>

        <section className="bg-white dark:bg-emerald-900/40 backdrop-blur-sm rounded-2xl shadow-xl shadow-emerald-200/50 dark:shadow-none border border-emerald-200 dark:border-emerald-800 overflow-hidden transition-all">
          <div className="p-0.5 bg-emerald-50/50 dark:bg-emerald-800/30 border-b border-emerald-200 dark:border-emerald-800 flex items-center px-4 py-2">
             <h2 className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-400 uppercase tracking-widest">Document Registry</h2>
          </div>
          <EDATTable 
            entries={filteredEntries} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        </section>
      </div>

      <footer className="w-full bg-white/60 dark:bg-emerald-950/40 backdrop-blur-sm border-t border-emerald-200 dark:border-emerald-800 py-2 px-6 flex justify-between items-center text-center shrink-0">
        <p className="text-[10px] font-medium text-emerald-700/60 dark:text-emerald-400/60">© {new Date().getFullYear()} Planning and Management Division</p>
        <p className="text-[9px] text-emerald-400/50 dark:text-emerald-600/50 uppercase tracking-tighter italic">Working towards a sustainable environment</p>
      </footer>

      <EDATModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleAddEntry} 
        entry={editingEntry}
      />
    </main>
  );
}
