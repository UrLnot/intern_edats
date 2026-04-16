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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [rows] = await pool.query<LogRow[]>('SELECT * FROM logs WHERE tracking_number = ? LIMIT 1', [id]);
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    let routeHistory: Array<{ personnel: string; action: string; remarks: string }> = [];
    try {
      const [routeRows] = await pool.query<RouteHistoryRow[]>(
        `SELECT id, tracking_number, step_index, personnel, action, remarks
         FROM route_history
         WHERE tracking_number = ?
         ORDER BY step_index ASC, id ASC`,
        [id]
      );
      routeHistory = routeRows.map((r) => ({
        personnel: r.personnel,
        action: r.action ?? '',
        remarks: r.remarks ?? '',
      }));
    } catch {}

    return NextResponse.json({
      id: row.tracking_number,
      trackingNumber: row.tracking_number,
      edatsNumber: row.edats_number,
      status: computeStatus({ receiver: row.receiver, dateForwarded: row.date_forwarded, dueIn: row.due_in }),
      dateForwarded: row.date_forwarded,
      sender: row.sender,
      subject: row.subject,
      documentType: row.document_type ?? '',
      actionRequired: parseActionRequired(row.actioned_required),
      dueIn: row.due_in === 'technical' || row.due_in === 'highlyTechnical' ? row.due_in : 'simple',
      routeHistory,
      receiver: row.receiver,
      actionTakenReceiver: row.action_taken_receiver,
      timeReceived: row.time_received,
      dateReceived: row.date_received,
    });
  } catch (error) {
    console.error('Failed to fetch entry:', error);
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const receiver = typeof data.receiver === 'string' ? data.receiver.trim() : '';
      const dateForwarded = data.dateForwarded ? new Date(data.dateForwarded).toISOString().split('T')[0] : null;
      const dueIn = normalizeDueIn(data.dueIn);
      const status = computeStatus({ receiver, dateForwarded, dueIn });

      let timeReceivedToSet: string | null = null;
      let dateReceivedToSet: string | null = null;
      if (receiver) {
        const [existingRows] = await conn.query<Array<RowDataPacket & { time_received: string | null; date_received: string | Date | null }>>(
          'SELECT time_received, date_received FROM logs WHERE tracking_number = ? LIMIT 1 FOR UPDATE',
          [id]
        );
        const existing = existingRows[0];
        const existingDateObj =
          existing?.date_received instanceof Date
            ? existing.date_received
            : typeof existing?.date_received === 'string'
              ? new Date(existing.date_received)
              : null;
        const existingDate = existingDateObj ? existingDateObj.toISOString().split('T')[0] : null;
        const existingTime =
          typeof existing?.time_received === 'string' ? existing.time_received.split('.')[0] : null;

        if (existingDate && existingTime) {
          dateReceivedToSet = existingDate;
          timeReceivedToSet = existingTime;
        } else {
          const now = new Date();
          dateReceivedToSet = getManilaDateYYYYMMDD(now);
          timeReceivedToSet = getManilaTimeHHMMSS(now);
        }
      }

      const setParts: string[] = [
        'tracking_number = ?',
        'edats_number = ?',
        'status = ?',
        'date_forwarded = ?',
        'sender = ?',
        'subject = ?',
        'document_type = ?',
        'actioned_required = ?',
        'due_in = ?',
        'receiver = ?',
        'action_taken_receiver = ?',
        'time_received = ?',
        'date_received = ?',
      ];

      const values: unknown[] = [
        data.trackingNumber,
        data.edatsNumber,
        status,
        dateForwarded,
        data.sender,
        data.subject,
        data.documentType || '',
        Array.isArray(data.actionRequired)
          ? JSON.stringify(
              data.actionRequired
                .filter((v: unknown): v is string => typeof v === 'string')
                .map((v: string) => v.trim())
                .filter(Boolean)
            )
          : typeof data.actionRequired === 'string'
            ? data.actionRequired
            : '',
        dueIn,
        receiver,
        data.actionTakenReceiver || '',
        timeReceivedToSet,
        dateReceivedToSet,
      ];

      values.push(id);
      const query = `UPDATE logs SET ${setParts.join(', ')} WHERE tracking_number = ?`;

      await conn.query(query, values);

      if (typeof data.routeHistory !== 'undefined') {
        const oldTrackingNumber = id;
        const newTrackingNumber = typeof data.trackingNumber === 'string' ? data.trackingNumber : id;
        const steps = parseRouteHistory(data.routeHistory);

        await conn.query('DELETE FROM route_history WHERE tracking_number = ?', [oldTrackingNumber]);
        if (steps.length > 0) {
          const rows = steps.map((step, index) => [
            newTrackingNumber,
            index + 1,
            step.personnel,
            step.action || null,
            step.remarks || null,
          ]);
          await conn.query('INSERT INTO route_history (tracking_number, step_index, personnel, action, remarks) VALUES ?', [rows]);
        }
      }

      await conn.commit();
      return NextResponse.json({ ...data, status, id: data.trackingNumber });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Failed to update entry:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    try {
      await pool.query('DELETE FROM route_history WHERE tracking_number = ?', [id]);
    } catch {}
    await pool.query('DELETE FROM logs WHERE tracking_number = ?', [id]);
    return NextResponse.json({ message: 'Entry deleted' });
  } catch (error) {
    console.error('Failed to delete entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
