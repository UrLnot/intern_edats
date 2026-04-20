'use client';

import React from 'react';
import { EDATEntry } from '@/types/edat';
import { format } from 'date-fns';
import { Trash2, Eye, Calendar, User, FileText, Clock, MapPin, GitCommit } from 'lucide-react';

interface EDATCardsProps {
  entries: EDATEntry[];
  onDelete: (id: string) => void;
  onView: (entry: EDATEntry) => void;
  highlightedId?: string;
}

export default function EDATCards({ entries, onDelete, onView, highlightedId }: EDATCardsProps) {
  const formatDueIn = (dueIn: EDATEntry['dueIn'] | null | undefined) => {
    if (dueIn === 'technical') return 'Technical (7 days)';
    if (dueIn === 'highlyTechnical') return 'Highly Technical (20 days)';
    return 'Simple (3 days)';
  };

  const formatTimeReceived = (timeStr: string | null | undefined) => {
    if (!timeStr) return '-';
    const cleaned = timeStr.split('.')[0] ?? '';
    if (/^00:00(?::00)?$/.test(cleaned)) return '-';
    return cleaned;
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-emerald-400 dark:text-emerald-500/50 italic">
        <p className="text-lg font-medium">No records found in registry.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 p-4">
      {entries.map((entry) => {
        const highlighted = Boolean(highlightedId && entry.id === highlightedId);
        return (
          <div
            id={`card-${entry.id}`}
            key={entry.id}
            className={`group relative flex flex-col h-full bg-white/60 dark:bg-emerald-900/20 backdrop-blur-xl border border-emerald-200/50 dark:border-emerald-800/50 rounded-2xl overflow-hidden transition-all hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 active:scale-[0.99] ${
              highlighted ? 'ring-2 ring-emerald-400/70 shadow-xl shadow-emerald-500/20 animate-pulse' : ''
            }`}
          >
          {/* Status Badge */}
          <div className="absolute top-4 right-4 z-10">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${
              entry.status?.toLowerCase() === 'completed' ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
              entry.status?.toLowerCase() === 'pending' ? 'bg-amber-100/80 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
              entry.status?.toLowerCase() === 'passed due' ? 'bg-red-100/80 text-red-700 dark:bg-red-500/20 dark:text-red-300' :
              'bg-emerald-50/80 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
            }`}>
              {entry.status || 'Pending'}
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col gap-4">
            {/* Header: IDs */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/60 dark:text-emerald-400/60 mb-1">Document IDs</div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-emerald-900 dark:text-emerald-50 font-mono tracking-tight">{entry.trackingNumber}</span>
                <span className="text-xs font-medium text-emerald-700/70 dark:text-emerald-400/70 font-mono">{entry.edatsNumber}</span>
              </div>
            </div>

            {/* Subject */}
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/60 dark:text-emerald-400/60 mb-1">Subject</div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-50 line-clamp-2 group-hover:line-clamp-none transition-all duration-300" title={entry.subject}>
                {entry.subject}
              </p>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-2 gap-3 py-3 border-y border-emerald-100/50 dark:border-emerald-800/30">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-600/60 dark:text-emerald-400/60">
                  <User size={12} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Sender</span>
                </div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-100 truncate" title={entry.sender}>{entry.sender}</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-600/60 dark:text-emerald-400/60">
                  <FileText size={12} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Type</span>
                </div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-100 truncate">{entry.documentType || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-600/60 dark:text-emerald-400/60">
                  <Calendar size={12} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Forwarded</span>
                </div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-100">
                  {entry.dateForwarded ? format(new Date(entry.dateForwarded), 'MMM dd, yyyy') : '-'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-600/60 dark:text-emerald-400/60">
                  <Clock size={12} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Due</span>
                </div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-100 truncate">{formatDueIn(entry.dueIn)}</span>
              </div>
            </div>

            {/* Inbound Details */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/60">Section:</span>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-50">{entry.section || 'Not assigned'}</span>
              </div>
              <div className="flex items-center gap-2">
                <User size={12} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/60">Receiver:</span>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-50">{entry.receiver || 'Waiting...'}</span>
              </div>
            </div>

            
            <div className="mt-1">
              <div className="flex items-center gap-1.5 mb-3">
                <GitCommit size={12} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/60">Route History</span>
              </div>
              {entry.routeHistory && entry.routeHistory.length > 0 ? (
                <div className="relative grid grid-cols-3 gap-y-6 gap-x-2 px-1">
                  {(() => {
                    const steps = entry.routeHistory.slice(0, 6);
                    const gridPositions = [0, 1, 2, 5, 4, 3];
                    const displaySteps = new Array(6).fill(null);
                    steps.forEach((step, idx) => {
                      displaySteps[gridPositions[idx]] = { ...step, originalIdx: idx };
                    });

                    return displaySteps.map((step, gridIdx) => {
                      if (!step) return <div key={`empty-${gridIdx}`} />;
                      
                      const idx = step.originalIdx;
                      const hasNext = idx < steps.length - 1;
                      
                      return (
                        <div key={idx} className="relative z-10 flex flex-col items-center min-w-0">
                          <div className="w-3.5 h-3.5 rounded-full bg-white dark:bg-emerald-900 border-2 border-emerald-400/50 flex items-center justify-center mb-1.5 shadow-sm relative z-20">
                            <div className="w-1 h-1 rounded-full bg-emerald-500" />
                          </div>

                          {hasNext && (
                            <>
                              {idx === 0 && (
                                <div className="absolute top-[7px] left-1/2 w-full h-px bg-emerald-300/50 dark:bg-emerald-700/50 -z-10" />
                              )}
                              {idx === 1 && (
                                <div className="absolute top-[7px] left-1/2 w-full h-px bg-emerald-300/50 dark:bg-emerald-700/50 -z-10" />
                              )}
                              {idx === 3 && (
                                <div className="absolute top-[7px] right-1/2 w-full h-px bg-emerald-300/50 dark:bg-emerald-700/50 -z-10" />
                              )}
                              {idx === 4 && (
                                <div className="absolute top-[7px] right-1/2 w-full h-px bg-emerald-300/50 dark:bg-emerald-700/50 -z-10" />
                              )}
                              
                              {idx === 2 && (
                                <div className="absolute top-[7px] left-1/2 w-px h-[62px] bg-emerald-300/50 dark:bg-emerald-700/50 -z-10" />
                              )}
                            </>
                          )}

                          <span className="text-[9px] font-bold text-emerald-800 dark:text-emerald-200 text-center truncate w-full px-1" title={step.personnel}>
                            {step.personnel}
                          </span>
                          {step.action && (
                            <span className="text-[8px] text-emerald-600/70 dark:text-emerald-400/70 text-center truncate w-full px-1 italic">
                              {step.action}
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                  
                  {entry.routeHistory.length > 6 && (
                    <div className="absolute -bottom-4 right-0">
                      <span className="text-[8px] font-bold text-emerald-500/60 dark:text-emerald-400/40">+ {entry.routeHistory.length - 6} more</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] italic text-emerald-400/50 dark:text-emerald-600/40 pl-3.5">No routing history recorded.</p>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between p-3 bg-emerald-50/50 dark:bg-emerald-900/40 border-t border-emerald-100 dark:border-emerald-800/50">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/40 dark:text-emerald-400/40">Received On</span>
              <span className="text-[10px] font-bold text-emerald-800/60 dark:text-emerald-300/60 font-mono">
                {entry.dateReceived ? `${format(new Date(entry.dateReceived), 'MM/dd/yy')} ${formatTimeReceived(entry.timeReceived)}` : 'Not yet'}
              </span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => onView(entry)} 
                className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl transition-all"
                title="View Details"
              >
                <Eye size={18} />
              </button>
              <button 
                onClick={() => onDelete(entry.id)} 
                className="p-2 text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-all"
                title="Delete Entry"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}
