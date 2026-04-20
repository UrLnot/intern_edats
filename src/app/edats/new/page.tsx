'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EDATEntry, EDATRouteStep } from '@/types/edat';
import ThemeToggle from '@/components/ThemeToggle';
import { ArrowLeft, LogOut, Paperclip, Plus, Trash2, Trees, X } from 'lucide-react';

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

const getCurrentManilaDateTime = () => {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
  return { date, time };
};

const EMPTY_ENTRY: Omit<EDATEntry, 'id'> = {
  trackingNumber: '',
  edatsNumber: '',
  dateForwarded: '',
  sender: '',
  subject: '',
  documentType: '',
  actionRequired: [],
  dueIn: 'simple',
  routeHistory: [],
  section: '',
  receiver: '',
  actionTakenReceiver: '',
  timeReceived: '',
  dateReceived: '',
  status: 'Pending',
};

const computeStatus = (input: { receiver?: string; dateForwarded?: string; dueIn?: EDATEntry['dueIn'] }): 'Completed' | 'Pending' | 'Passed Due' => {
  if ((input.receiver || '').trim()) return 'Completed';
  const dueIn = input.dueIn ?? 'simple';
  const days = dueIn === 'technical' ? 7 : dueIn === 'highlyTechnical' ? 20 : 3;
  const forwarded = (input.dateForwarded || '').slice(0, 10);
  if (!forwarded) return 'Pending';
  const base = new Date(`${forwarded}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return 'Pending';
  base.setUTCDate(base.getUTCDate() + days);
  const dueDate = base.toISOString().slice(0, 10);
  const today = getCurrentManilaDateTime().date;
  return today > dueDate ? 'Passed Due' : 'Pending';
};

export default function NewEntryPage() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Omit<EDATEntry, 'id'>>({ ...EMPTY_ENTRY });
  const [routeDraft, setRouteDraft] = useState<EDATRouteStep>({ personnel: '', action: '', remarks: '' });
  const [generatedIds, setGeneratedIds] = useState<{ trackingNumber: string; edatsNumber: string } | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!formData.receiver.trim()) return;
    if (formData.dateReceived && formData.timeReceived) return;
    const { date, time } = getCurrentManilaDateTime();
    setFormData((prev) => ({
      ...prev,
      dateReceived: prev.dateReceived || date,
      timeReceived: prev.timeReceived || time,
    }));
  }, [formData.receiver, formData.dateReceived, formData.timeReceived]);

  useEffect(() => {
    let cancelled = false;
    const loadNext = async () => {
      try {
        const url = new URL('/api/edats', window.location.origin);
        url.searchParams.set('nextIds', '1');
        if (formData.dateForwarded) url.searchParams.set('dateForwarded', formData.dateForwarded);
        const response = await fetch(url.toString());
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setGeneratedIds({
            trackingNumber: typeof data.trackingNumber === 'string' ? data.trackingNumber : '',
            edatsNumber: typeof data.edatsNumber === 'string' ? data.edatsNumber : '',
          });
        }
      } catch {}
    };
    loadNext();
    return () => {
      cancelled = true;
    };
  }, [formData.dateForwarded]);

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const computedStatus = computeStatus({
    receiver: formData.receiver,
    dateForwarded: formData.dateForwarded,
    dueIn: formData.dueIn,
  });

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleActionRequired = (option: (typeof ACTION_REQUIRED_OPTIONS)[number]) => {
    setFormData((prev) => ({
      ...prev,
      actionRequired: prev.actionRequired.includes(option)
        ? prev.actionRequired.filter((v) => v !== option)
        : [...prev.actionRequired, option],
    }));
  };

  const addRouteStep = () => {
    const next: EDATRouteStep = {
      personnel: routeDraft.personnel.trim(),
      action: routeDraft.action.trim(),
      remarks: routeDraft.remarks.trim(),
    };
    if (!next.personnel) return;
    setFormData((prev) => ({ ...prev, routeHistory: [...prev.routeHistory, next] }));
    setRouteDraft({ personnel: '', action: '', remarks: '' });
  };

  const removeRouteStep = (index: number) => {
    setFormData((prev) => ({ ...prev, routeHistory: prev.routeHistory.filter((_, i) => i !== index) }));
  };

  const addAttachments = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    setAttachments((prev) => {
      const next = [...prev];
      for (const file of incoming) {
        if (!next.some((f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) {
          next.push(file);
        }
      }
      return next;
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/edats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed');
      const created = await response.json();
      const trackingNumber =
        typeof created.trackingNumber === 'string'
          ? created.trackingNumber
          : typeof created.id === 'string'
            ? created.id
            : '';

      if (!trackingNumber) throw new Error('Missing id');

      if (trackingNumber && attachments.length > 0) {
        const form = new FormData();
        attachments.forEach((file) => {
          form.append('files', file, file.name);
        });
        const uploadResponse = await fetch(`/api/edats/${encodeURIComponent(trackingNumber)}/attachments`, {
          method: 'POST',
          body: form,
        });
        if (!uploadResponse.ok) {
          alert('Entry created, but failed to upload attachments.');
        } else {
          setAttachments([]);
        }
      }

      router.push(`/?created=1&newId=${encodeURIComponent(trackingNumber)}`);
    } catch {
      alert('Failed to create entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 dark:bg-emerald-950">
      <div className="bg-emerald-900 dark:bg-emerald-950 text-white py-2 px-4 text-xs sm:text-sm uppercase tracking-widest font-bold flex justify-between items-center shrink-0 border-b border-emerald-200 dark:border-emerald-800">
        <span className="hidden sm:block">Planning and Management Division</span>
        <span className="sm:hidden text-[10px]">PMD</span>
        <div className="flex items-center gap-3 font-mono text-[10px] sm:text-xs">
          <span>{formattedDate}</span>
          <span className="text-emerald-300">{formattedTime}</span>
        </div>
      </div>

      <div className="flex-1 max-w-[1800px] mx-auto px-2 sm:px-4 py-4 w-full">
        <header className="mb-4">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-emerald-700 dark:bg-emerald-800 rounded-lg sm:rounded-xl text-white">
                <Trees size={20} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-extrabold text-emerald-900 dark:text-emerald-50 tracking-tight">eDTS</h1>
                <p className="text-[10px] sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider leading-tight">Document Tracking System</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button onClick={() => router.push('/')} className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100 rounded-lg transition-all font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs sm:text-sm">
                <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <ThemeToggle />
              <button onClick={handleLogout} className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100 rounded-lg transition-all font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs sm:text-sm">
                <LogOut size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <section className="bg-white dark:bg-emerald-900/50 rounded-xl sm:rounded-2xl shadow-lg border border-emerald-200 dark:border-emerald-800 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-emerald-200 dark:border-emerald-800">
            <div className="text-xl sm:text-2xl font-bold text-emerald-900 dark:text-emerald-50">New Entry</div>
            <div className="text-base text-emerald-600 dark:text-emerald-400">Create a new document log record.</div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Tracking #</label>
                <input value={generatedIds?.trackingNumber || ''} readOnly className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">eDTS #</label>
                <input value={generatedIds?.edatsNumber || ''} readOnly className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Status</label>
                <input value={computedStatus} readOnly className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Subject</label>
                <textarea name="subject" value={formData.subject} onChange={handleChange} rows={2} required className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Type of Document</label>
                <input name="documentType" value={formData.documentType} onChange={handleChange} className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Date Forwarded</label>
                <input type="date" name="dateForwarded" value={formData.dateForwarded} onChange={handleChange} required className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Sender</label>
                <input name="sender" value={formData.sender} onChange={handleChange} required className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Action Required</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ACTION_REQUIRED_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center gap-2 text-base text-emerald-900 dark:text-emerald-50">
                    <input type="checkbox" checked={formData.actionRequired.includes(option)} onChange={() => toggleActionRequired(option)} className="accent-emerald-600" />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Due In</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { value: 'simple', label: 'Simple (3 days)' },
                  { value: 'technical', label: 'Technical (7 days)' },
                  { value: 'highlyTechnical', label: 'Highly Technical (20 days)' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-base text-emerald-900 dark:text-emerald-50">
                    <input type="radio" name="dueIn" value={opt.value} checked={formData.dueIn === opt.value} onChange={(e) => setFormData((p) => ({ ...p, dueIn: e.target.value as EDATEntry['dueIn'] }))} className="accent-emerald-600" />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Section</label>
                  <input name="section" value={formData.section} onChange={handleChange} className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Receiver</label>
                  <input name="receiver" value={formData.receiver} onChange={handleChange} className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Route History</label>
                  <button type="button" onClick={addRouteStep} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                    <Plus size={14} />
                    Add Step
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <input value={routeDraft.personnel} onChange={(e) => setRouteDraft((p) => ({ ...p, personnel: e.target.value }))} placeholder="Personnel" className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
                  <input value={routeDraft.action} onChange={(e) => setRouteDraft((p) => ({ ...p, action: e.target.value }))} placeholder="Action" className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
                  <textarea value={routeDraft.remarks} onChange={(e) => setRouteDraft((p) => ({ ...p, remarks: e.target.value }))} placeholder="Remarks" rows={2} className="sm:col-span-2 w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
                </div>

                {formData.routeHistory.length === 0 ? (
                  <div className="mt-2 text-base text-emerald-600/70 dark:text-emerald-300/60 italic">No route steps yet.</div>
                ) : (
                  <div className="relative overflow-x-auto mt-2">
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
                              {step.remarks ? <div className="mt-2 text-sm text-emerald-700/80 dark:text-emerald-300/80 whitespace-pre-wrap">{step.remarks}</div> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Attachments</label>
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-100 text-sm font-semibold cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors">
                    <Paperclip size={14} />
                    Add Files
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        addAttachments(e.target.files);
                        e.currentTarget.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {attachments.length === 0 ? (
                  <div className="text-base text-emerald-600/70 dark:text-emerald-300/60 italic">No attachments added.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white/70 dark:bg-emerald-950/20">
                    {attachments.map((file, index) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-emerald-200/70 dark:border-emerald-800/70 bg-white dark:bg-emerald-950/30"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-50 truncate" title={file.name}>
                            {file.name}
                          </div>
                          <div className="text-[11px] text-emerald-700/70 dark:text-emerald-300/70 font-mono">
                            {formatBytes(file.size)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="shrink-0 p-2 rounded-lg text-emerald-700/70 hover:text-emerald-900 hover:bg-emerald-50 dark:text-emerald-300/70 dark:hover:text-emerald-50 dark:hover:bg-emerald-900/40 transition-colors"
                          title="Remove attachment"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Time Received</label>
                  <input value={formData.timeReceived || ''} readOnly className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Date Received</label>
                  <input value={formData.dateReceived || ''} readOnly className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">Action Taken - Receiver</label>
                <textarea name="actionTakenReceiver" value={formData.actionTakenReceiver} onChange={handleChange} rows={2} className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50" />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-emerald-200 dark:border-emerald-800">
              <button type="button" onClick={() => router.push('/')} className="w-full sm:w-auto px-5 py-2.5 text-base font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="w-full sm:w-auto px-6 py-2.5 text-base font-bold text-white bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-70">
                {saving ? 'Creating...' : 'Create Entry'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <footer className="w-full bg-gray-100 dark:bg-emerald-950 border-t border-emerald-200 dark:border-emerald-800 py-3 px-4 sm:px-6 flex flex-col justify-center items-center text-center gap-1 shrink-0">
        <p className="text-[10px] sm:text-sm font-medium text-gray-600 dark:text-emerald-400/60">© {new Date().getFullYear()} Department of Environment and Natural Resources - CAR</p>
        <p className="text-[10px] text-gray-500 dark:text-emerald-600/50 uppercase tracking-wider italic">Working towards a sustainable environment</p>
      </footer>
    </main>
  );
}
