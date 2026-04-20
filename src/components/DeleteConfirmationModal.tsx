'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  trackingNumber: string;
}

export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  trackingNumber 
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-emerald-950/20 dark:bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-white/80 dark:bg-emerald-900/40 backdrop-blur-2xl border border-emerald-200/50 dark:border-emerald-800/50 shadow-2xl transition-all animate-in fade-in zoom-in duration-300">
        
        {/* Header Decor */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500/50 via-red-500 to-red-500/50" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 dark:bg-red-500/20 rounded-2xl text-red-600 dark:text-red-400 shadow-inner">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-50 uppercase tracking-wider">
                Confirm Delete
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 rounded-xl transition-all text-emerald-600 dark:text-emerald-400"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-emerald-800/80 dark:text-emerald-100/70 text-sm leading-relaxed">
              Are you sure you want to permanently remove this document from the registry? This action cannot be undone.
            </p>
            
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50 dark:text-emerald-400/50 block mb-1">Tracking Number</span>
              <span className="text-base font-mono font-bold text-emerald-900 dark:text-emerald-50 tracking-tight">
                {trackingNumber}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-800/30 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 rounded-2xl transition-all border border-emerald-200/30 dark:border-emerald-700/30"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-6 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 rounded-2xl shadow-lg shadow-red-500/20 transition-all active:scale-[0.98]"
            >
              Delete Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
