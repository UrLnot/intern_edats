import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    const query = `
      UPDATE logs SET 
        tracking_number = ?, edats_number = ?, status = ?, time_sent = ?, date_sent = ?, sender = ?, 
        subject = ?, actioned_by = ?, action_taken = ?, receiver = ?, 
        action_taken_receiver = ?, time_received = ?, date_received = ?
      WHERE tracking_number = ?
    `;
    
    const values = [
      data.trackingNumber,
      data.edatsNumber,
      data.status || 'Pending',
      data.timeSent || null,
      data.dateSent ? new Date(data.dateSent).toISOString().split('T')[0] : null,
      data.sender,
      data.subject,
      data.actionedBy || '',
      data.actionTaken || '',
      data.receiver || '',
      data.actionTakenReceiver || '',
      data.timeReceived || null,
      data.dateReceived ? new Date(data.dateReceived).toISOString().split('T')[0] : null,
      id // Use original tracking number as the identifier
    ];

    await pool.query(query, values);
    
    return NextResponse.json({ ...data, id: data.trackingNumber });
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
    await pool.query('DELETE FROM logs WHERE tracking_number = ?', [id]);
    return NextResponse.json({ message: 'Entry deleted' });
  } catch (error) {
    console.error('Failed to delete entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
