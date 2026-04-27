import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

type LogRow = RowDataPacket & {
  tracking_number: string;
  sender: string;
  route_history?: string | null;
  date_forwarded?: string | Date | null;
  due_in?: string | null;
  time_received?: string | null;
  date_received?: string | Date | null;
};

type RouteEntryRow = RowDataPacket & {
  sender: string | null;
  receiver: string | null;
  action: string | null;
  remarks: string | null;
};

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

const normalizeDueIn = (value: unknown): 'simple' | 'technical' | 'highlyTechnical' =>
  value === 'technical' || value === 'highlyTechnical' ? value : 'simple';

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
        remarks: typeof v.remarks === 'string' ? v.remarks : '',
      }))
      .map((v) => ({
        sender: v.sender.trim(),
        receiver: v.receiver.trim(),
        action: v.action.trim(),
        remarks: v.remarks.trim(),
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

const writeAllEntriesTx = async (
  conn: { query: (sql: string, values?: unknown[]) => Promise<unknown> },
  trackingNumber: string,
  steps: Array<{ sender: string; receiver: string; action: string; remarks: string }>
) => {
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const receiver = typeof body.receiver === 'string' ? body.receiver.trim() : '';
    const action = typeof body.action === 'string' ? body.action.trim() : '';
    const remarks = typeof body.remarks === 'string' ? body.remarks.trim() : '';
    const completedFlag = typeof body.completed === 'boolean' ? body.completed : false;
    if (!receiver) {
      return NextResponse.json({ error: 'Receiver is required.' }, { status: 400 });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query<LogRow[]>(
        'SELECT tracking_number, sender, route_history, date_forwarded, due_in, time_received, date_received FROM edats_logs WHERE tracking_number = ? LIMIT 1 FOR UPDATE',
        [id]
      );
      const log = rows[0];
      if (!log) {
        await conn.rollback();
        return NextResponse.json({ error: 'Log not found.' }, { status: 404 });
      }

      let steps: Array<{ sender: string; receiver: string; action: string; remarks: string }> = [];
      try {
        await ensureLogEntriesTable(conn);
        const [entryRows] = await conn.query<RouteEntryRow[]>(
          `SELECT sender, receiver, action, remarks
           FROM edats_log_entries
           WHERE tracking_number = ?
           ORDER BY step_index ASC`,
          [id]
        );
        steps = entryRows
          .map((row) => ({
            sender: typeof row.sender === 'string' ? row.sender.trim() : '',
            receiver: typeof row.receiver === 'string' ? row.receiver.trim() : '',
            action: typeof row.action === 'string' ? row.action.trim() : '',
            remarks: typeof row.remarks === 'string' ? row.remarks.trim() : '',
          }))
          .filter((v) => v.sender || v.receiver || v.action || v.remarks);
      } catch {}

      if (steps.length === 0) {
        try {
          const [legacyRows] = await conn.query<Array<RowDataPacket & { history: string }>>(
            'SELECT history FROM edats_route_history WHERE tracking_number = ? LIMIT 1',
            [id]
          );
          if (legacyRows[0]) steps = parseRouteHistory(legacyRows[0].history);
        } catch {}
      }
      if (steps.length === 0) {
        steps = parseRouteHistory(log.route_history);
      }

      const fallbackSender = steps[steps.length - 1]?.receiver || log.sender || '';
      const sender = typeof body.sender === 'string' && body.sender.trim() ? body.sender.trim() : fallbackSender.trim();
      if (!sender) {
        await conn.rollback();
        return NextResponse.json({ error: 'Unable to derive sender for next entry.' }, { status: 400 });
      }

      const next = { sender, receiver, action, remarks };
      const nextSteps = [...steps, next];
      const serialized = JSON.stringify(nextSteps);
      const now = new Date();
      const existingDate =
        log.date_received instanceof Date
          ? !Number.isNaN(log.date_received.getTime())
            ? log.date_received.toISOString().slice(0, 10)
            : null
          : typeof log.date_received === 'string'
            ? log.date_received.trim()
              ? log.date_received.slice(0, 10)
              : null
            : null;
      const existingTime = typeof log.time_received === 'string' ? log.time_received.split('.')[0] : null;
      const shouldSetReceived = completedFlag && (!existingDate || !existingTime);
      const dateReceived = shouldSetReceived ? getManilaDateYYYYMMDD(now) : existingDate;
      const timeReceived = shouldSetReceived ? getManilaTimeHHMMSS(now) : existingTime;
      const completedAfter = Boolean(dateReceived && dateReceived !== '0000-00-00');
      const status = computeStatus({ completed: completedAfter, dateForwarded: log.date_forwarded, dueIn: log.due_in });

      await writeAllEntriesTx(conn, id, nextSteps);
      try {
        await conn.query(
          'INSERT INTO edats_route_history (tracking_number, history) VALUES (?, ?) ON DUPLICATE KEY UPDATE history = VALUES(history)',
          [id, serialized]
        );
      } catch {}

      if (completedFlag) {
        await conn.query(
          `UPDATE edats_logs
           SET receiver = ?, action_taken_receiver = ?, date_received = ?, time_received = ?, route_history = ?, status = ?
           WHERE tracking_number = ?`,
          [receiver, action || remarks, dateReceived, timeReceived, serialized, status, id]
        );
      } else {
        await conn.query(
          `UPDATE edats_logs
           SET receiver = ?, action_taken_receiver = ?, route_history = ?, status = ?
           WHERE tracking_number = ?`,
          [receiver, action || remarks, serialized, status, id]
        );
      }

      await conn.commit();
      return NextResponse.json({ trackingNumber: id, step: next, routeHistory: nextSteps });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Failed to append log entry:', error);
    return NextResponse.json({ error: 'Failed to append log entry' }, { status: 500 });
  }
}
