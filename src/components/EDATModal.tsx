'use client';

import React, { useEffect, useState } from 'react';
import { EDATEntry, EDATRouteStep } from '@/types/edat';
import { Trash2, X } from 'lucide-react';

const ACTION_REQUIRED_OPTIONS = [
  'For appropriate action',
  'For information/record/file',
  'For evaluation/review',
  'For comment/recommendation',
  'For investigation',
  'As instructed/directed',
  'Please act URGENTLY',
  'For compliance',
  'For implementation',
  'For dissemination',
  'For attendance',
  'For acknowledgement',
  'Please see me about this',
  'Please act within 15 days',
] as const;

interface EDATModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entry: Omit<EDATEntry, 'id'> & { id?: string }) => void;
  entry?: EDATEntry | null;
}

const normalizeDateForInput = (value: unknown): string => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0] ?? '';
  if (typeof value !== 'string') return '';
  const directMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch?.[1]) return directMatch[1];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0] ?? '';
};

const normalizeTimeForInput = (value: unknown): string => {
  if (!value) return '';
  if (typeof value !== 'string') return '';
  const cleaned = value.split('.')[0] ?? '';
  if (/^00:00(?::00)?$/.test(cleaned)) return '';
  return cleaned;
};

const normalizeStatusForSelect = (value: unknown): 'Pending' | 'Completed' => {
  if (value === 'Completed') return 'Completed';
  if (value === 'Pending') return 'Pending';
  if (typeof value !== 'string') return 'Pending';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'complete') return 'Completed';
  if (normalized === 'pending') return 'Pending';
  return 'Pending';
};

const normalizeDueInForRadio = (value: unknown): EDATEntry['dueIn'] => {
  if (value === 'simple' || value === 'technical' || value === 'highlyTechnical') return value;
  if (typeof value !== 'string') return 'simple';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'simple') return 'simple';
  if (normalized === 'technical') return 'technical';
  if (normalized === 'highly technical' || normalized === 'highly_technical') return 'highlyTechnical';
  return 'simple';
};

const normalizeActionRequiredForCheckboxes = (value: unknown): EDATEntry['actionRequired'] => {
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter(Boolean);
    }
  } catch {}
  return trimmed
    .split(/[\n,]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
};

const normalizeRouteHistory = (value: unknown): EDATEntry['routeHistory'] => {
  if (Array.isArray(value)) {
    return value
      .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
      .map((v): EDATRouteStep => ({
        personnel:
          typeof v.personnel === 'string'
            ? v.personnel
            : typeof v.to === 'string'
              ? v.to
              : typeof v.from === 'string'
                ? v.from
                : '',
        action: typeof v.action === 'string' ? v.action : '',
        remarks:
          typeof v.remarks === 'string'
            ? v.remarks
            : typeof v.date === 'string' || typeof v.time === 'string'
              ? `${typeof v.date === 'string' ? v.date : ''} ${typeof v.time === 'string' ? v.time : ''}`.trim()
              : '',
      }))
      .filter((v) => v.personnel || v.action || v.remarks);
  }
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return normalizeRouteHistory(parsed);
  } catch {
    return [];
  }
};

const normalizeEntryForForm = (entry: EDATEntry): Omit<EDATEntry, 'id'> => ({
  trackingNumber: entry.trackingNumber ?? '',
  edatsNumber: entry.edatsNumber ?? '',
  status: normalizeStatusForSelect(entry.status),
  dateForwarded: normalizeDateForInput(entry.dateForwarded),
  sender: entry.sender ?? '',
  subject: entry.subject ?? '',
  documentType: entry.documentType ?? '',
  actionRequired: normalizeActionRequiredForCheckboxes(entry.actionRequired),
  dueIn: normalizeDueInForRadio(entry.dueIn),
  routeHistory: normalizeRouteHistory(entry.routeHistory),
  receiver: entry.receiver ?? '',
  actionTakenReceiver: entry.actionTakenReceiver ?? '',
  timeReceived: normalizeTimeForInput(entry.timeReceived),
  dateReceived: normalizeDateForInput(entry.dateReceived),
});

const initialFormState: Omit<EDATEntry, 'id'> = {
  trackingNumber: '',
  edatsNumber: '',
  status: 'Pending',
  dateForwarded: '',
  sender: '',
  subject: '',
  documentType: '',
  actionRequired: [],
  dueIn: 'simple',
  routeHistory: [],
  receiver: '',
  actionTakenReceiver: '',
  timeReceived: '',
  dateReceived: '',
};

export default function EDATModal({ isOpen, onClose, onSubmit, entry }: EDATModalProps) {
  const [formData, setFormData] = useState<Omit<EDATEntry, 'id'>>(() =>
    entry ? normalizeEntryForForm(entry) : { ...initialFormState }
  );
  const [generatedIds, setGeneratedIds] = useState<{ trackingNumber: string; edatsNumber: string } | null>(null);
  const [routeDraft, setRouteDraft] = useState<EDATRouteStep>({
    personnel: '',
    action: '',
    remarks: '',
  });

  useEffect(() => {
    if (!isOpen || entry) return;
    let cancelled = false;

    const fetchNextIds = async () => {
      try {
        const url = new URL('/api/edats', window.location.origin);
        url.searchParams.set('nextIds', '1');
        if (formData.dateForwarded) url.searchParams.set('dateForwarded', formData.dateForwarded);
        const response = await fetch(url.toString());
        if (!response.ok) return;
        const data = (await response.json()) as { trackingNumber?: unknown; edatsNumber?: unknown };
        const trackingNumber = typeof data.trackingNumber === 'string' ? data.trackingNumber : '';
        const edatsNumber = typeof data.edatsNumber === 'string' ? data.edatsNumber : '';
        if (!cancelled) setGeneratedIds({ trackingNumber, edatsNumber });
      } catch {
        if (!cancelled) setGeneratedIds(null);
      }
    };

    fetchNextIds();
    return () => {
      cancelled = true;
    };
  }, [isOpen, entry, formData.dateForwarded]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleActionRequired = (option: (typeof ACTION_REQUIRED_OPTIONS)[number]) => {
    setFormData((prev) => {
      const current = prev.actionRequired ?? [];
      const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
      return { ...prev, actionRequired: next };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, id: entry?.id });
    onClose();
  };

  const handleRouteDraftChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRouteDraft((prev) => ({ ...prev, [name]: value }));
  };

  const addRouteStep = () => {
    const next: EDATRouteStep = {
      personnel: routeDraft.personnel.trim(),
      action: routeDraft.action.trim(),
      remarks: routeDraft.remarks.trim(),
    };
    if (!next.personnel) return;
    setFormData((prev) => ({ ...prev, routeHistory: [...(prev.routeHistory ?? []), next] }));
    setRouteDraft((prev) => ({ ...prev, action: '', remarks: '' }));
  };

  const removeRouteStep = (index: number) => {
    setFormData((prev) => ({ ...prev, routeHistory: prev.routeHistory.filter((_, i) => i !== index) }));
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
              <input type="text" name="trackingNumber" value={entry ? formData.trackingNumber : generatedIds?.trackingNumber || ''} onChange={handleChange} readOnly={!entry} required={!!entry} placeholder={entry ? undefined : 'Auto-generated'} className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">eDATs #</label>
              <input type="text" name="edatsNumber" value={entry ? formData.edatsNumber : generatedIds?.edatsNumber || ''} onChange={handleChange} readOnly={!entry} required={!!entry} placeholder={entry ? undefined : 'Auto-generated'} className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
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

          <div>
            <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Date Forwarded</label>
            <input type="date" name="dateForwarded" value={formData.dateForwarded} onChange={handleChange} required className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
          </div>

          <div>
            <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Subject</label>
            <textarea name="subject" value={formData.subject} onChange={handleChange} rows={2} required className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
          </div>

          <div>
            <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Type of Document</label>
            <input type="text" name="documentType" value={formData.documentType} onChange={handleChange} className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
          </div>

          <div>
            <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Action Required</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACTION_REQUIRED_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2 p-3 border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.actionRequired.includes(option)}
                    onChange={() => toggleActionRequired(option)}
                    className="accent-emerald-600"
                  />
                  <span className="font-semibold text-sm lg:text-base">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Due In</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="flex items-center gap-2 p-3 border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 cursor-pointer">
                <input type="radio" name="dueIn" value="simple" checked={formData.dueIn === 'simple'} onChange={handleChange} className="accent-emerald-600" />
                <span className="font-semibold text-sm lg:text-base">Simple (3 days)</span>
              </label>
              <label className="flex items-center gap-2 p-3 border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 cursor-pointer">
                <input type="radio" name="dueIn" value="technical" checked={formData.dueIn === 'technical'} onChange={handleChange} className="accent-emerald-600" />
                <span className="font-semibold text-sm lg:text-base">Technical (7 days)</span>
              </label>
              <label className="flex items-center gap-2 p-3 border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 cursor-pointer">
                <input type="radio" name="dueIn" value="highlyTechnical" checked={formData.dueIn === 'highlyTechnical'} onChange={handleChange} className="accent-emerald-600" />
                <span className="font-semibold text-sm lg:text-base">Highly Technical (20 days)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Sender</label>
            <input type="text" name="sender" value={formData.sender} onChange={handleChange} required className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
          </div>

          <div>
            <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Receiver</label>
            <input type="text" name="receiver" value={formData.receiver} onChange={handleChange} className="w-full p-2.5 sm:p-3 lg:p-4 text-sm lg:text-base border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs sm:text-sm lg:text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Route History</label>
              <button
                type="button"
                onClick={addRouteStep}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                Add Step
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Personnel</label>
                <input type="text" name="personnel" value={routeDraft.personnel} onChange={handleRouteDraftChange} className="w-full p-2.5 text-sm border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 outline-none placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Action</label>
                <input type="text" name="action" value={routeDraft.action} onChange={handleRouteDraftChange} className="w-full p-2.5 text-sm border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 outline-none placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Remarks</label>
                <textarea name="remarks" value={routeDraft.remarks} onChange={handleRouteDraftChange} rows={2} className="w-full p-2.5 text-sm border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 outline-none placeholder:text-gray-400 dark:placeholder:text-emerald-600/50" />
              </div>
            </div>

            <div className="space-y-2">
              {formData.routeHistory.length === 0 ? (
                <div className="text-sm text-emerald-600/70 dark:text-emerald-300/60 italic">No route steps yet.</div>
              ) : (
                <div className="relative overflow-x-auto">
                  <div className="min-w-max px-2 pb-1">
                    <div className="relative flex items-start gap-6 pt-2">
                      <div className="absolute left-0 right-0 top-5 h-px bg-emerald-200 dark:bg-emerald-800" />
                      {formData.routeHistory.map((step, index) => (
                        <div key={`${step.personnel}-${index}`} className="relative w-[280px] shrink-0 pt-10">
                          <div className="absolute left-1/2 -translate-x-1/2 top-2 w-6 h-6 rounded-full bg-emerald-600 dark:bg-emerald-700 text-white flex items-center justify-center text-[11px] font-extrabold">
                            {index + 1}
                          </div>
                          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950/20 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold text-emerald-900 dark:text-emerald-50 truncate">{step.personnel}</div>
                                {step.action ? (
                                  <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                    {step.action}
                                  </div>
                                ) : null}
                              </div>
                              <button type="button" onClick={() => removeRouteStep(index)} className="shrink-0 p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove step">
                                <Trash2 size={14} />
                              </button>
                            </div>
                            {step.remarks ? (
                              <div className="mt-2 text-sm text-emerald-700/80 dark:text-emerald-300/80 whitespace-pre-wrap">
                                {step.remarks}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
