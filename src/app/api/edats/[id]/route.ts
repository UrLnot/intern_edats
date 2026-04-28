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

const parseActionRequired = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(v => String(v).trim()).filter(Boolean);
  } catch {}
  return value.split(/[\n,]+/g).map(s => s.trim()).filter(Boolean);
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch log
    const [logRows] = await pool.query<LogRow[]>(
      'SELECT * FROM edats_logs WHERE tracking_number = ? LIMIT 1',
      [id]
    );
    const log = logRows[0];
    if (!log) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    // Fetch steps
    const [stepRows] = await pool.query<StepRow[]>(
      'SELECT * FROM edats_steps WHERE tracking_number = ? ORDER BY step_number ASC',
      [id]
    );

    const entry = {
      id: log.tracking_number,
      trackingNumber: log.tracking_number,
      subject: log.subject,
      documentType: log.document_type,
      status: log.status,
      createdAt: log.created_at,
      steps: stepRows.map(step => ({
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
    };

    return NextResponse.json(entry);
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

      // 1. Update Log details if provided
      if (data.subject || data.documentType || data.finalizeLog) {
        const updates: string[] = [];
        const values: any[] = [];
        if (data.subject) { updates.push('subject = ?'); values.push(data.subject); }
        if (data.documentType) { updates.push('document_type = ?'); values.push(data.documentType); }
        if (data.finalizeLog) { updates.push('status = ?'); values.push('Completed'); }
        values.push(id);
        await conn.query(`UPDATE edats_logs SET ${updates.join(', ')} WHERE tracking_number = ?`, values);
      }

      // 2. Complete latest step if requested
      if (data.completeStep) {
        const now = new Date();
        const updates: string[] = [
          'status = ?',
          'date_received = ?',
          'time_received = ?',
          'action_taken = ?'
        ];
        const values: any[] = [
          'Completed',
          getManilaDateYYYYMMDD(now),
          getManilaTimeHHMMSS(now),
          data.actionTaken || ''
        ];
        if (data.receiver?.trim()) {
          updates.push('receiver = ?');
          values.push(data.receiver.trim());
        }
        values.push(id);
        await conn.query(
          `UPDATE edats_steps SET ${updates.join(', ')} WHERE tracking_number = ? AND status = 'Pending' ORDER BY step_number DESC LIMIT 1`,
          values
        );
      }

      // 3. Add new step if requested (Forwarding)
      if (data.forwardTo) {
        const [lastStepRows] = await conn.query<Array<RowDataPacket & { step_number: number; receiver: string; edats_number: string }>>(
          'SELECT step_number, receiver, edats_number FROM edats_steps WHERE tracking_number = ? ORDER BY step_number DESC LIMIT 1',
          [id]
        );
        const lastStep = lastStepRows[0];
        
        // Use provided edatsNumber or generate a new one
        let edatsNumber = data.edatsNumber?.trim();
        if (!edatsNumber) {
          const now = new Date();
          const year = now.getFullYear().toString();
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const like = `EDTS-${year}-${month}-%`;
          const [seqRows] = await conn.query<Array<RowDataPacket & { edats_number: string }>>(
            'SELECT edats_number FROM edats_steps WHERE edats_number LIKE ? ORDER BY edats_number DESC LIMIT 1',
            [like]
          );
          const lastSeq = seqRows[0]?.edats_number ? /(\d+)$/.exec(seqRows[0].edats_number)?.[1] : undefined;
          const nextSeq = (lastSeq ? parseInt(lastSeq, 10) : 0) + 1;
          edatsNumber = `EDTS-${year}-${month}-${String(nextSeq).padStart(4, '0')}`;
        }

        await conn.query(
          `INSERT INTO edats_steps 
          (edats_number, tracking_number, step_number, sender, action_taken, action_required, receiver, due_in, date_forwarded, status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            edatsNumber,
            id,
            (lastStep?.step_number || 0) + 1,
            lastStep?.receiver || data.sender || 'Unknown',
            '', // New step starts with no action taken yet
            JSON.stringify(parseActionRequired(data.actionRequired)),
            data.forwardTo,
            data.dueIn || 'simple',
            getManilaDateYYYYMMDD(new Date()),
            'Pending'
          ]
        );
      }

      await conn.commit();
      return NextResponse.json({ message: 'Entry updated successfully' });
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
    await pool.query('DELETE FROM edats_logs WHERE tracking_number = ?', [id]);
    return NextResponse.json({ message: 'Entry deleted' });
  } catch (error) {
    console.error('Failed to delete entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
