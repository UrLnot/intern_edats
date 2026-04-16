import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

type LogRow = RowDataPacket & {
  tracking_number: string;
  edats_number: string;
  date_forwarded: string | Date | null;
  sender: string;
  subject: string;
  document_type: string | null;
  actioned_required: string | null;
  due_in: string | null;
  route_history?: string | null;
  receiver: string;
  action_taken_receiver: string;
  time_received: string | null;
  date_received: string | Date | null;
  status: string;
};

type RouteHistoryRow = RowDataPacket & {
  id: number;
  tracking_number: string;
  step_index: number;
  personnel: string;
  action: string | null;
  remarks: string | null;
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

const computeStatus = (input: { receiver?: unknown; dateForwarded?: unknown; dueIn?: unknown }): 'Completed' | 'Pending' | 'Passed Due' => {
  const receiver = typeof input.receiver === 'string' ? input.receiver.trim() : '';
  if (receiver) return 'Completed';

  const dueIn = normalizeDueIn(input.dueIn);
  const days = dueIn === 'technical' ? 7 : dueIn === 'highlyTechnical' ? 20 : 3;

  const forwardedRaw =
    typeof input.dateForwarded === 'string'
      ? input.dateForwarded.slice(0, 10)
      : input.dateForwarded instanceof Date
        ? input.dateForwarded.toISOString().slice(0, 10)
        : '';
  if (!forwardedRaw) return 'Pending';

  const forwardedDate = new Date(`${forwardedRaw}T00:00:00Z`);
  if (Number.isNaN(forwardedDate.getTime())) return 'Pending';
  forwardedDate.setUTCDate(forwardedDate.getUTCDate() + days);
  const dueDate = forwardedDate.toISOString().slice(0, 10);
  const today = getManilaDateYYYYMMDD(new Date());
  return today > dueDate ? 'Passed Due' : 'Pending';
};

const getPhilippinesDatePartYYYYMMDD = (value: unknown): string => {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}${match[2]}${match[3]}`;
  }

  const date =
    value instanceof Date
      ? value
      : typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : new Date();
  if (Number.isNaN(date.getTime())) {
    const fallback = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return fallback.replace(/-/g, '');
  }

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
    'SELECT tracking_number FROM logs WHERE tracking_number LIKE ? ORDER BY tracking_number DESC LIMIT 1',
    [like]
  );

  const last = rows[0]?.tracking_number;
  const lastSeq = last ? /(\d{4})$/.exec(last)?.[1] : undefined;
  const next = (lastSeq ? parseInt(lastSeq, 10) : 0) + 1;
  return next;
};

const parseActionRequired = (value: unknown): string[] => {
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

const serializeActionRequired = (value: unknown): string => {
  const list = parseActionRequired(value);
  return list.length ? JSON.stringify(list) : '';
};

const parseRouteHistory = (value: unknown): Array<{ personnel: string; action: string; remarks: string }> => {
  if (Array.isArray(value)) {
    return value
      .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
      .map((v) => ({
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
    return parseRouteHistory(JSON.parse(trimmed));
  } catch {
    return [];
  }
};

const replaceRouteHistoryTx = async (
  conn: { query: (sql: string, values?: unknown[]) => Promise<unknown> },
  trackingNumber: string,
  value: unknown
) => {
  const steps = parseRouteHistory(value);
  await conn.query('DELETE FROM route_history WHERE tracking_number = ?', [trackingNumber]);
  if (steps.length === 0) return;
  const rows = steps.map((step, index) => [
    trackingNumber,
    index + 1,
    step.personnel,
    step.action || null,
    step.remarks || null,
  ]);
  await conn.query('INSERT INTO route_history (tracking_number, step_index, personnel, action, remarks) VALUES ?', [rows]);
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('nextIds') === '1') {
      const dateForwarded = url.searchParams.get('dateForwarded');
      const datePart = getPhilippinesDatePartYYYYMMDD(dateForwarded);
      const seq = await getNextTrackingSequenceForDate(datePart);
      const seq4 = String(seq).padStart(4, '0');
      const trackingNumber = `PMD-${datePart}-${seq4}`;
      const edatsNumber = `EDTS-PMD${seq4}-${seq4}`;
      return NextResponse.json({ trackingNumber, edatsNumber });
    }

    const [rows] = await pool.query<LogRow[]>('SELECT * FROM logs ORDER BY date_forwarded DESC');

    const trackingNumbers = rows.map((r) => r.tracking_number);
    const routeHistoryByTracking = new Map<string, Array<{ personnel: string; action: string; remarks: string }>>();
    if (trackingNumbers.length > 0) {
      try {
        const placeholders = trackingNumbers.map(() => '?').join(', ');
        const [routeRows] = await pool.query<RouteHistoryRow[]>(
          `SELECT id, tracking_number, step_index, personnel, action, remarks
           FROM route_history
           WHERE tracking_number IN (${placeholders})
           ORDER BY tracking_number ASC, step_index ASC, id ASC`,
          trackingNumbers
        );
        for (const row of routeRows) {
          const current = routeHistoryByTracking.get(row.tracking_number) ?? [];
          current.push({
            personnel: row.personnel,
            action: row.action ?? '',
            remarks: row.remarks ?? '',
          });
          routeHistoryByTracking.set(row.tracking_number, current);
        }
      } catch {}
    }
    
    // Map snake_case from DB to camelCase for frontend
    const entries = rows.map((row) => ({
      id: row.tracking_number, // Using tracking_number as id since no id column exists
      trackingNumber: row.tracking_number,
      edatsNumber: row.edats_number,
      status: computeStatus({ receiver: row.receiver, dateForwarded: row.date_forwarded, dueIn: row.due_in }),
      dateForwarded: row.date_forwarded,
      sender: row.sender,
      subject: row.subject,
      documentType: row.document_type ?? '',
      actionRequired: parseActionRequired(row.actioned_required),
      dueIn: row.due_in === 'technical' || row.due_in === 'highlyTechnical' ? row.due_in : 'simple',
      routeHistory: routeHistoryByTracking.get(row.tracking_number) ?? parseRouteHistory(row.route_history),
      receiver: row.receiver,
      actionTakenReceiver: row.action_taken_receiver,
      timeReceived: row.time_received,
      dateReceived: row.date_received,
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

    const dateForwarded = data.dateForwarded ? new Date(data.dateForwarded).toISOString().split('T')[0] : null;
    const dueIn = normalizeDueIn(data.dueIn);
    const status = computeStatus({ receiver: data.receiver, dateForwarded, dueIn });
    const receiver = typeof data.receiver === 'string' ? data.receiver.trim() : '';
    const receivedDate = receiver ? getManilaDateYYYYMMDD(new Date()) : null;
    const receivedTime = receiver ? getManilaTimeHHMMSS(new Date()) : null;

    const columns = [
      'tracking_number',
      'edats_number',
      'status',
      'date_forwarded',
      'sender',
      'subject',
      'document_type',
      'actioned_required',
      'due_in',
      'receiver',
      'action_taken_receiver',
      'time_received',
      'date_received',
    ];
    const placeholders = columns.map(() => '?');
    const valuesBase = [
      null,
      null,
      status,
      dateForwarded,
      data.sender,
      data.subject,
      data.documentType || '',
      serializeActionRequired(data.actionRequired),
      dueIn,
      receiver,
      data.actionTakenReceiver || '',
      receivedTime,
      receivedDate,
    ];

    const query = `INSERT INTO logs (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

    const providedTrackingNumber = typeof data.trackingNumber === 'string' ? data.trackingNumber.trim() : '';
    const providedEdatsNumber = typeof data.edatsNumber === 'string' ? data.edatsNumber.trim() : '';

    if (providedTrackingNumber && providedEdatsNumber) {
      const values = [...valuesBase];
      values[0] = providedTrackingNumber;
      values[1] = providedEdatsNumber;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(query, values);
        await replaceRouteHistoryTx(conn, providedTrackingNumber, data.routeHistory);
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
      return NextResponse.json({ ...data, status, trackingNumber: providedTrackingNumber, edatsNumber: providedEdatsNumber, id: providedTrackingNumber });
    }

    const datePart = getPhilippinesDatePartYYYYMMDD(data.dateForwarded);

    for (let attempt = 0; attempt < 5; attempt++) {
      const seq = await getNextTrackingSequenceForDate(datePart);
      const seq4 = String(seq).padStart(4, '0');
      const trackingNumber = `PMD-${datePart}-${seq4}`;
      const edatsNumber = `EDTS-PMD${seq4}-${seq4}`;

      const values = [...valuesBase];
      values[0] = trackingNumber;
      values[1] = edatsNumber;

      try {
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          await conn.query(query, values);
          await replaceRouteHistoryTx(conn, trackingNumber, data.routeHistory);
          await conn.commit();
        } catch (error) {
          await conn.rollback();
          throw error;
        } finally {
          conn.release();
        }
        return NextResponse.json({ ...data, status, trackingNumber, edatsNumber, id: trackingNumber });
      } catch (error: unknown) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code?: unknown }).code === 'ER_DUP_ENTRY'
        ) {
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({ error: 'Failed to generate tracking number' }, { status: 500 });
  } catch (error) {
    console.error('Failed to create entry:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
