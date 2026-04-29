'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EDATLog, EDATStep, ACTION_REQUIRED_OPTIONS, DueInType } from '@/types/edat';
import ThemeToggle from '@/components/ThemeToggle';
import { ArrowLeft, Check, Download, LogOut, Paperclip, Pencil, Plus, Save, Trees, X, Send, CheckCircle2 } from 'lucide-react';
import ConfirmationModal from '@/components/ConfirmationModal';
import FeedbackToast from '@/components/FeedbackToast';

const EMPTY_LOG: EDATLog = {
  trackingNumber: '',
  subject: '',
  documentType: '',
  status: 'Pending',
  createdAt: '',
  steps: [],
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

const normalizeLog = (value: unknown): EDATLog => {
  if (!value || typeof value !== 'object') return { ...EMPTY_LOG };
  const v = value as Record<string, unknown>;
  
  const steps = Array.isArray(v.steps) 
    ? v.steps.map((s: any) => ({
        edatsNumber: String(s.edatsNumber || ''),
        trackingNumber: String(s.trackingNumber || ''),
        stepNumber: Number(s.stepNumber || 0),
        sender: String(s.sender || ''),
        actionTaken: String(s.actionTaken || ''),
        actionRequired: Array.isArray(s.actionRequired) ? s.actionRequired : [],
        receiver: String(s.receiver || ''),
        section: String(s.section || ''),
        dueIn: (s.dueIn === 'technical' || s.dueIn === 'highlyTechnical' ? s.dueIn : 'simple') as DueInType,
        dateForwarded: String(s.dateForwarded || '').slice(0, 10),
        dateReceived: s.dateReceived ? String(s.dateReceived).slice(0, 10) : null,
        timeReceived: s.timeReceived ? String(s.timeReceived).split('.')[0] : null,
        status: (s.status || 'Pending') as any,
        createdAt: String(s.createdAt || ''),
      }))
    : [];

  return {
    trackingNumber: typeof v.trackingNumber === 'string' ? v.trackingNumber : '',
    subject: typeof v.subject === 'string' ? v.subject : '',
    documentType: typeof v.documentType === 'string' ? v.documentType : '',
    status: typeof v.status === 'string' ? v.status : 'Pending',
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : '',
    steps,
  };
};

type FieldKey = 'subject' | 'documentType';

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
  const [log, setLog] = useState<EDATLog>({ ...EMPTY_LOG });
  const [savedLog, setSavedLog] = useState<EDATLog>({ ...EMPTY_LOG });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeEdit, setActiveEdit] = useState<FieldKey | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<number | null>(null);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  // Forwarding state
  const [forwardData, setForwardData] = useState({
    receiver: '',
    section: '',
    actionTaken: '',
    actionRequired: [] as string[],
    dueIn: 'simple' as DueInType,
  });

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
        const normalized = normalizeLog(data);
        setLog(normalized);
        setSavedLog(normalized);
        setActiveEdit(null);
      } catch {
        setToast({ show: true, message: 'Failed to load entry.', type: 'error' });
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

  const toggleEdit = (field: FieldKey) => {
    setLog((prev) => (activeEdit ? { ...savedLog } : prev));
    setActiveEdit((prev) => (prev === field ? null : field));
  };

  const isEditing = (field: FieldKey) => activeEdit === field;

  const setLogField = <K extends keyof EDATLog>(field: K, value: EDATLog[K]) => {
    setLog((prev) => ({ ...prev, [field]: value }));
  };

  const cancelEdit = (field: FieldKey) => {
    setLog((prev) => ({ ...prev, [field]: savedLog[field] }));
    setActiveEdit(null);
  };

  const saveLogDetails = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/edats/${log.trackingNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: log.subject,
          documentType: log.documentType,
        }),
      });
      if (!response.ok) throw new Error('Failed to save');
      
      // Reload to get fresh data
      const reloadResponse = await fetch(`/api/edats/${log.trackingNumber}`);
      const updated = normalizeLog(await reloadResponse.json());
      setLog(updated);
      setSavedLog(updated);
      setActiveEdit(null);
      setToast({ show: true, message: 'Log details updated!', type: 'success' });
    } catch {
      setToast({ show: true, message: 'Failed to save log details.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleForward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forwardData.receiver.trim()) {
      setToast({ show: true, message: 'Please specify a receiver.', type: 'error' });
      return;
    }
    if (!forwardData.actionTaken.trim()) {
      setToast({ show: true, message: 'Please specify your action taken.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/edats/${log.trackingNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completeStep: true,
          forwardTo: forwardData.receiver,
          section: forwardData.section,
          actionTaken: forwardData.actionTaken,
          actionRequired: forwardData.actionRequired,
          dueIn: forwardData.dueIn,
        }),
      });
      if (!response.ok) throw new Error('Failed to forward');
      
      // Reload log
      const reloadResponse = await fetch(`/api/edats/${log.trackingNumber}`);
      const updated = normalizeLog(await reloadResponse.json());
      setLog(updated);
      setSavedLog(updated);
      setForwardData({
        receiver: '',
        section: '',
        actionTaken: '',
        actionRequired: [],
        dueIn: 'simple',
      });
      setToast({ show: true, message: 'Document forwarded successfully!', type: 'success' });
    } catch {
      setToast({ show: true, message: 'Failed to forward document.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmFinalize = async () => {
    if (!forwardData.actionTaken.trim()) {
      setToast({ show: true, message: 'Please specify your action taken.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/edats/${log.trackingNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completeStep: true,
          finalizeLog: true,
          actionTaken: forwardData.actionTaken,
        }),
      });
      if (!response.ok) throw new Error('Failed to finalize');
      
      const reloadResponse = await fetch(`/api/edats/${log.trackingNumber}`);
      const updated = normalizeLog(await reloadResponse.json());
      setLog(updated);
      setSavedLog(updated);
      setToast({ show: true, message: 'Document finalized successfully!', type: 'success' });
    } catch {
      setToast({ show: true, message: 'Failed to finalize document.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = () => {
    setShowFinalizeConfirm(true);
  };

  const lastStep = log.steps.length > 0 ? log.steps[log.steps.length - 1] : null;
  const isPending = lastStep?.status === 'Pending' && log.status !== 'Completed';
  const lockedSection = useMemo(() => {
    const found = [...log.steps].reverse().find(s => Boolean((s.section || '').trim()));
    return (found?.section || '').trim();
  }, [log.steps]);

  useEffect(() => {
    if (!lockedSection) return;
    setForwardData((prev) => (prev.section === lockedSection ? prev : { ...prev, section: lockedSection }));
  }, [lockedSection]);

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
          <div className="p-4 sm:p-6 border-b border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-900 dark:text-emerald-50">Log Details</div>
              <div className="text-base text-emerald-600 dark:text-emerald-400">Tracking Number: <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{log.trackingNumber}</span></div>
            </div>
            <div className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest shadow-inner border-2 ${
              log.status?.toLowerCase() === 'completed' 
                ? 'bg-emerald-500 text-white border-emerald-400' 
                : 'bg-amber-500 text-white border-amber-400'
            }`}>
              {log.status || 'Pending'}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-8">
            <section className="space-y-4">
              <h3 className="text-sm sm:text-base font-black text-emerald-900 dark:text-emerald-50 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">
                Document Information
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <FieldRow label="Subject" editing={isEditing('subject')} onToggle={() => toggleEdit('subject')} onCancel={() => cancelEdit('subject')} onSave={saveLogDetails} saving={saving}>
                  <textarea disabled={!isEditing('subject')} value={log.subject} onChange={(e) => setLogField('subject', e.target.value)} rows={2} className={inputClass(isEditing('subject'))} />
                </FieldRow>
                <FieldRow label="Type of Document" editing={isEditing('documentType')} onToggle={() => toggleEdit('documentType')} onCancel={() => cancelEdit('documentType')} onSave={saveLogDetails} saving={saving}>
                  <input disabled={!isEditing('documentType')} value={log.documentType} onChange={(e) => setLogField('documentType', e.target.value)} className={inputClass(isEditing('documentType'))} />
                </FieldRow>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm sm:text-base font-black text-emerald-900 dark:text-emerald-50 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">
                Tracking History
              </h3>
              <div className="space-y-6">
                {log.steps.length === 0 ? (
                  <div className="text-emerald-600 dark:text-emerald-400 italic">No tracking steps recorded.</div>
                ) : (
                  <div className="relative overflow-x-auto">
                    <div className="relative flex gap-6 min-w-max py-2 pr-2">
                      <div className="pointer-events-none absolute left-0 right-0 top-4 h-0.5 bg-emerald-100 dark:bg-emerald-800" />
                      {log.steps.map((step) => (
                        <div key={step.edatsNumber} className="relative pt-8 w-[520px] flex-shrink-0">
                          <div className={`absolute left-1/2 -translate-x-1/2 top-2 w-4 sm:w-5 h-4 sm:h-5 rounded-full border-2 border-white dark:border-emerald-900 z-10 ${step.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-800 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-emerald-700 text-white text-xs font-bold rounded uppercase tracking-wider">Step {step.stepNumber}</span>
                                <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400">{step.edatsNumber}</span>
                              </div>
                              <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${step.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                                {step.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
                              <div className="space-y-4">
                                <div>
                                  <div className="text-xs font-bold text-emerald-700/60 dark:text-emerald-400/60 uppercase mb-1">Sender</div>
                                  <div className="text-base font-semibold text-emerald-900 dark:text-emerald-50">{step.sender || '-'}</div>
                                </div>

                                <div>
                                  <div className="text-xs font-bold text-emerald-700/60 dark:text-emerald-400/60 uppercase mb-1">Action Taken</div>
                                  <div className="text-base text-emerald-800 dark:text-emerald-200 bg-white dark:bg-emerald-900/20 p-3 rounded border border-emerald-100 dark:border-emerald-800/50">
                                    {step.actionTaken?.trim() ? step.actionTaken : '-'}
                                  </div>
                                </div>

                                {step.receiver?.trim() ? (
                                  <div>
                                    <div className="text-xs font-bold text-emerald-700/60 dark:text-emerald-400/60 uppercase mb-1">Receiver</div>
                                    <div className="text-base font-semibold text-emerald-900 dark:text-emerald-50">{step.receiver}</div>
                                  </div>
                                ) : null}

                                {step.section?.trim() ? (
                                  <div>
                                    <div className="text-xs font-bold text-emerald-700/60 dark:text-emerald-400/60 uppercase mb-1">Section</div>
                                    <div className="text-base font-semibold text-emerald-900 dark:text-emerald-50">{step.section}</div>
                                  </div>
                                ) : null}

                                {step.actionRequired.length > 0 ? (
                                  <div>
                                    <div className="text-xs font-bold text-emerald-700/60 dark:text-emerald-400/60 uppercase mb-1">Action Required</div>
                                    <div className="flex flex-wrap gap-1">
                                      {step.actionRequired.map(act => (
                                        <span key={act} className="px-2 py-1 bg-white dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded text-sm text-emerald-800 dark:text-emerald-200">{act}</span>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>

                              <div className="lg:border-l lg:border-emerald-200 dark:lg:border-emerald-800 lg:pl-6">
                                <div className="text-xs font-bold text-emerald-700/60 dark:text-emerald-400/60 uppercase mb-1">Timeline</div>
                                <div className="text-sm text-emerald-800 dark:text-emerald-200 space-y-1">
                                  <div><span className="font-semibold">Forwarded:</span> {step.dateForwarded || '-'}</div>
                                  <div><span className="font-semibold">Received:</span> {step.dateReceived ? `${step.dateReceived} ${step.timeReceived || ''}` : '-'}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {isPending && (
              <section className="space-y-4 pt-4 border-t border-emerald-200 dark:border-emerald-800">
                <h3 className="text-sm sm:text-base font-black text-emerald-900 dark:text-emerald-50 uppercase tracking-[0.2em] border-l-4 border-amber-500 pl-3">
                  Forward Document
                </h3>
                <form onSubmit={handleForward} className="bg-amber-50/30 dark:bg-emerald-950/40 rounded-xl border border-amber-200/50 dark:border-emerald-800/50 p-4 sm:p-6 space-y-6">
                  <div className="space-y-4 p-3 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                    <div>
                      <label className="text-[10px] font-black text-emerald-700/60 dark:text-emerald-400/60 uppercase tracking-widest mb-1 block">Sender (Current Holder)</label>
                      <div className="text-sm font-bold text-emerald-900 dark:text-emerald-50 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        {lastStep?.receiver || 'Initial Sender'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Action Taken</label>
                      <textarea 
                        value={forwardData.actionTaken}
                        onChange={e => setForwardData(prev => ({ ...prev, actionTaken: e.target.value }))}
                        rows={2}
                        placeholder="What action did you take before forwarding?"
                        className="w-full p-2.5 text-sm border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        Next Receiver
                      </label>
                      <input 
                        value={forwardData.receiver}
                        onChange={e => setForwardData(prev => ({ ...prev, receiver: e.target.value }))}
                        placeholder="Who is receiving this or finalizing it?"
                        className="w-full p-2.5 text-sm border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Section</label>
                      <input
                        value={forwardData.section}
                        onChange={e => setForwardData(prev => ({ ...prev, section: e.target.value }))}
                        placeholder={lockedSection ? 'Locked' : 'Section / Unit (optional)'}
                        disabled={Boolean(lockedSection)}
                        className="w-full p-2.5 text-sm border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Due In</label>
                      <select 
                        value={forwardData.dueIn}
                        onChange={e => setForwardData(prev => ({ ...prev, dueIn: e.target.value as DueInType }))}
                        className="w-full p-2.5 text-sm border border-emerald-200 dark:border-emerald-800 rounded-lg bg-white dark:bg-emerald-950/30 outline-none focus:border-emerald-500"
                      >
                        <option value="simple">Simple (3 days)</option>
                        <option value="technical">Technical (7 days)</option>
                        <option value="highlyTechnical">Highly Technical (20 days)</option>
                      </select>
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Actions Required (From next receiver)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {ACTION_REQUIRED_OPTIONS.map(opt => (
                          <label key={opt} className="flex items-center gap-2 p-2 rounded border border-emerald-100 dark:border-emerald-800/50 bg-white dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-100 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                            <input 
                              type="checkbox"
                              checked={forwardData.actionRequired.includes(opt)}
                              onChange={() => setForwardData(prev => ({
                                ...prev,
                                actionRequired: prev.actionRequired.includes(opt) 
                                  ? prev.actionRequired.filter(o => o !== opt)
                                  : [...prev.actionRequired, opt]
                              }))}
                              className="accent-emerald-600"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={handleFinalize}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl border-2 border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-800/40 transition-all active:scale-95 disabled:opacity-70"
                    >
                      <CheckCircle2 size={18} />
                      {saving ? 'Processing...' : 'Mark as Final'}
                    </button>

                    <button 
                      type="button"
                      onClick={async () => {
                        if (!forwardData.receiver.trim()) {
                          setToast({ show: true, message: 'Please specify a receiver.', type: 'error' });
                          return;
                        }
                        const form = document.querySelector('form');
                        if (form) form.requestSubmit();
                      }}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-70"
                    >
                      <Send size={18} />
                      {saving ? 'Processing...' : 'Complete & Forward'}
                    </button>
                  </div>
                </form>
              </section>
            )}

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
                              <img
                                src={selectedAttachment.url}
                                alt={selectedAttachment.originalName || selectedAttachment.name}
                                className="absolute inset-0 w-full h-full object-contain"
                                loading="lazy"
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

      <ConfirmationModal
        isOpen={showFinalizeConfirm}
        onClose={() => setShowFinalizeConfirm(false)}
        onConfirm={confirmFinalize}
        title="Finalize Document"
        message="Are you sure you want to mark this document as FINALIZED? No further steps can be added."
        confirmLabel="Finalize"
        variant="success"
      />

      <FeedbackToast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />

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
