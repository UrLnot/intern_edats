'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { EDATEntry, EDATRouteStep } from '@/types/edat';
import ThemeToggle from '@/components/ThemeToggle';
import { ArrowLeft, Check, Download, LogOut, Paperclip, Pencil, Plus, Save, Trash2, Trees, X } from 'lucide-react';

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

const EMPTY_ENTRY: EDATEntry = {
  id: '',
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

const normalizeRouteHistory = (value: unknown): EDATRouteStep[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      personnel: typeof v.personnel === 'string' ? v.personnel : '',
      action: typeof v.action === 'string' ? v.action : '',
      remarks: typeof v.remarks === 'string' ? v.remarks : '',
    }))
    .filter((s) => s.personnel || s.action || s.remarks);
};

const normalizeEntry = (value: unknown): EDATEntry => {
  if (!value || typeof value !== 'object') return { ...EMPTY_ENTRY };
  const v = value as Record<string, unknown>;
  return {
    id: typeof v.id === 'string' ? v.id : '',
    trackingNumber: typeof v.trackingNumber === 'string' ? v.trackingNumber : '',
    edatsNumber: typeof v.edatsNumber === 'string' ? v.edatsNumber : '',
    dateForwarded: typeof v.dateForwarded === 'string' ? v.dateForwarded.slice(0, 10) : '',
    sender: typeof v.sender === 'string' ? v.sender : '',
    subject: typeof v.subject === 'string' ? v.subject : '',
    documentType: typeof v.documentType === 'string' ? v.documentType : '',
    actionRequired: Array.isArray(v.actionRequired) ? v.actionRequired.filter((x): x is string => typeof x === 'string') : [],
    dueIn: v.dueIn === 'technical' || v.dueIn === 'highlyTechnical' ? v.dueIn : 'simple',
    routeHistory: normalizeRouteHistory(v.routeHistory),
    section: typeof v.section === 'string' ? v.section : '',
    receiver: typeof v.receiver === 'string' ? v.receiver : '',
    actionTakenReceiver: typeof v.actionTakenReceiver === 'string' ? v.actionTakenReceiver : '',
    timeReceived: typeof v.timeReceived === 'string' ? v.timeReceived.split('.')[0] : '',
    dateReceived: typeof v.dateReceived === 'string' ? v.dateReceived.slice(0, 10) : '',
    status: typeof v.status === 'string' ? v.status : 'Pending',
  };
};

type FieldKey =
  | keyof Omit<EDATEntry, 'routeHistory' | 'actionRequired' | 'dueIn' | 'timeReceived' | 'dateReceived' | 'status'>
  | 'actionRequired'
  | 'dueIn'
  | 'routeHistory';

type AttachmentItem = {
  id: number;
  name: string;
  originalName: string;
  type: string;
  size: number;
  url: string;
  createdAt?: string;
};

export default function EntryDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<EDATEntry>({ ...EMPTY_ENTRY });
  const [savedEntry, setSavedEntry] = useState<EDATEntry>({ ...EMPTY_ENTRY });
  const [originalId, setOriginalId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeEdit, setActiveEdit] = useState<FieldKey | null>(null);
  const [routeDraft, setRouteDraft] = useState<EDATRouteStep>({ personnel: '', action: '', remarks: '' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<number | null>(null);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/edats/${params.id}`);
        if (!response.ok) throw new Error('Failed to load entry');
        const data = await response.json();
        const normalized = normalizeEntry(data);
        if (normalized.receiver.trim()) {
          const { date, time } = getCurrentManilaDateTime();
          if (!normalized.dateReceived) normalized.dateReceived = date;
          if (!normalized.timeReceived) normalized.timeReceived = time;
        }
        setEntry(normalized);
        setSavedEntry(normalized);
        setOriginalId(normalized.id || params.id);
        setActiveEdit(null);
      } catch {
        alert('Failed to load entry.');
      } finally {
        setLoading(false);
      }
    };
    if (params.id) load();
  }, [params.id]);

  useEffect(() => {
    const loadAttachments = async () => {
      if (!params.id) return;
      setAttachmentsLoading(true);
      try {
        const response = await fetch(`/api/edats/${encodeURIComponent(params.id)}/attachments`);
        if (!response.ok) return;
        const data = (await response.json()) as unknown;
        const list = Array.isArray(data)
          ? data
              .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
              .map((v) => ({
                id: typeof v.id === 'number' ? v.id : -1,
                name: typeof v.name === 'string' ? v.name : '',
                originalName: typeof v.originalName === 'string' ? v.originalName : '',
                type: typeof v.type === 'string' ? v.type : '',
                size: typeof v.size === 'number' ? v.size : 0,
                url: typeof v.url === 'string' ? v.url : '',
                createdAt: typeof v.createdAt === 'string' ? v.createdAt : undefined,
              }))
              .filter((v) => v.id >= 0 && v.url)
          : [];
        setAttachments(list);
        setSelectedAttachmentId((prev) => {
          if (prev !== null && list.some((a) => a.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      } catch {
      } finally {
        setAttachmentsLoading(false);
      }
    };
    loadAttachments();
  }, [params.id]);

  useEffect(() => {
    if (!entry.receiver.trim()) return;
    if (entry.dateReceived && entry.timeReceived) return;
    const { date, time } = getCurrentManilaDateTime();
    setEntry((prev) => ({
      ...prev,
      dateReceived: prev.dateReceived || date,
      timeReceived: prev.timeReceived || time,
    }));
  }, [entry.receiver, entry.dateReceived, entry.timeReceived]);

  const toggleEdit = (field: FieldKey) => {
    setRouteDraft({ personnel: '', action: '', remarks: '' });
    setEntry((prev) => (activeEdit ? { ...savedEntry } : prev));
    setActiveEdit((prev) => (prev === field ? null : field));
  };

  const isEditing = (field: FieldKey) => activeEdit === field;

  const setField = <K extends keyof EDATEntry>(field: K, value: EDATEntry[K]) => {
    setEntry((prev) => ({ ...prev, [field]: value }));
  };

  const restoreField = (field: FieldKey) => {
    setEntry((prev) => {
      if (field === 'actionRequired') return { ...prev, actionRequired: [...savedEntry.actionRequired] };
      if (field === 'routeHistory') return { ...prev, routeHistory: savedEntry.routeHistory.map((s) => ({ ...s })) };
      if (field === 'dueIn') return { ...prev, dueIn: savedEntry.dueIn };
      if (field === 'section') return { ...prev, section: savedEntry.section };
      if (field === 'receiver') {
        return {
          ...prev,
          receiver: savedEntry.receiver,
          dateReceived: savedEntry.dateReceived,
          timeReceived: savedEntry.timeReceived,
        };
      }
      if (field === 'trackingNumber') return { ...prev, trackingNumber: savedEntry.trackingNumber };
      if (field === 'edatsNumber') return { ...prev, edatsNumber: savedEntry.edatsNumber };
      if (field === 'dateForwarded') return { ...prev, dateForwarded: savedEntry.dateForwarded };
      if (field === 'sender') return { ...prev, sender: savedEntry.sender };
      if (field === 'subject') return { ...prev, subject: savedEntry.subject };
      if (field === 'documentType') return { ...prev, documentType: savedEntry.documentType };
      if (field === 'actionTakenReceiver') return { ...prev, actionTakenReceiver: savedEntry.actionTakenReceiver };
      return prev;
    });
  };

  const cancelEdit = (field: FieldKey) => {
    restoreField(field);
    setRouteDraft({ personnel: '', action: '', remarks: '' });
    setActiveEdit(null);
  };

  const saveEntry = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/edats/${originalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!response.ok) throw new Error('Failed to save');
      const updated = normalizeEntry(await response.json());
      setEntry(updated);
      setSavedEntry(updated);
      setOriginalId(updated.id || entry.trackingNumber || originalId);
      setActiveEdit(null);
      if (updated.id && updated.id !== params.id) {
        router.replace(`/edats/${encodeURIComponent(updated.id)}`);
      }
    } catch {
      alert('Failed to save entry.');
    } finally {
      setSaving(false);
    }
  };

  const dueInLabel = useMemo(() => {
    if (entry.dueIn === 'technical') return 'Technical (7 days)';
    if (entry.dueIn === 'highlyTechnical') return 'Highly Technical (20 days)';
    return 'Simple (3 days)';
  }, [entry.dueIn]);
  const computedStatus = useMemo(
    () =>
      computeStatus({
        receiver: entry.receiver,
        dateForwarded: entry.dateForwarded,
        dueIn: entry.dueIn,
      }),
    [entry.receiver, entry.dateForwarded, entry.dueIn]
  );

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

  const addRouteStep = () => {
    const next: EDATRouteStep = {
      personnel: routeDraft.personnel.trim(),
      action: routeDraft.action.trim(),
      remarks: routeDraft.remarks.trim(),
    };
    if (!next.personnel) return;
    setEntry((prev) => ({ ...prev, routeHistory: [...prev.routeHistory, next] }));
    setRouteDraft({ personnel: '', action: '', remarks: '' });
  };

  const removeRouteStep = (index: number) => {
    setEntry((prev) => ({ ...prev, routeHistory: prev.routeHistory.filter((_, i) => i !== index) }));
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  if (loading) return <div className="p-6 text-emerald-700">Loading...</div>;

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const selectedAttachment = attachments.find((a) => a.id === selectedAttachmentId) ?? null;
  const selectedExt = selectedAttachment?.originalName?.split('.').pop()?.toLowerCase() ?? '';
  const selectedMime = selectedAttachment?.type?.toLowerCase() ?? '';
  const isPdf = selectedMime.includes('pdf') || selectedExt === 'pdf';
  const isImage =
    selectedMime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(selectedExt);

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
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100 rounded-lg transition-all font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs sm:text-sm"
              >
                <LogOut size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <section className="bg-white dark:bg-emerald-900/50 rounded-xl sm:rounded-2xl shadow-lg border border-emerald-200 dark:border-emerald-800 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-emerald-200 dark:border-emerald-800">
            <div className="text-xl sm:text-2xl font-bold text-emerald-900 dark:text-emerald-50">Entry Details</div>
            <div className="text-base text-emerald-600 dark:text-emerald-400">Edit each detail using the icon beside it.</div>
          </div>

          <div className="p-4 sm:p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FieldRow label="Tracking #" editing={isEditing('trackingNumber')} onToggle={() => toggleEdit('trackingNumber')} onCancel={() => cancelEdit('trackingNumber')} onSave={saveEntry} saving={saving}>
              <input disabled={!isEditing('trackingNumber')} value={entry.trackingNumber} onChange={(e) => setField('trackingNumber', e.target.value)} className={inputClass(isEditing('trackingNumber'))} />
            </FieldRow>
            <FieldRow label="eDTS #" editing={isEditing('edatsNumber')} onToggle={() => toggleEdit('edatsNumber')} onCancel={() => cancelEdit('edatsNumber')} onSave={saveEntry} saving={saving}>
              <input disabled={!isEditing('edatsNumber')} value={entry.edatsNumber} onChange={(e) => setField('edatsNumber', e.target.value)} className={inputClass(isEditing('edatsNumber'))} />
            </FieldRow>
            <div className="p-3 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20">
              <div className="text-sm sm:text-base font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">Status</div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold uppercase bg-white dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
                {computedStatus}
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <h3 className="text-sm sm:text-base font-black text-emerald-900 dark:text-emerald-50 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">
              Document Information
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="lg:col-span-2">
                <FieldRow label="Subject" editing={isEditing('subject')} onToggle={() => toggleEdit('subject')} onCancel={() => cancelEdit('subject')} onSave={saveEntry} saving={saving}>
                  <textarea disabled={!isEditing('subject')} value={entry.subject} onChange={(e) => setField('subject', e.target.value)} rows={2} className={inputClass(isEditing('subject'))} />
                </FieldRow>
              </div>
              <div className="lg:col-span-2">
                <FieldRow label="Type of Document" editing={isEditing('documentType')} onToggle={() => toggleEdit('documentType')} onCancel={() => cancelEdit('documentType')} onSave={saveEntry} saving={saving}>
                  <input disabled={!isEditing('documentType')} value={entry.documentType} onChange={(e) => setField('documentType', e.target.value)} className={inputClass(isEditing('documentType'))} />
                </FieldRow>
              </div>
              <FieldRow label="Date Forwarded" editing={isEditing('dateForwarded')} onToggle={() => toggleEdit('dateForwarded')} onCancel={() => cancelEdit('dateForwarded')} onSave={saveEntry} saving={saving}>
                <input type="date" disabled={!isEditing('dateForwarded')} value={entry.dateForwarded} onChange={(e) => setField('dateForwarded', e.target.value)} className={inputClass(isEditing('dateForwarded'))} />
              </FieldRow>
              <FieldRow label="Sender" editing={isEditing('sender')} onToggle={() => toggleEdit('sender')} onCancel={() => cancelEdit('sender')} onSave={saveEntry} saving={saving}>
                <input disabled={!isEditing('sender')} value={entry.sender} onChange={(e) => setField('sender', e.target.value)} className={inputClass(isEditing('sender'))} />
              </FieldRow>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm sm:text-base font-black text-emerald-900 dark:text-emerald-50 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">
              Requirements
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <FieldRow label="Action Required" editing={isEditing('actionRequired')} onToggle={() => toggleEdit('actionRequired')} onCancel={() => cancelEdit('actionRequired')} onSave={saveEntry} saving={saving}>
            {isEditing('actionRequired') ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ACTION_REQUIRED_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm text-emerald-900 dark:text-emerald-50">
                    <input
                      type="checkbox"
                      checked={entry.actionRequired.includes(option)}
                      onChange={() =>
                        setField(
                          'actionRequired',
                          entry.actionRequired.includes(option)
                            ? entry.actionRequired.filter((v) => v !== option)
                            : [...entry.actionRequired, option]
                        )
                      }
                      className="accent-emerald-600"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-base text-emerald-800 dark:text-emerald-200">{entry.actionRequired.length ? entry.actionRequired.join(', ') : 'Not set'}</div>
            )}
              </FieldRow>

              <FieldRow label="Due In" editing={isEditing('dueIn')} onToggle={() => toggleEdit('dueIn')} onCancel={() => cancelEdit('dueIn')} onSave={saveEntry} saving={saving}>
            {isEditing('dueIn') ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { value: 'simple', label: 'Simple (3 days)' },
                  { value: 'technical', label: 'Technical (7 days)' },
                  { value: 'highlyTechnical', label: 'Highly Technical (20 days)' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm text-emerald-900 dark:text-emerald-50">
                    <input type="radio" name="dueIn" value={opt.value} checked={entry.dueIn === opt.value} onChange={(e) => setField('dueIn', e.target.value as EDATEntry['dueIn'])} className="accent-emerald-600" />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-base text-emerald-800 dark:text-emerald-200">{dueInLabel}</div>
            )}
              </FieldRow>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm sm:text-base font-black text-emerald-900 dark:text-emerald-50 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">
              Inbound Details
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <FieldRow label="Section" editing={isEditing('section')} onToggle={() => toggleEdit('section')} onCancel={() => cancelEdit('section')} onSave={saveEntry} saving={saving}>
                <input disabled={!isEditing('section')} value={entry.section} onChange={(e) => setField('section', e.target.value)} className={inputClass(isEditing('section'))} />
              </FieldRow>

              <FieldRow label="Receiver" editing={isEditing('receiver')} onToggle={() => toggleEdit('receiver')} onCancel={() => cancelEdit('receiver')} onSave={saveEntry} saving={saving}>
                <input disabled={!isEditing('receiver')} value={entry.receiver} onChange={(e) => setField('receiver', e.target.value)} className={inputClass(isEditing('receiver'))} />
              </FieldRow>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20">
                  <div className="text-sm sm:text-base font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">Time Received</div>
                  <div className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 border-emerald-200 dark:border-emerald-800">
                    {entry.timeReceived || 'Not set'}
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20">
                  <div className="text-sm sm:text-base font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">Date Received</div>
                  <div className="w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 border-emerald-200 dark:border-emerald-800">
                    {entry.dateReceived || 'Not set'}
                  </div>
                </div>
              </div>

              <FieldRow label="Action Taken - Receiver" editing={isEditing('actionTakenReceiver')} onToggle={() => toggleEdit('actionTakenReceiver')} onCancel={() => cancelEdit('actionTakenReceiver')} onSave={saveEntry} saving={saving}>
                <textarea disabled={!isEditing('actionTakenReceiver')} value={entry.actionTakenReceiver} onChange={(e) => setField('actionTakenReceiver', e.target.value)} rows={2} className={inputClass(isEditing('actionTakenReceiver'))} />
              </FieldRow>
            </div>
          </section>

          <FieldRow label="Route History" editing={isEditing('routeHistory')} onToggle={() => toggleEdit('routeHistory')} onCancel={() => cancelEdit('routeHistory')} onSave={saveEntry} saving={saving}>
            <div className="space-y-2">
              {isEditing('routeHistory') ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <input value={routeDraft.personnel} onChange={(e) => setRouteDraft((p) => ({ ...p, personnel: e.target.value }))} placeholder="Personnel" className={inputClass(true)} />
                  <input value={routeDraft.action} onChange={(e) => setRouteDraft((p) => ({ ...p, action: e.target.value }))} placeholder="Action" className={inputClass(true)} />
                  <textarea value={routeDraft.remarks} onChange={(e) => setRouteDraft((p) => ({ ...p, remarks: e.target.value }))} placeholder="Remarks" rows={2} className={`sm:col-span-2 ${inputClass(true)}`} />
                  <button type="button" onClick={addRouteStep} className="sm:col-span-2 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                    <Plus size={14} />
                    Add Step
                  </button>
                </div>
              ) : null}

              {entry.routeHistory.length === 0 ? (
                <div className="text-base text-emerald-600 dark:text-emerald-400 italic">No route steps.</div>
              ) : (
                <div className="relative overflow-x-auto">
                  <div className="min-w-max px-2 pb-1">
                    <div className="relative flex items-start gap-6 pt-2">
                      <div className="absolute left-0 right-0 top-5 h-px bg-emerald-200 dark:bg-emerald-800" />
                      {entry.routeHistory.map((step, index) => (
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
                              {isEditing('routeHistory') ? (
                                <button type="button" onClick={() => removeRouteStep(index)} className="shrink-0 p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove step">
                                  <Trash2 size={14} />
                                </button>
                              ) : null}
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
          </FieldRow>

          <section className="space-y-4">
            <h3 className="text-sm sm:text-base font-black text-emerald-900 dark:text-emerald-50 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">
              Attachments
            </h3>

            {attachmentsLoading ? (
              <div className="text-base text-emerald-700/70 dark:text-emerald-300/70 italic">Loading attachments...</div>
            ) : attachments.length === 0 ? (
              <div className="text-base text-emerald-700/70 dark:text-emerald-300/70 italic">No attachments.</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1">
                  <div className="grid grid-cols-1 gap-2">
                    {attachments.map((file) => {
                      const active = file.id === selectedAttachmentId;
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => setSelectedAttachmentId(file.id)}
                          className={`w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                            active
                              ? 'bg-emerald-100/60 dark:bg-emerald-900/40 border-emerald-300/70 dark:border-emerald-700/70 shadow-sm'
                              : 'bg-white/70 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/70 hover:bg-white dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Paperclip size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-50 truncate" title={file.originalName || file.name}>
                                {file.originalName || file.name}
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] font-mono text-emerald-700/70 dark:text-emerald-300/70">
                              {formatBytes(file.size)}
                            </div>
                          </div>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-emerald-700 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            title="Open in new tab"
                          >
                            <Download size={14} />
                          </a>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  {selectedAttachment ? (
                    <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-800/70 bg-white/70 dark:bg-emerald-950/20 overflow-hidden">
                      <div className="px-4 py-3 border-b border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-emerald-900 dark:text-emerald-50 truncate">
                            {selectedAttachment.originalName || selectedAttachment.name}
                          </div>
                          <div className="text-[11px] font-mono text-emerald-700/70 dark:text-emerald-300/70">
                            {formatBytes(selectedAttachment.size)}
                          </div>
                        </div>
                        <a
                          href={selectedAttachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm"
                        >
                          <Download size={14} />
                          Open
                        </a>
                      </div>

                      <div className="p-3">
                        {isPdf ? (
                          <iframe
                            src={selectedAttachment.url}
                            className="w-full h-[520px] rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white"
                            title={selectedAttachment.originalName || selectedAttachment.name}
                          />
                        ) : isImage ? (
                          <div className="w-full h-[520px] rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white/60 dark:bg-emerald-950/10 overflow-hidden relative">
                            <Image
                              src={selectedAttachment.url}
                              alt={selectedAttachment.originalName || selectedAttachment.name}
                              fill
                              sizes="(max-width: 1024px) 100vw, 66vw"
                              className="object-contain"
                              priority={false}
                            />
                          </div>
                        ) : (
                          <div className="w-full rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white/60 dark:bg-emerald-950/10 p-6">
                            <div className="text-sm text-emerald-800 dark:text-emerald-200">
                              Preview not available for this file type. Use Open to view/download.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-base text-emerald-700/70 dark:text-emerald-300/70 italic">Select an attachment to preview.</div>
                  )}
                </div>
              </div>
            )}
          </section>
          </div>
        </section>
      </div>

      <footer className="w-full bg-gray-100 dark:bg-emerald-950 border-t border-emerald-200 dark:border-emerald-800 py-3 px-4 sm:px-6 flex flex-col justify-center items-center text-center gap-1 shrink-0">
        <p className="text-[10px] sm:text-sm font-medium text-gray-600 dark:text-emerald-400/60">© {new Date().getFullYear()} Department of Environment and Natural Resources - CAR</p>
        <p className="text-[10px] text-gray-500 dark:text-emerald-600/50 uppercase tracking-wider italic">Working towards a sustainable environment</p>
      </footer>
    </main>
  );
}

function FieldRow({
  label,
  editing,
  onToggle,
  onCancel,
  onSave,
  saving,
  children,
}: {
  label: string;
  editing: boolean;
  onToggle: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="p-3 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm sm:text-base font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{label}</div>
        <button onClick={onToggle} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold ${editing ? 'bg-emerald-600 text-white' : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800/50'}`}>
          <Pencil size={12} />
          {editing ? 'Editing' : 'Edit'}
        </button>
      </div>
      {children}
      {editing ? (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-800/40">
            <X size={16} />
            Cancel
          </button>
          <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-70">
            {saving ? <Check size={16} /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function inputClass(editing: boolean) {
  return `w-full p-2.5 text-base border rounded-lg bg-white dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 ${editing ? 'border-emerald-400 dark:border-emerald-600' : 'border-emerald-200 dark:border-emerald-800'} outline-none`;
}
