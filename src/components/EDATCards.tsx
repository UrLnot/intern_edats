'use client';

import React from 'react';
import { EDATLog, EDATStep } from '@/types/edat';
import { format } from 'date-fns';
import { Trash2, Eye, Calendar, User, FileText, Clock, GitCommit } from 'lucide-react';

interface EDATCardsProps {
  entries: EDATLog[];
  onDelete: (trackingNumber: string) => void;
  onView: (log: EDATLog) => void;
  highlightedId?: string;
}

export default function EDATCards({ entries, onDelete, onView, highlightedId }: EDATCardsProps) {
  const formatDueIn = (dueIn: EDATStep['dueIn'] | null | undefined) => {
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
      {entries.map((log) => {
        const highlighted = Boolean(highlightedId && log.trackingNumber === highlightedId);
        const latestStep = log.steps.length > 0 ? log.steps[log.steps.length - 1] : null;
        const firstStep = log.steps.length > 0 ? log.steps[0] : null;
        const latestPendingStep = [...log.steps].reverse().find(s => s.status === 'Pending') ?? null;
        const displayStep = latestPendingStep ?? latestStep;
        const lastActionStep = [...log.steps].reverse().find(s => Boolean((s.actionTaken || '').trim())) ?? null;
        const currentHolder = latestPendingStep?.receiver
          ? latestPendingStep.receiver
          : (log.status?.toLowerCase() === 'completed'
              ? (latestStep?.sender || '-')
              : '-');

        return (
          <div
            id={`card-${log.trackingNumber}`}
            key={log.trackingNumber}
            role="button"
            tabIndex={0}
            onClick={() => onView(log)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onView(log);
            }}
            className={`group relative flex flex-col h-full bg-white/70 dark:bg-emerald-900/30 backdrop-blur-xl border border-emerald-200/50 dark:border-emerald-800/50 rounded-2xl overflow-hidden transition-all cursor-pointer hover:shadow-2xl hover:-translate-y-1 hover:ring-2 hover:ring-emerald-300/60 active:scale-[0.99] ${
              highlighted ? 'ring-4 ring-emerald-400 shadow-2xl animate-pulse' : ''
            }`}
          >
          {/* Status Badge */}
          <div className="absolute top-4 right-4 z-10">
            <span className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider shadow-lg border-2 ${
              log.status?.toLowerCase() === 'completed' ? 'bg-emerald-500/90 text-white border-emerald-600/50 dark:bg-emerald-400/90 dark:text-emerald-950 dark:border-emerald-300/50 shadow-emerald-500/30' :
              log.status?.toLowerCase() === 'pending' ? 'bg-amber-500/90 text-white border-amber-600/50 dark:bg-amber-400/90 dark:text-amber-950 dark:border-amber-300/50 shadow-amber-500/30' :
              log.status?.toLowerCase() === 'passed due' ? 'bg-red-500/90 text-white border-red-600/50 dark:bg-red-400/90 dark:text-red-950 dark:border-red-300/50 shadow-red-500/30' :
              'bg-emerald-400/90 text-emerald-950 border-emerald-500/50 dark:bg-emerald-300/90 dark:text-emerald-950 dark:border-emerald-200/50 shadow-emerald-400/30'
            }`}>
              {log.status || 'Pending'}
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col gap-4">
            {/* Header: IDs */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/60 dark:text-emerald-400/60 mb-1">Document IDs</div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-emerald-900 dark:text-emerald-50 font-mono tracking-tight">{log.trackingNumber}</span>
                <span className="text-xs font-medium text-emerald-700/70 dark:text-emerald-400/70 font-mono">{latestStep?.edatsNumber || '-'}</span>
              </div>
            </div>

            {/* Subject */}
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/60 dark:text-emerald-400/60 mb-1">Subject</div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-50 line-clamp-2 group-hover:line-clamp-none transition-all duration-300" title={log.subject}>
                {log.subject}
              </p>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-2 gap-3 py-3 border-y border-emerald-100/50 dark:border-emerald-800/30">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-600/60 dark:text-emerald-400/60">
                  <User size={12} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Sender</span>
                </div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-100 truncate" title={firstStep?.sender}>{firstStep?.sender || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-600/60 dark:text-emerald-400/60">
                  <FileText size={12} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Type</span>
                </div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-100 truncate">{log.documentType || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-600/60 dark:text-emerald-400/60">
                  <Calendar size={12} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Forwarded</span>
                </div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-100">
                  {displayStep?.dateForwarded ? format(new Date(displayStep.dateForwarded), 'MMM dd, yyyy') : '-'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-600/60 dark:text-emerald-400/60">
                  <Clock size={12} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Due</span>
                </div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-100 truncate">{formatDueIn(displayStep?.dueIn)}</span>
              </div>
            </div>

            {/* Inbound Details */}
            <div className="flex flex-col gap-2 p-3 bg-emerald-50/50 dark:bg-emerald-950/40 rounded-xl border border-emerald-100/50 dark:border-emerald-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/60">Current Holder</span>
                </div>
              </div>
              <div className="text-sm font-bold text-emerald-900 dark:text-emerald-50 truncate pl-3.5">
                {currentHolder}
              </div>
              {lastActionStep?.actionTaken && (
                <div className="mt-1 pl-3.5 border-l-2 border-emerald-200 dark:border-emerald-800">
                  <span className="text-[9px] font-black uppercase tracking-tight text-emerald-500/70 block mb-0.5">Last Action Taken</span>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 line-clamp-1 italic">
                    {lastActionStep.sender ? `${lastActionStep.actionTaken} — ${lastActionStep.sender}` : lastActionStep.actionTaken}
                  </p>
                </div>
              )}
            </div>

            
            <div className="mt-1">
              <div className="flex items-center gap-1.5 mb-3">
                <GitCommit size={12} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/60">Log Entries</span>
              </div>
              {log.steps.length > 0 ? (
                <div className="relative overflow-x-auto px-1">
                  {(() => {
                    const nodes: { name: string; action: string; isCurrent: boolean }[] = [];
                    
                    log.steps.forEach((step) => {
                      const sender = (step.sender || 'Unknown').trim() || 'Unknown';
                      const action = (step.actionTaken || '').trim() || (step.stepNumber === 1 ? 'Originated' : 'Forwarded');
                      nodes.push({ name: sender, action, isCurrent: false });

                      if (!step.receiver) return;

                      const receiver = step.receiver.trim();
                      if (step.status === 'Pending') nodes.push({ name: receiver, action: 'Pending', isCurrent: true });
                    });

                    return (
                      <div className="relative flex gap-4 min-w-max pb-1">
                        <div className="pointer-events-none absolute left-0 right-0 top-[8px] h-px bg-emerald-300/40 dark:bg-emerald-700/40" />
                        {nodes.map((node, idx) => (
                          <div key={`${node.name}-${idx}`} className="relative z-10 flex flex-col items-center w-28 shrink-0">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mb-2 relative z-20 ${
                              node.isCurrent
                                ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse'
                                : 'bg-white dark:bg-emerald-900 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${node.isCurrent ? 'bg-white' : 'bg-emerald-500'}`} />
                            </div>

                            <span
                              className={`text-[10px] font-black text-center truncate w-full px-1 uppercase tracking-tight ${
                                node.isCurrent ? 'text-emerald-500 animate-pulse' : 'text-emerald-900 dark:text-emerald-50'
                              }`}
                              title={node.name}
                            >
                              {node.name}
                            </span>
                            <span className={`text-[9px] text-center line-clamp-2 w-full px-1 italic leading-tight min-h-[22px] mt-0.5 ${
                              node.isCurrent ? 'text-emerald-400 font-bold' : 'text-emerald-600 dark:text-emerald-400/80'
                            }`}>
                              {node.action}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-[10px] italic text-emerald-400/50 dark:text-emerald-600/40 pl-3.5">No entries recorded for this log.</p>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between p-3 bg-emerald-50/50 dark:bg-emerald-900/40 border-t border-emerald-100 dark:border-emerald-800/50">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/40 dark:text-emerald-400/40">Received On</span>
              <span className="text-[10px] font-bold text-emerald-800/60 dark:text-emerald-300/60 font-mono">
                {latestStep?.dateReceived ? `${format(new Date(latestStep.dateReceived), 'MM/dd/yy')} ${formatTimeReceived(latestStep.timeReceived)}` : 'Not yet'}
              </span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onView(log);
                }}
                className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl transition-all"
                title="View Details"
              >
                <Eye size={18} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(log.trackingNumber);
                }}
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
