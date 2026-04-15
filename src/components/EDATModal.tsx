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
  timeSent: '',
  dateSent: '',
  sender: '',
  subject: '',
  actionedBy: '',
  actionTaken: '',
  receiver: '',
  actionTakenReceiver: '',
  timeReceived: '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, id: entry?.id });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/60 dark:bg-emerald-950/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="relative w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] bg-white dark:bg-emerald-900 rounded-xl sm:rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-800 p-1.5 sm:p-2 lg:p-2.5">
        <div className="max-h-[calc(95vh-0.75rem)] sm:max-h-[calc(90vh-1rem)] lg:max-h-[calc(90vh-1.25rem)] overflow-y-auto rounded-xl scrollbar-thin scrollbar-thumb-emerald-200 dark:scrollbar-thumb-emerald-800 pr-1.5 lg:pr-2">
          <div className="flex items-center justify-between p-3 sm:p-4 lg:p-5 border-b border-emerald-200 dark:border-emerald-800 sticky top-0 bg-white dark:bg-emerald-900 z-10">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-900 dark:text-emerald-50">
            {entry ? 'Edit eDAT Entry' : 'New eDAT Entry'}
          </h3>
          <button onClick={onClose} className="p-2 text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-200 transition-colors rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-800/50">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-5 lg:p-7 space-y-4 sm:space-y-5 lg:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            <div className="md:col-span-1">
              <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Tracking #</label>
              <input type="text" name="trackingNumber" value={formData.trackingNumber} onChange={handleChange} required className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">eDATs #</label>
              <input type="text" name="edatsNumber" value={formData.edatsNumber} onChange={handleChange} required className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
              >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
            <div>
              <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Time Sent</label>
              <input type="time" name="timeSent" value={formData.timeSent} onChange={handleChange} className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Date Sent</label>
              <input type="date" name="dateSent" value={formData.dateSent} onChange={handleChange} required className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Subject</label>
            <textarea name="subject" value={formData.subject} onChange={handleChange} rows={2} required className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
            <div>
              <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Sender</label>
              <input type="text" name="sender" value={formData.sender} onChange={handleChange} required className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Receiver</label>
              <input type="text" name="receiver" value={formData.receiver} onChange={handleChange} className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
            <div>
              <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Actioned By</label>
              <input type="text" name="actionedBy" value={formData.actionedBy} onChange={handleChange} className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Action Taken</label>
              <input type="text" name="actionTaken" value={formData.actionTaken} onChange={handleChange} className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
            <div>
              <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Time Received</label>
              <input type="time" name="timeReceived" value={formData.timeReceived} onChange={handleChange} className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Date Received</label>
              <input type="date" name="dateReceived" value={formData.dateReceived} onChange={handleChange} className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Action Taken - Receiver</label>
            <textarea name="actionTakenReceiver" value={formData.actionTakenReceiver} onChange={handleChange} rows={2} className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 lg:pt-6 border-t border-emerald-200 dark:border-emerald-800 sticky bottom-0 bg-white dark:bg-emerald-900 z-10 mt-3 p-3 sm:p-5 lg:p-7 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)]">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 lg:px-8 py-2.5 lg:py-3.5 text-sm lg:text-base font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 transition-colors">
              Cancel
            </button>
            <button type="submit" className="w-full sm:w-auto px-6 lg:px-10 py-2.5 lg:py-3.5 text-sm lg:text-base font-bold text-white bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95">
              {entry ? 'Update Entry' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
}
