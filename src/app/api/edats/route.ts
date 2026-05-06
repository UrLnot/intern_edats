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
      const [rows] = await pool.query<Array<RowDataPacket & { total: number; pending: number; completed: number }>>(
        `SELECT
          SUM(1) AS total,
          SUM(CASE WHEN archived = 0 AND LOWER(status) = 'pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) AS completed
        FROM edats_logs`
      );
      const first = rows[0] || { total: 0, pending: 0, completed: 0 };
      return NextResponse.json({
        total: Number(first.total || 0),
        pending: Number(first.pending || 0),
        completed: Number(first.completed || 0),
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
      await conn.beginTransaction();
      const datePart = getPhilippinesDatePartYYYYMMDD(data.dateForwarded);

      // 1. Determine Tracking Number
      let trackingNumber = data.trackingNumber?.trim();
      if (!trackingNumber) {
        const seq = await getNextTrackingSequenceForDate(datePart);
        trackingNumber = `PMD-${datePart}-${String(seq).padStart(4, '0')}`;
      }

      // 2. Insert Log
      await conn.query(
        'INSERT INTO edats_logs (tracking_number, subject, document_type, status) VALUES (?, ?, ?, ?)',
        [trackingNumber, subject, documentType, 'Pending']
      );

      // 3. Insert Steps
      const dateForwarded = data.dateForwarded ? new Date(data.dateForwarded).toISOString().split('T')[0] : getManilaDateYYYYMMDD(new Date());

      const initialActionTaken =
        typeof data.actionTaken === 'string' && data.actionTaken.trim()
          ? data.actionTaken.trim()
          : 'Originated';

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
