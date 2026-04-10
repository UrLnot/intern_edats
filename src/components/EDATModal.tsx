'use client';

import React, { useState, useEffect } from 'react';
import { EDATEntry } from '@/types/edat';
import { X } from 'lucide-react';

interface EDATModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entry: Omit<EDATEntry, 'id'> & { id?: string }) => void;
  entry?: EDATEntry | null;
}

const initialFormState: Omit<EDATEntry, 'id'> = {
  trackingNumber: '',
  edatsNumber: '',
  status: 'Pending',
  dateSent: '',
  sender: '',
  subject: '',
  actionedBy: '',
  actionTaken: '',
  receiver: '',
  actionTakenReceiver: '',
  dateReceived: '',
};

export default function EDATModal({ isOpen, onClose, onSubmit, entry }: EDATModalProps) {
  const [formData, setFormData] = useState<Omit<EDATEntry, 'id'>>(initialFormState);

  useEffect(() => {
    if (entry) {
      setFormData(entry);
    } else {
      setFormData(initialFormState);
    }
  }, [entry, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, id: entry?.id });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-emerald-900 rounded-2xl shadow-2xl border border-emerald-100 dark:border-emerald-800">
        <div className="flex items-center justify-between p-4 border-b dark:border-emerald-800 sticky top-0 bg-white dark:bg-emerald-900 z-10">
          <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-50">
            {entry ? 'Edit eDAT Entry' : 'New eDAT Entry'}
          </h3>
          <button onClick={onClose} className="text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-100 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Tracking #</label>
              <input type="text" name="trackingNumber" value={formData.trackingNumber} onChange={handleChange} required className="w-full p-2.5 border border-emerald-100 dark:border-emerald-800 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/30 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">eDATs #</label>
              <input type="text" name="edatsNumber" value={formData.edatsNumber} onChange={handleChange} required className="w-full p-2.5 border border-emerald-100 dark:border-emerald-800 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/30 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Status</label>
              <input type="text" name="status" value={formData.status} onChange={handleChange} required className="w-full p-2.5 border border-emerald-100 dark:border-emerald-800 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/30 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Date Sent</label>
              <input type="date" name="dateSent" value={formData.dateSent} onChange={handleChange} required className="w-full p-2.5 border border-emerald-100 dark:border-emerald-800 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/30 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Sender</label>
              <input type="text" name="sender" value={formData.sender} onChange={handleChange} required className="w-full p-2.5 border border-emerald-100 dark:border-emerald-800 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/30 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Subject</label>
            <textarea name="subject" value={formData.subject} onChange={handleChange} rows={2} required className="w-full p-2.5 border border-emerald-100 dark:border-emerald-800 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/30 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Actioned By</label>
              <input type="text" name="actionedBy" value={formData.actionedBy} onChange={handleChange} className="w-full p-2.5 border border-emerald-100 dark:border-emerald-800 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/30 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Action Taken</label>
              <input type="text" name="actionTaken" value={formData.actionTaken} onChange={handleChange} className="w-full p-2.5 border border-emerald-100 dark:border-emerald-800 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/30 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Receiver</label>
              <input type="text" name="receiver" value={formData.receiver} onChange={handleChange} className="w-full p-2.5 border border-emerald-100 dark:border-emerald-800 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/30 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Date Received</label>
              <input type="date" name="dateReceived" value={formData.dateReceived} onChange={handleChange} className="w-full p-2.5 border border-emerald-100 dark:border-emerald-800 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/30 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Action Taken - Receiver</label>
            <textarea name="actionTakenReceiver" value={formData.actionTakenReceiver} onChange={handleChange} rows={2} className="w-full p-2.5 border border-emerald-100 dark:border-emerald-800 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/30 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
          </div>
          
          <div className="flex justify-end gap-3 pt-6 border-t dark:border-emerald-800">
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-bold text-emerald-600 hover:text-emerald-800 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all active:scale-95">
              {entry ? 'Update Entry' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
