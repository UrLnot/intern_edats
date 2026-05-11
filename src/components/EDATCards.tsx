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
  const [employeesByName, setEmployeesByName] = React.useState<Map<string, { position: string; section: string }>>(
    () => new Map()
  );

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/employees');
        if (!response.ok) return;
        const data = (await response.json()) as unknown;
        const list = Array.isArray(data)
          ? data
              .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
              .map((v) => ({
                name: typeof v.name === 'string' ? v.name : '',
                position: typeof v.position === 'string' ? v.position : '',
                section: typeof v.section === 'string' ? v.section : '',
              }))
              .filter((v) => v.name)
          : [];
        const map = new Map<string, { position: string; section: string }>();
        for (const e of list) map.set(e.name, { position: e.position, section: e.section });
        if (!cancelled) setEmployeesByName(map);
      } catch {}
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatDueIn = (dueIn: EDATStep['dueIn'] | null | undefined) => {
    if (dueIn === 'technical') return 'Technical (7 days)';
    if (dueIn === 'highlyTechnical') return 'Highly Technical (20 days)';
    return 'Simple (3 days)';
  };

  const formatManilaDateYYYYMMDD = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);

  const getManilaYYYYMMDD = () =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

  const normalizeToManilaYYYYMMDD = (value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'string') {
      const direct = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
      if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return formatManilaDateYYYYMMDD(d);
      const loose = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
      if (loose) return `${loose[1]}-${loose[2]}-${loose[3]}`;
      return '';
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) return formatManilaDateYYYYMMDD(value);
    return '';
  };

  const parseYYYYMMDDToUtcMidnight = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    return new Date(Date.UTC(y, m - 1, d));
  };

  const parseHHMMSSToSeconds = (value: string) => {
    const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    const s = Number(match[3] ?? '0');
    if (![h, m, s].every(Number.isFinite)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) return null;
    return h * 3600 + m * 60 + s;
  };

  const getManilaDateTimeParts = (date: Date) => {
    const ymd = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    const hms = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
    return { ymd, hms };
  };

  const toUtcMillisFromManilaParts = (ymd: string, hms: string | null | undefined) => {
    const dateUtc = parseYYYYMMDDToUtcMidnight(ymd);
    if (!dateUtc) return null;
    const seconds = hms ? parseHHMMSSToSeconds(hms) : 0;
    if (seconds === null) return dateUtc.getTime();
    return dateUtc.getTime() + seconds * 1000;
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'} ${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
    if (hours > 0) return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
    return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
  };

  const addDaysUtc = (dateUtc: Date, days: number) => new Date(dateUtc.getTime() + days * 24 * 60 * 60 * 1000);

  const dueDaysFor = (dueIn: EDATStep['dueIn'] | null | undefined) => {
    if (dueIn === 'technical') return 7;
    if (dueIn === 'highlyTechnical') return 20;
    return 3;
  };

  const getDueStatus = (baseStep: EDATStep | null | undefined, completionStep: EDATStep | null | undefined) => {
    const forwarded = normalizeToManilaYYYYMMDD(baseStep?.dateForwarded);
    const forwardedUtc = forwarded ? parseYYYYMMDDToUtcMidnight(forwarded) : null;
    if (!forwardedUtc) return null;

    const todayUtc = parseYYYYMMDDToUtcMidnight(getManilaYYYYMMDD());
    if (!todayUtc) return null;

    const dueDays = dueDaysFor(baseStep?.dueIn);
    const dueUtc = addDaysUtc(forwardedUtc, dueDays);

    const completionDate = normalizeToManilaYYYYMMDD(completionStep?.dateReceived || completionStep?.dateForwarded);
    const completionUtc = completionDate ? parseYYYYMMDDToUtcMidnight(completionDate) : null;

    if (completionUtc) {
      const dueDatePart = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }).format(dueUtc);
      const dueDateStr = dueDatePart;
      const lateDays = Math.round((completionUtc.getTime() - dueUtc.getTime()) / (24 * 60 * 60 * 1000));
      if (lateDays > 0) return { label: `Done late ${lateDays}d`, dueDateStr, tone: 'overdue' as const };
      return { label: 'Done', dueDateStr, tone: 'ok' as const };
    }

    const diffDays = Math.round((dueUtc.getTime() - todayUtc.getTime()) / (24 * 60 * 60 * 1000));
    const dueDatePart = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(dueUtc);
    const dueDateStr = diffDays === 0 ? `${dueDatePart} 11:59 PM` : dueDatePart;
    if (diffDays < 0) return { label: `Overdue ${Math.abs(diffDays)}d`, dueDateStr, tone: 'overdue' as const };
    if (diffDays === 0) return { label: 'Due today', dueDateStr, tone: 'due' as const };
    if (diffDays === 1) return { label: '1d left', dueDateStr, tone: 'ok' as const };
    return { label: `${diffDays}d left`, dueDateStr, tone: 'ok' as const };
  };

  const getDocumentTotalDuration = (log: EDATLog) => {
    if ((log.status || '').toLowerCase() !== 'completed') return null;
    const first = log.steps.length > 0 ? log.steps[0] : null;
    const last = log.steps.length > 0 ? log.steps[log.steps.length - 1] : null;
    if (!first || !last) return null;

    const startYmd = normalizeToManilaYYYYMMDD(first.dateForwarded);
    const startCreatedAtDate = first.createdAt ? new Date(first.createdAt) : null;
    const startCreatedAtParts =
      startCreatedAtDate && !Number.isNaN(startCreatedAtDate.getTime()) ? getManilaDateTimeParts(startCreatedAtDate) : null;

    const startMs = startYmd
      ? (startCreatedAtParts && startCreatedAtParts.ymd === startYmd
          ? toUtcMillisFromManilaParts(startCreatedAtParts.ymd, startCreatedAtParts.hms)
          : toUtcMillisFromManilaParts(startYmd, '00:00:00'))
      : (startCreatedAtParts ? toUtcMillisFromManilaParts(startCreatedAtParts.ymd, startCreatedAtParts.hms) : null);
    if (startMs === null) return null;

    const endYmd = normalizeToManilaYYYYMMDD(last.dateReceived || last.dateForwarded);
    const endCreatedAtDate = last.createdAt ? new Date(last.createdAt) : null;
    const endCreatedAtParts =
      endCreatedAtDate && !Number.isNaN(endCreatedAtDate.getTime()) ? getManilaDateTimeParts(endCreatedAtDate) : null;

    const endMs = endYmd
      ? toUtcMillisFromManilaParts(
          endYmd,
          last.timeReceived || (endCreatedAtParts && endCreatedAtParts.ymd === endYmd ? endCreatedAtParts.hms : '00:00:00')
        )
      : (endCreatedAtParts ? toUtcMillisFromManilaParts(endCreatedAtParts.ymd, endCreatedAtParts.hms) : null);

    if (endMs === null) return null;
    return formatDuration(endMs - startMs);
  };

  const getDocumentElapsedDuration = (log: EDATLog) => {
    if ((log.status || '').toLowerCase() === 'completed') return null;
    const first = log.steps.length > 0 ? log.steps[0] : null;
    if (!first) return null;

    const startYmd = normalizeToManilaYYYYMMDD(first.dateForwarded);
    const startCreatedAtDate = first.createdAt ? new Date(first.createdAt) : null;
    const startCreatedAtParts =
      startCreatedAtDate && !Number.isNaN(startCreatedAtDate.getTime()) ? getManilaDateTimeParts(startCreatedAtDate) : null;

    const startMs = startYmd
      ? (startCreatedAtParts && startCreatedAtParts.ymd === startYmd
          ? toUtcMillisFromManilaParts(startCreatedAtParts.ymd, startCreatedAtParts.hms)
          : toUtcMillisFromManilaParts(startYmd, '00:00:00'))
      : (startCreatedAtParts ? toUtcMillisFromManilaParts(startCreatedAtParts.ymd, startCreatedAtParts.hms) : null);
    if (startMs === null) return null;

    const now = new Date();
    const nowParts = getManilaDateTimeParts(now);
    const endMs = toUtcMillisFromManilaParts(nowParts.ymd, nowParts.hms);
    if (endMs === null) return null;
    return formatDuration(endMs - startMs);
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
        const baseDueStep = firstStep ?? displayStep;
        const completionStep = log.status?.toLowerCase() === 'completed' ? latestStep : null;
        const dueCountdown = getDueStatus(baseDueStep, completionStep);
        const documentTotalDuration = getDocumentTotalDuration(log);
        const documentElapsedDuration = getDocumentElapsedDuration(log);
        const lastActionStep = [...log.steps].reverse().find(s => Boolean((s.actionTaken || '').trim())) ?? null;
        const currentHolder = latestPendingStep?.receiver
          ? latestPendingStep.receiver
          : (log.status?.toLowerCase() === 'completed'
              ? (latestStep?.sender || '-')
              : '-');
        const currentSection = (latestPendingStep?.section || '').trim();
        const currentHolderPosition = employeesByName.get(currentHolder)?.position || '';

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
                <span
                  className={`text-xs font-bold truncate ${
                    dueCountdown?.tone === 'overdue'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-800 dark:text-emerald-100'
                  }`}
                  title={dueCountdown ? `Due ${dueCountdown.dueDateStr}` : undefined}
                >
                  {dueCountdown ? dueCountdown.label : formatDueIn(displayStep?.dueIn)}
                </span>
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
              {currentHolderPosition ? (
                <div className="text-[11px] text-emerald-700/70 dark:text-emerald-300/70 truncate pl-3.5">
                  {currentHolderPosition}
                </div>
              ) : null}
              {currentSection ? (
                <div className="mt-1 pl-3.5 border-l-2 border-emerald-200 dark:border-emerald-800">
                  <span className="text-[9px] font-black uppercase tracking-tight text-emerald-500/70 block mb-0.5">Section</span>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 line-clamp-1 italic">
                    {currentSection}
                  </p>
                </div>
              ) : null}
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
                    const nodes: { name: string; action: string; section?: string; isCurrent: boolean }[] = [];
                    
                    log.steps.forEach((step) => {
                      const sender = (step.sender || 'Unknown').trim() || 'Unknown';
                      const action = (step.actionTaken || '').trim() || (step.stepNumber === 1 ? 'Originated' : 'Forwarded');
                      nodes.push({ name: sender, action, isCurrent: false });

                      if (!step.receiver) return;

                      const receiver = step.receiver.trim();
                      if (step.status === 'Pending') nodes.push({ name: receiver, action: 'Pending', section: (step.section || '').trim() || undefined, isCurrent: true });
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
                            {node.section ? (
                              <span className={`text-[8px] text-center line-clamp-1 w-full px-1 leading-tight mt-0.5 ${
                                node.isCurrent ? 'text-emerald-300 font-bold' : 'text-emerald-600/70 dark:text-emerald-400/60'
                              }`}>
                                {node.section}
                              </span>
                            ) : null}
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
              {(log.status || '').toLowerCase() === 'completed' ? (
                <>
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/40 dark:text-emerald-400/40">Finished In</span>
                  <span className="text-sm sm:text-base font-black text-emerald-800/70 dark:text-emerald-200/80 font-mono leading-none">
                    {documentTotalDuration || '-'}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/40 dark:text-emerald-400/40">Elapsed</span>
                  <span className="text-sm sm:text-base font-black text-emerald-800/70 dark:text-emerald-200/80 font-mono leading-none">
                    {documentElapsedDuration || '-'}
                  </span>
                </>
              )}
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
