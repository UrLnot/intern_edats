import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

type LogRow = RowDataPacket & {
  tracking_number: string;
  subject: string;
  document_type: string;
  status: string;
  archived: number;
  created_at: Date;
};

type StepRow = RowDataPacket & {
  tracking_number: string;
  step_number: number;
  sender: string;
  action_taken: string | null;
  action_required: string | null;
  remarks: string | null;
  receiver: string | null;
  section: string | null;
  due_in: string;
  date_forwarded: Date | null;
  date_received: Date | null;
  time_received: string | null;
  status: string;
  created_at: Date;
};

const normalizeDueIn = (value: unknown): 'simple' | 'technical' | 'highlyTechnical' =>
  value === 'technical' || value === 'highlyTechnical' ? value : 'simple';

const getManilaDateYYYYMMDD = (date: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const getManilaTimeHHMMSS = (date: Date): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

const getPhilippinesDatePartYYYYMMDD = (value: unknown): string => {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}${match[2]}${match[3]}`;
  }
  const date = value instanceof Date ? value : new Date();
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return formatted.replace(/-/g, '');
};

const normalizeToManilaYYYYMMDD = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') {
    const direct = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return getManilaDateYYYYMMDD(d);
    const loose = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (loose) return `${loose[1]}-${loose[2]}-${loose[3]}`;
    return '';
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return getManilaDateYYYYMMDD(value);
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

const getManilaDateTimeParts = (date: Date) => ({ ymd: getManilaDateYYYYMMDD(date), hms: getManilaTimeHHMMSS(date) });

const toUtcMillisFromManilaParts = (ymd: string, hms: string | null | undefined) => {
  const dateUtc = parseYYYYMMDDToUtcMidnight(ymd);
  if (!dateUtc) return null;
  const seconds = hms ? parseHHMMSSToSeconds(hms) : 0;
  if (seconds === null) return dateUtc.getTime();
  return dateUtc.getTime() + seconds * 1000;
};

const addDaysUtc = (dateUtc: Date, days: number) => new Date(dateUtc.getTime() + days * 24 * 60 * 60 * 1000);

const dueDaysFor = (dueIn: unknown) => {
  if (dueIn === 'technical') return 7;
  if (dueIn === 'highlyTechnical') return 20;
  return 3;
};

const getNextTrackingSequenceForDate = async (datePartYYYYMMDD: string): Promise<number> => {
  const like = `PMD-${datePartYYYYMMDD}-%`;
  const [rows] = await pool.query<Array<RowDataPacket & { tracking_number: string }>>(
    'SELECT tracking_number FROM edats_logs WHERE tracking_number LIKE ? ORDER BY tracking_number DESC LIMIT 1',
    [like]
  );
  const last = rows[0]?.tracking_number;
  const lastSeq = last ? /(\d{4})$/.exec(last)?.[1] : undefined;
  return (lastSeq ? parseInt(lastSeq, 10) : 0) + 1;
};

const parseActionRequired = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(v => String(v).trim()).filter(Boolean);
  } catch {}
  return value.split(/[\n,]+/g).map(s => s.trim()).filter(Boolean);
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('nextIds') === '1') {
      const dateForwarded = url.searchParams.get('dateForwarded');
      const datePart = getPhilippinesDatePartYYYYMMDD(dateForwarded);
      const trackingSeq = await getNextTrackingSequenceForDate(datePart);

      const trackingNumber = `PMD-${datePart}-${String(trackingSeq).padStart(4, '0')}`;
      return NextResponse.json({ trackingNumber });
    }

    if (url.searchParams.get('counts') === '1') {
      const [rows] = await pool.query<
        Array<
          RowDataPacket & {
            active_total: number;
            active_pending: number;
            active_completed: number;
            archived_total: number;
            archived_pending: number;
            archived_completed: number;
          }
        >
      >(
        `SELECT
          SUM(CASE WHEN archived = 0 THEN 1 ELSE 0 END) AS active_total,
          SUM(CASE WHEN archived = 0 AND LOWER(status) = 'pending' THEN 1 ELSE 0 END) AS active_pending,
          SUM(CASE WHEN archived = 0 AND LOWER(status) = 'completed' THEN 1 ELSE 0 END) AS active_completed,
          SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) AS archived_total,
          SUM(CASE WHEN archived = 1 AND LOWER(status) = 'pending' THEN 1 ELSE 0 END) AS archived_pending,
          SUM(CASE WHEN archived = 1 AND LOWER(status) = 'completed' THEN 1 ELSE 0 END) AS archived_completed
        FROM edats_logs`
      );

      const [activeDueRows] = await pool.query<
        Array<RowDataPacket & { tracking_number: string; date_forwarded: unknown; due_in: string }>
      >(
        `SELECT l.tracking_number, s.due_in, s.date_forwarded
         FROM edats_logs l
         JOIN edats_steps s
           ON s.tracking_number = l.tracking_number
          AND s.step_number = 1
        WHERE l.archived = 0
          AND LOWER(l.status) <> 'completed'`
      );

      const [archivedDueRows] = await pool.query<
        Array<
          RowDataPacket & {
            tracking_number: string;
            base_date_forwarded: unknown;
            due_in: string;
            end_date_received: unknown;
            end_date_forwarded: unknown;
            end_time_received: string | null;
            end_created_at: unknown;
          }
        >
      >(
        `SELECT
          l.tracking_number,
          s1.due_in,
          s1.date_forwarded AS base_date_forwarded,
          sl.date_received AS end_date_received,
          sl.date_forwarded AS end_date_forwarded,
          sl.time_received AS end_time_received,
          sl.created_at AS end_created_at
        FROM edats_logs l
        JOIN edats_steps s1
          ON s1.tracking_number = l.tracking_number
         AND s1.step_number = 1
        JOIN (
          SELECT tracking_number, MAX(step_number) AS max_step
          FROM edats_steps
          GROUP BY tracking_number
        ) m
          ON m.tracking_number = l.tracking_number
        JOIN edats_steps sl
          ON sl.tracking_number = m.tracking_number
         AND sl.step_number = m.max_step
        WHERE l.archived = 1
          AND LOWER(l.status) = 'completed'`
      );

      const [typeRows] = await pool.query<
        Array<RowDataPacket & { archived: number; document_type: string; count: number }>
      >(
        `SELECT
          archived,
          COALESCE(NULLIF(TRIM(document_type), ''), 'Unspecified') AS document_type,
          COUNT(*) AS count
        FROM edats_logs
        GROUP BY archived, COALESCE(NULLIF(TRIM(document_type), ''), 'Unspecified')
        ORDER BY archived ASC, count DESC, document_type ASC`
      );
      const first =
        rows[0] || {
          active_total: 0,
          active_pending: 0,
          active_completed: 0,
          archived_total: 0,
          archived_pending: 0,
          archived_completed: 0,
        };

      const activeDocumentTypes: Array<{ type: string; count: number }> = [];
      const archivedDocumentTypes: Array<{ type: string; count: number }> = [];
      for (const r of typeRows) {
        const item = { type: String(r.document_type || 'Unspecified'), count: Number(r.count || 0) };
        if (Number(r.archived) === 1) archivedDocumentTypes.push(item);
        else activeDocumentTypes.push(item);
      }

      const { ymd: nowYmd, hms: nowHms } = getManilaDateTimeParts(new Date());
      const nowMs = toUtcMillisFromManilaParts(nowYmd, nowHms) ?? Date.now();

      let activeOverdue = 0;
      for (const r of activeDueRows) {
        const baseYmd = normalizeToManilaYYYYMMDD(r.date_forwarded);
        const baseUtc = baseYmd ? parseYYYYMMDDToUtcMidnight(baseYmd) : null;
        if (!baseUtc) continue;
        const dueUtc = addDaysUtc(baseUtc, dueDaysFor(r.due_in));
        const dueMs = dueUtc.getTime() + (23 * 3600 + 59 * 60 + 59) * 1000;
        if (nowMs > dueMs) activeOverdue += 1;
      }

      let archivedCompletedOverdue = 0;
      for (const r of archivedDueRows) {
        const baseYmd = normalizeToManilaYYYYMMDD(r.base_date_forwarded);
        const baseUtc = baseYmd ? parseYYYYMMDDToUtcMidnight(baseYmd) : null;
        if (!baseUtc) continue;
        const dueUtc = addDaysUtc(baseUtc, dueDaysFor(r.due_in));
        const dueMs = dueUtc.getTime() + (23 * 3600 + 59 * 60 + 59) * 1000;

        const endCreatedAtDate = r.end_created_at instanceof Date ? r.end_created_at : new Date(String(r.end_created_at || ''));
        const endCreatedAtParts = !Number.isNaN(endCreatedAtDate.getTime()) ? getManilaDateTimeParts(endCreatedAtDate) : null;
        const completionYmd =
          normalizeToManilaYYYYMMDD(r.end_date_received) ||
          normalizeToManilaYYYYMMDD(r.end_date_forwarded) ||
          (endCreatedAtParts?.ymd || '');
        if (!completionYmd) continue;
        const completionHms =
          (r.end_time_received && r.end_time_received.trim()) ||
          (endCreatedAtParts && endCreatedAtParts.ymd === completionYmd ? endCreatedAtParts.hms : '00:00:00');
        const completionMs = toUtcMillisFromManilaParts(completionYmd, completionHms);
        if (completionMs === null) continue;
        if (completionMs > dueMs) archivedCompletedOverdue += 1;
      }

      return NextResponse.json({
        active: {
          total: Number(first.active_total || 0),
          pending: Number(first.active_pending || 0),
          completed: Number(first.active_completed || 0),
          overdue: activeOverdue,
          documentTypes: activeDocumentTypes,
        },
        archived: {
          total: Number(first.archived_total || 0),
          pending: Number(first.archived_pending || 0),
          completed: Number(first.archived_completed || 0),
          completedOverdue: archivedCompletedOverdue,
          documentTypes: archivedDocumentTypes,
        },
      });
    }

    const wantArchived = url.searchParams.get('archived') === '1';

    // Fetch logs (active by default)
    const [logRows] = await pool.query<LogRow[]>(
      'SELECT * FROM edats_logs WHERE archived = ? ORDER BY created_at DESC',
      [wantArchived ? 1 : 0]
    );
    if (logRows.length === 0) return NextResponse.json([]);

    const trackingNumbers = logRows.map(l => l.tracking_number);
    const placeholders = trackingNumbers.map(() => '?').join(', ');

    // Fetch all steps for these logs
    const [stepRows] = await pool.query<StepRow[]>(
      `SELECT * FROM edats_steps WHERE tracking_number IN (${placeholders}) ORDER BY tracking_number, step_number ASC`,
      trackingNumbers
    );

    const stepsByTracking = new Map<string, StepRow[]>();
    stepRows.forEach(row => {
      const list = stepsByTracking.get(row.tracking_number) || [];
      list.push(row);
      stepsByTracking.set(row.tracking_number, list);
    });

    const entries = logRows.map(log => ({
      id: log.tracking_number,
      trackingNumber: log.tracking_number,
      subject: log.subject,
      documentType: log.document_type,
      status: log.status,
      archived: Boolean(log.archived),
      createdAt: log.created_at,
      steps: (stepsByTracking.get(log.tracking_number) || []).map(step => ({
        trackingNumber: step.tracking_number,
        stepNumber: step.step_number,
        sender: step.sender,
        actionTaken: step.action_taken,
        actionRequired: parseActionRequired(step.action_required),
        remarks: step.remarks,
        receiver: step.receiver,
        section: step.section,
        dueIn: step.due_in,
        dateForwarded: step.date_forwarded,
        dateReceived: step.date_received,
        timeReceived: step.time_received,
        status: step.status,
        createdAt: step.created_at,
      }))
    }));

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Failed to fetch entries:', error);
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const conn = await pool.getConnection();

    try {
      const MAX_TRACKING = 64;
      const MAX_NAME = 120;
      const MAX_SECTION = 64;
      const MAX_SUBJECT = 500;
      const MAX_TYPE = 80;
      const MAX_ACTION_TAKEN = 2000;
      const MAX_REMARKS = 2000;

      const sender = typeof data.sender === 'string' ? data.sender.trim() : '';
      const receiver = typeof data.receiver === 'string' ? data.receiver.trim() : '';
      const sectionRaw = typeof data.section === 'string' ? data.section.trim() : '';
      const section = sectionRaw ? sectionRaw : null;
      const remarksRaw = typeof data.remarks === 'string' ? data.remarks.trim() : '';
      const remarks = remarksRaw ? remarksRaw : null;
      const subject = typeof data.subject === 'string' ? data.subject.trim() : '';
      const documentType = typeof data.documentType === 'string' ? data.documentType.trim() : '';
      if (!sender || !receiver || !subject) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
      }
      if (sender.length > MAX_NAME) return NextResponse.json({ error: 'Sender is too long.' }, { status: 400 });
      if (receiver.length > MAX_NAME) return NextResponse.json({ error: 'Receiver is too long.' }, { status: 400 });
      if (sectionRaw && sectionRaw.length > MAX_SECTION) return NextResponse.json({ error: 'Section is too long.' }, { status: 400 });
      if (subject.length > MAX_SUBJECT) return NextResponse.json({ error: 'Subject is too long.' }, { status: 400 });
      if (documentType && documentType.length > MAX_TYPE) return NextResponse.json({ error: 'Document type is too long.' }, { status: 400 });
      if (remarksRaw && remarksRaw.length > MAX_REMARKS) return NextResponse.json({ error: 'Remarks is too long.' }, { status: 400 });

      const datePart = getPhilippinesDatePartYYYYMMDD(data.dateForwarded);

      // 1. Determine Tracking Number
      let trackingNumber = typeof data.trackingNumber === 'string' ? data.trackingNumber.trim() : '';
      if (!trackingNumber) {
        const seq = await getNextTrackingSequenceForDate(datePart);
        trackingNumber = `PMD-${datePart}-${String(seq).padStart(4, '0')}`;
      }
      if (trackingNumber.length > MAX_TRACKING) return NextResponse.json({ error: 'Tracking number is too long.' }, { status: 400 });

      const initialActionTaken =
        typeof data.actionTaken === 'string' && data.actionTaken.trim()
          ? data.actionTaken.trim()
          : 'Originated';
      if (initialActionTaken.length > MAX_ACTION_TAKEN) {
        return NextResponse.json({ error: 'Action taken is too long.' }, { status: 400 });
      }

      await conn.beginTransaction();

      // 2. Insert Log
      await conn.query(
        'INSERT INTO edats_logs (tracking_number, subject, document_type, status) VALUES (?, ?, ?, ?)',
        [trackingNumber, subject, documentType, 'Pending']
      );


      // 3. Insert Steps
      const dateForwarded = data.dateForwarded ? new Date(data.dateForwarded).toISOString().split('T')[0] : getManilaDateYYYYMMDD(new Date());

      await conn.query(
        `INSERT INTO edats_steps 
        (tracking_number, step_number, sender, action_taken, action_required, remarks, receiver, section, due_in, date_forwarded, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trackingNumber,
          1,
          sender,
          initialActionTaken,
          JSON.stringify(parseActionRequired(data.actionRequired)),
          remarks,
          receiver,
          section,
          normalizeDueIn(data.dueIn),
          dateForwarded,
          'Pending',
        ]
      );

      await conn.commit();
      return NextResponse.json({ trackingNumber, status: 'Pending' });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Failed to create entry:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
