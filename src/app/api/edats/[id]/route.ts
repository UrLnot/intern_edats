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
  section: string | null;
  route_history?: string | null;
  receiver: string;
  action_taken_receiver: string;
  time_received: string | null;
  date_received: string | Date | null;
  status: string;
};

type RouteEntryRow = RowDataPacket & {
  tracking_number: string;
  step_index: number;
  sender: string | null;
  receiver: string | null;
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

const computeStatus = (input: { completed?: unknown; dateForwarded?: unknown; dueIn?: unknown }): 'Completed' | 'Pending' | 'Passed Due' => {
  if (input.completed === true) return 'Completed';

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

const parseRouteHistory = (
  value: unknown
): Array<{ sender: string; receiver: string; action: string; remarks: string }> => {
  if (Array.isArray(value)) {
    return value
      .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
      .map((v) => ({
        sender:
          typeof v.sender === 'string'
            ? v.sender
            : typeof v.from === 'string'
              ? v.from
              : '',
        receiver:
          typeof v.receiver === 'string'
            ? v.receiver
            : typeof v.to === 'string'
              ? v.to
              : typeof v.personnel === 'string'
                ? v.personnel
                : '',
        action: typeof v.action === 'string' ? v.action : '',
        remarks:
          typeof v.remarks === 'string'
            ? v.remarks
            : typeof v.date === 'string' || typeof v.time === 'string'
              ? `${typeof v.date === 'string' ? v.date : ''} ${typeof v.time === 'string' ? v.time : ''}`.trim()
              : '',
      }))
      .filter((v) => v.sender || v.receiver || v.action || v.remarks)
      .map((v) => ({
        sender: typeof v.sender === 'string' ? v.sender.trim() : '',
        receiver: typeof v.receiver === 'string' ? v.receiver.trim() : '',
        action: typeof v.action === 'string' ? v.action.trim() : '',
        remarks: typeof v.remarks === 'string' ? v.remarks.trim() : '',
      }))
      .filter((v) => v.sender || v.receiver || v.action || v.remarks);
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

const ensureLogEntriesTable = async (conn: { query: (sql: string, values?: unknown[]) => Promise<unknown> }) => {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS edats_log_entries (
      tracking_number VARCHAR(64) NOT NULL,
      step_index INT NOT NULL,
      sender VARCHAR(255) NOT NULL DEFAULT '',
      receiver VARCHAR(255) NOT NULL DEFAULT '',
      action VARCHAR(255) NOT NULL DEFAULT '',
      remarks TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tracking_number, step_index),
      INDEX idx_edats_log_entries_tracking_number (tracking_number)
    )
  `);
};

const parseRouteEntriesRows = (rows: Array<RouteEntryRow>): Array<{ sender: string; receiver: string; action: string; remarks: string }> =>
  rows
    .map((row) => ({
      sender: typeof row.sender === 'string' ? row.sender.trim() : '',
      receiver: typeof row.receiver === 'string' ? row.receiver.trim() : '',
      action: typeof row.action === 'string' ? row.action.trim() : '',
      remarks: typeof row.remarks === 'string' ? row.remarks.trim() : '',
    }))
    .filter((s) => s.sender || s.receiver || s.action || s.remarks);

const writeRouteEntriesTx = async (
  conn: { query: (sql: string, values?: unknown[]) => Promise<unknown> },
  trackingNumber: string,
  value: unknown
) => {
  const steps = parseRouteHistory(value);
  await ensureLogEntriesTable(conn);
  await conn.query('DELETE FROM edats_log_entries WHERE tracking_number = ?', [trackingNumber]);
  if (steps.length === 0) return;
  const placeholders = steps.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
  const values: unknown[] = [];
  steps.forEach((step, idx) => {
    values.push(trackingNumber, idx + 1, step.sender, step.receiver, step.action, step.remarks);
  });
  await conn.query(
    `INSERT INTO edats_log_entries (tracking_number, step_index, sender, receiver, action, remarks) VALUES ${placeholders}`,
    values
  );
};

const syncLegacyRouteHistoryTx = async (
  conn: { query: (sql: string, values?: unknown[]) => Promise<unknown> },
  trackingNumber: string,
  value: unknown
) => {
  const steps = parseRouteHistory(value);
  const json = steps.length ? JSON.stringify(steps) : '';
  try {
    await conn.query(
      'INSERT INTO edats_route_history (tracking_number, history) VALUES (?, ?) ON DUPLICATE KEY UPDATE history = VALUES(history)',
      [trackingNumber, json]
    );
  } catch {}
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [rows] = await pool.query<LogRow[]>('SELECT * FROM edats_logs WHERE tracking_number = ? LIMIT 1', [id]);
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    let routeHistory: Array<{ sender: string; receiver: string; action: string; remarks: string }> = [];
    try {
      await ensureLogEntriesTable(pool);
      const [entryRows] = await pool.query<RouteEntryRow[]>(
        `SELECT tracking_number, step_index, sender, receiver, action, remarks
         FROM edats_log_entries
         WHERE tracking_number = ?
         ORDER BY step_index ASC`,
        [id]
      );
      routeHistory = parseRouteEntriesRows(entryRows);
    } catch {}

    try {
      if (routeHistory.length === 0) {
        const [routeRows] = await pool.query<Array<RowDataPacket & { history: string }>>(
          'SELECT history FROM edats_route_history WHERE tracking_number = ? LIMIT 1',
          [id]
        );
        if (routeRows[0]) {
          routeHistory = parseRouteHistory(routeRows[0].history);
        }
      }
    } catch {}

    const completed = Boolean(
      row.date_received &&
        (row.date_received instanceof Date
          ? !Number.isNaN(row.date_received.getTime())
          : typeof row.date_received === 'string'
            ? row.date_received.trim() && row.date_received !== '0000-00-00'
            : false)
    );

    return NextResponse.json({
      id: row.tracking_number,
      trackingNumber: row.tracking_number,
      edatsNumber: row.edats_number,
      status: computeStatus({ completed, dateForwarded: row.date_forwarded, dueIn: row.due_in }),
      dateForwarded: row.date_forwarded,
      sender: row.sender,
      subject: row.subject,
      documentType: row.document_type ?? '',
      actionRequired: parseActionRequired(row.actioned_required),
      dueIn: row.due_in === 'technical' || row.due_in === 'highlyTechnical' ? row.due_in : 'simple',
      routeHistory: routeHistory.length ? routeHistory : parseRouteHistory(row.route_history),
      section: row.section ?? '',
      receiver: row.receiver,
      actionTakenReceiver: row.action_taken_receiver,
      timeReceived: row.time_received,
      dateReceived: row.date_received,
      completed,
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
      const completedFlag = typeof data.completed === 'boolean' ? data.completed : undefined;

      const [existingRows] = await conn.query<Array<RowDataPacket & { time_received: string | null; date_received: string | Date | null }>>(
        'SELECT time_received, date_received FROM edats_logs WHERE tracking_number = ? LIMIT 1 FOR UPDATE',
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
      const existingTime = typeof existing?.time_received === 'string' ? existing.time_received.split('.')[0] : null;

      let dateReceivedToSet: string | null = existingDate;
      let timeReceivedToSet: string | null = existingTime;
      if (completedFlag === false) {
        dateReceivedToSet = null;
        timeReceivedToSet = null;
      }
      if (completedFlag === true && (!existingDate || !existingTime)) {
        const now = new Date();
        dateReceivedToSet = getManilaDateYYYYMMDD(now);
        timeReceivedToSet = getManilaTimeHHMMSS(now);
      }

      const completedAfter = Boolean(dateReceivedToSet && dateReceivedToSet !== '0000-00-00');
      const status = computeStatus({ completed: completedAfter, dateForwarded, dueIn });

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
        'section = ?',
        'receiver = ?',
        'action_taken_receiver = ?',
        'time_received = ?',
        'date_received = ?',
        'route_history = ?',
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
        data.section || '',
        receiver,
        data.actionTakenReceiver || '',
        timeReceivedToSet,
        dateReceivedToSet,
        typeof data.routeHistory !== 'undefined'
          ? JSON.stringify(parseRouteHistory(data.routeHistory))
          : null,
      ];

      values.push(id);
      const query = `UPDATE edats_logs SET ${setParts.join(', ')} WHERE tracking_number = ?`;

      await conn.query(query, values);

      if (typeof data.routeHistory !== 'undefined') {
        const oldTrackingNumber = id;
        const newTrackingNumber = typeof data.trackingNumber === 'string' ? data.trackingNumber : id;
        
        if (oldTrackingNumber !== newTrackingNumber) {
          await conn.query('DELETE FROM edats_log_entries WHERE tracking_number = ?', [oldTrackingNumber]);
          await conn.query('DELETE FROM edats_route_history WHERE tracking_number = ?', [oldTrackingNumber]);
        }
        await writeRouteEntriesTx(conn, newTrackingNumber, data.routeHistory);
        await syncLegacyRouteHistoryTx(conn, newTrackingNumber, data.routeHistory);
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
      await pool.query('DELETE FROM edats_log_entries WHERE tracking_number = ?', [id]);
    } catch {}
    try {
      await pool.query('DELETE FROM edats_route_history WHERE tracking_number = ?', [id]);
    } catch {}
    try {
      await pool.query('DELETE FROM edats_attachments WHERE tracking_number = ?', [id]);
    } catch {}
    await pool.query('DELETE FROM edats_logs WHERE tracking_number = ?', [id]);
    return NextResponse.json({ message: 'Entry deleted' });
  } catch (error) {
    console.error('Failed to delete entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
