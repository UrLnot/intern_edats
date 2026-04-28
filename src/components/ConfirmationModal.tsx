'use client';

import React from 'react';
import { AlertTriangle, X, CheckCircle2, HelpCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'success' | 'info';
  icon?: React.ReactNode;
}

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  icon
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const themes = {
    danger: {
      accent: 'from-red-500/50 via-red-500 to-red-500/50',
      iconBg: 'bg-red-100 dark:bg-red-500/20',
      iconText: 'text-red-600 dark:text-red-400',
      button: 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 shadow-red-500/20',
      defaultIcon: <AlertTriangle size={24} />
    },
    success: {
      accent: 'from-emerald-500/50 via-emerald-500 to-emerald-500/50',
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
      iconText: 'text-emerald-600 dark:text-emerald-400',
      button: 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 shadow-emerald-500/20',
      defaultIcon: <CheckCircle2 size={24} />
    },
    info: {
      accent: 'from-blue-500/50 via-blue-500 to-blue-500/50',
      iconBg: 'bg-blue-100 dark:bg-blue-500/20',
      iconText: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 shadow-blue-500/20',
      defaultIcon: <HelpCircle size={24} />
    }
  };

  const theme = themes[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-emerald-950/40 dark:bg-black/60 backdrop-blur-lg transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-white/90 dark:bg-emerald-900/50 backdrop-blur-2xl border-2 border-emerald-300/70 dark:border-emerald-700/70 shadow-2xl shadow-emerald-500/20 dark:shadow-emerald-400/20 transition-all animate-in fade-in zoom-in duration-300">
        
        {/* Header Decor */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${theme.accent}`} />

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 ${theme.iconBg} rounded-2xl ${theme.iconText} shadow-inner`}>
                {icon || theme.defaultIcon}
              </div>
              <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-50 uppercase tracking-wider">
                {title}
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
              {message}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-800/30 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 rounded-2xl transition-all border border-emerald-200/30 dark:border-emerald-700/30"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-6 py-3 text-sm font-bold text-white rounded-2xl shadow-lg transition-all active:scale-[0.98] ${theme.button}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
