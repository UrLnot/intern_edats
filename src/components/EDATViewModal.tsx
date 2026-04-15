'use client';

import React from 'react';
import { EDATEntry } from '@/types/edat';
import { X, Trees, Clock, Calendar, User, FileText, CheckCircle2, Info } from 'lucide-react';
import { format } from 'date-fns';

interface EDATViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: EDATEntry | null;
}

export default function EDATViewModal({ isOpen, onClose, entry }: EDATViewModalProps) {
  if (!isOpen || !entry) return null;

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return 'Not set';
    return timeStr.split('.')[0];
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Not set';
    try {
      return format(new Date(dateStr), 'MMMM dd, yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  const DetailItem = ({ icon: Icon, label, value, colorClass = 'text-emerald-900 dark:text-emerald-50' }: { icon: any, label: string, value: string | null | undefined, colorClass?: string }) => (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <p className={`text-sm lg:text-base font-medium break-words ${colorClass}`}>
        {value || <span className="text-gray-400 italic">Not set</span>}
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/60 dark:bg-emerald-950/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="relative w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] bg-white dark:bg-emerald-900 rounded-xl sm:rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-800 p-1.5 sm:p-2 lg:p-2.5">
        <div className="max-h-[calc(95vh-0.75rem)] sm:max-h-[calc(90vh-1rem)] lg:max-h-[calc(90vh-1.25rem)] overflow-y-auto rounded-xl scrollbar-thin scrollbar-thumb-emerald-200 dark:scrollbar-thumb-emerald-800 pr-1.5 lg:pr-2">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 lg:p-6 border-b border-emerald-200 dark:border-emerald-800 sticky top-0 bg-white dark:bg-emerald-900 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-800/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-900 dark:text-emerald-50">
                  Log Entry Details
                </h3>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                  Tracking #: {entry.trackingNumber}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-200 transition-colors rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-800/50">
              <X size={24} />
            </button>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            {/* Primary Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                <DetailItem icon={Info} label="eDATs #" value={entry.edatsNumber} />
              </div>
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    <CheckCircle2 size={14} />
                    <span>Status</span>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mt-1 ${
                    entry.status?.toLowerCase() === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300' :
                    entry.status?.toLowerCase() === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                    'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  }`}>
                    {entry.status || 'Pending'}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                <DetailItem icon={Trees} label="Tracking Number" value={entry.trackingNumber} />
              </div>
            </div>

            {/* Content Details */}
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-6">
                <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-50 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">
                  Document Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pl-4">
                  <div className="sm:col-span-2">
                    <DetailItem icon={FileText} label="Subject" value={entry.subject} />
                  </div>
                  <DetailItem icon={User} label="Sender" value={entry.sender} />
                  <DetailItem icon={User} label="Receiver" value={entry.receiver} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Sent Section */}
                <div className="space-y-6 p-6 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/30">
                  <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-50 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">
                    Outbound Details
                  </h4>
                  <div className="grid grid-cols-2 gap-6 pl-4">
                    <DetailItem icon={Clock} label="Time Sent" value={formatTime(entry.timeSent)} />
                    <DetailItem icon={Calendar} label="Date Sent" value={formatDate(entry.dateSent)} />
                  </div>
                  <div className="space-y-6 pl-4 pt-4 border-t border-emerald-100 dark:border-emerald-800/50">
                    <DetailItem icon={User} label="Actioned By" value={entry.actionedBy} />
                    <DetailItem icon={CheckCircle2} label="Action Taken" value={entry.actionTaken} />
                  </div>
                </div>

                {/* Received Section */}
                <div className="space-y-6 p-6 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/30">
                  <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-50 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">
                    Inbound Details
                  </h4>
                  <div className="grid grid-cols-2 gap-6 pl-4">
                    <DetailItem icon={Clock} label="Time Received" value={formatTime(entry.timeReceived)} />
                    <DetailItem icon={Calendar} label="Date Received" value={formatDate(entry.dateReceived)} />
                  </div>
                  <div className="space-y-6 pl-4 pt-4 border-t border-emerald-100 dark:border-emerald-800/50">
                    <DetailItem icon={CheckCircle2} label="Receiver Action" value={entry.actionTakenReceiver} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 sm:p-5 lg:p-6 border-t border-emerald-200 dark:border-emerald-800 sticky bottom-0 bg-white dark:bg-emerald-900 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)]">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-lg transition-all font-bold text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/20"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
