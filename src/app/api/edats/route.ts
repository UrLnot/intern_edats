import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [rows]: any = await pool.query('SELECT * FROM logs ORDER BY date_sent DESC');
    
    // Map snake_case from DB to camelCase for frontend
    const entries = rows.map((row: any) => ({
      id: row.tracking_number, // Using tracking_number as id since no id column exists
      trackingNumber: row.tracking_number,
      edatsNumber: row.edats_number,
      status: row.status,
      dateSent: row.date_sent,
      sender: row.sender,
      subject: row.subject,
      actionedBy: row.actioned_by,
      actionTaken: row.action_taken,
      receiver: row.receiver,
      actionTakenReceiver: row.action_taken_receiver,
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
    
    const query = `
      INSERT INTO logs (
        tracking_number, edats_number, status, date_sent, sender, subject, 
        actioned_by, action_taken, receiver, action_taken_receiver, date_received
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      data.trackingNumber,
      data.edatsNumber,
      data.status || 'Pending',
      data.dateSent ? new Date(data.dateSent).toISOString().split('T')[0] : null,
      data.sender,
      data.subject,
      data.actionedBy || '',
      data.actionTaken || '',
      data.receiver || '',
      data.actionTakenReceiver || '',
      data.dateReceived ? new Date(data.dateReceived).toISOString().split('T')[0] : null,
    ];

    await pool.query(query, values);
    
    return NextResponse.json({ ...data, id: data.trackingNumber });
  } catch (error) {
    console.error('Failed to create entry:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
