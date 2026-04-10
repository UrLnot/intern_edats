'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EDATEntry } from '@/types/edat';
import EDATTable from '@/components/EDATTable';
import EDATModal from '@/components/EDATModal';
import SearchInput from '@/components/SearchInput';
import { Plus, Trees } from 'lucide-react';

export default function Home() {
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
          console.log('Fetched entries:', data);
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

  if (!isLoaded) return null;

  return (
    <main className="min-h-screen bg-emerald-50/50 dark:bg-emerald-950/20">
      {/* Top Banner / Branding */}
      <div className="bg-emerald-900 text-white py-1 px-4 text-[10px] uppercase tracking-widest font-bold flex justify-center items-center gap-2">
        <span className="opacity-80">DENR-CAR</span>
        <span className="w-1 h-1 bg-white rounded-full opacity-50"></span>
        <span>Planning and Management Division</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-700 rounded-xl text-white shadow-lg shadow-emerald-900/20">
                <Trees size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-emerald-900 dark:text-emerald-50 tracking-tight">eDATs</h1>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Internal Document Tracking System</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-72">
                <SearchInput value={searchQuery} onChange={setSearchQuery} />
              </div>
              <button 
                onClick={openAddModal}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-all font-semibold shadow-md hover:shadow-lg active:scale-95"
              >
                <Plus size={20} />
                <span>New Entry</span>
              </button>
            </div>
          </div>
        </header>

        <section className="bg-white dark:bg-emerald-900/40 backdrop-blur-sm rounded-2xl shadow-xl shadow-emerald-200/50 dark:shadow-none border border-emerald-200 dark:border-emerald-800 overflow-hidden transition-all">
          <div className="p-1 bg-emerald-50/50 dark:bg-emerald-800/30 border-b border-emerald-200 dark:border-emerald-800 flex items-center px-6 py-3">
             <h2 className="text-xs font-bold text-emerald-600/60 dark:text-emerald-400 uppercase tracking-widest">Document Registry</h2>
          </div>
          <EDATTable 
            entries={filteredEntries} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        </section>

        <footer className="mt-12 py-8 border-t border-emerald-200 dark:border-emerald-800 flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">© {new Date().getFullYear()} Planning and Management Division</p>
          <p className="text-[10px] text-emerald-400 dark:text-emerald-600 uppercase tracking-tighter italic">Working towards a sustainable environment</p>
        </footer>
      </div>

      <EDATModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleAddEntry} 
        entry={editingEntry}
      />
    </main>
  );
}
