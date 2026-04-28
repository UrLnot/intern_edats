import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

type LogRow = RowDataPacket & {
  tracking_number: string;
  subject: string;
  document_type: string;
  status: string;
  created_at: Date;
};

type StepRow = RowDataPacket & {
  edats_number: string;
  tracking_number: string;
  step_number: number;
  sender: string;
  action_taken: string | null;
  action_required: string | null;
  receiver: string | null;
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

const getNextEdatsSequenceForYearMonth = async (year: string, month: string): Promise<number> => {
  const like = `EDTS-${year}-${month}-%`;
  const [rows] = await pool.query<Array<RowDataPacket & { edats_number: string }>>(
    'SELECT edats_number FROM edats_steps WHERE edats_number LIKE ? ORDER BY edats_number DESC LIMIT 1',
    [like]
  );
  const last = rows[0]?.edats_number;
  const lastSeq = last ? /(\d+)$/.exec(last)?.[1] : undefined;
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
      const year = datePart.slice(0, 4);
      const month = datePart.slice(4, 6);
      
      const [trackingSeq, edatsSeq] = await Promise.all([
        getNextTrackingSequenceForDate(datePart),
        getNextEdatsSequenceForYearMonth(year, month)
      ]);

      const trackingNumber = `PMD-${datePart}-${String(trackingSeq).padStart(4, '0')}`;
      const edatsNumber = `EDTS-${year}-${month}-${String(edatsSeq).padStart(4, '0')}`;
      return NextResponse.json({ trackingNumber, edatsNumber });
    }

    // Fetch all logs
    const [logRows] = await pool.query<LogRow[]>('SELECT * FROM edats_logs ORDER BY created_at DESC');
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
      createdAt: log.created_at,
      steps: (stepsByTracking.get(log.tracking_number) || []).map(step => ({
        edatsNumber: step.edats_number,
        trackingNumber: step.tracking_number,
        stepNumber: step.step_number,
        sender: step.sender,
        actionTaken: step.action_taken,
        actionRequired: parseActionRequired(step.action_required),
        receiver: step.receiver,
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
      await conn.beginTransaction();

      // 1. Determine Tracking Number
      let trackingNumber = data.trackingNumber?.trim();
      if (!trackingNumber) {
        const datePart = getPhilippinesDatePartYYYYMMDD(data.dateForwarded);
        const seq = await getNextTrackingSequenceForDate(datePart);
        trackingNumber = `PMD-${datePart}-${String(seq).padStart(4, '0')}`;
      }

      // 2. Insert Log
      await conn.query(
        'INSERT INTO edats_logs (tracking_number, subject, document_type, status) VALUES (?, ?, ?, ?)',
        [trackingNumber, data.subject, data.documentType, 'Pending']
      );

      // 3. Determine EDATS Number for first step
      let edatsNumber = data.edatsNumber?.trim();
      if (!edatsNumber) {
        const datePart = getPhilippinesDatePartYYYYMMDD(data.dateForwarded);
        const year = datePart.slice(0, 4);
        const month = datePart.slice(4, 6);
        const seq = await getNextEdatsSequenceForYearMonth(year, month);
        edatsNumber = `EDTS-${year}-${month}-${String(seq).padStart(4, '0')}`;
      }

      // 4. Insert Steps
      const dateForwarded = data.dateForwarded ? new Date(data.dateForwarded).toISOString().split('T')[0] : getManilaDateYYYYMMDD(new Date());
      
      if (data.actionTaken?.trim()) {
        // If there's an action taken during creation, it means the sender did something.
        // Create a completed step for the sender's action
        await conn.query(
          `INSERT INTO edats_steps 
          (edats_number, tracking_number, step_number, sender, action_taken, action_required, receiver, due_in, date_forwarded, status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            edatsNumber,
            trackingNumber,
            1,
            data.sender,
            data.actionTaken,
            JSON.stringify([]),
            data.sender,
            normalizeDueIn(data.dueIn),
            dateForwarded,
            'Completed'
          ]
        );

        // Then create the pending step for the receiver
        // Generate a new edats number for the second step
        const year = dateForwarded.slice(0, 4);
        const month = dateForwarded.slice(5, 7);
        const seq = await getNextEdatsSequenceForYearMonth(year, month);
        const edatsNumber2 = `EDTS-${year}-${month}-${String(seq).padStart(4, '0')}`;

        await conn.query(
          `INSERT INTO edats_steps 
          (edats_number, tracking_number, step_number, sender, action_taken, action_required, receiver, due_in, date_forwarded, status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            edatsNumber2,
            trackingNumber,
            2,
            data.sender,
            '',
            JSON.stringify(parseActionRequired(data.actionRequired)),
            data.receiver,
            normalizeDueIn(data.dueIn),
            dateForwarded,
            'Pending'
          ]
        );
      } else {
        // No initial action, just create the pending step for the receiver
        await conn.query(
          `INSERT INTO edats_steps 
          (edats_number, tracking_number, step_number, sender, action_taken, action_required, receiver, due_in, date_forwarded, status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            edatsNumber,
            trackingNumber,
            1,
            data.sender,
            '',
            JSON.stringify(parseActionRequired(data.actionRequired)),
            data.receiver,
            normalizeDueIn(data.dueIn),
            dateForwarded,
            'Pending'
          ]
        );
      }

      await conn.commit();
      return NextResponse.json({ trackingNumber, edatsNumber, status: 'Pending' });
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
