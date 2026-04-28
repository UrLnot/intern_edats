'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface FeedbackToastProps {
  show: boolean;
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export default function FeedbackToast({ 
  show, 
  message, 
  type = 'success', 
  onClose,
  duration = 3000 
}: FeedbackToastProps) {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (show) {
      setIsRendered(true);
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!isRendered) return null;

  return (
    <div 
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 transform ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border-2 backdrop-blur-xl ${
        type === 'success' 
          ? 'bg-emerald-500/90 border-emerald-400 text-white shadow-emerald-500/20' 
          : 'bg-red-500/90 border-red-400 text-white shadow-red-500/20'
      }`}>
        {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
        <span className="text-sm font-bold uppercase tracking-wider">{message}</span>
        <button 
          onClick={onClose}
          className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
