import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

type EmployeeRow = RowDataPacket & {
  id: number;
  name: string;
  position: string;
  section: string;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const section = (url.searchParams.get('section') || '').trim();
    const wantSections = url.searchParams.get('sections') === '1';

    if (wantSections) {
      const [rows] = await pool.query<Array<RowDataPacket & { section: string }>>(
        'SELECT DISTINCT section FROM edats_employees ORDER BY section ASC'
      );
      return NextResponse.json(rows.map((r) => r.section).filter(Boolean));
    }

    const [rows] = await pool.query<EmployeeRow[]>(
      section
        ? 'SELECT id, name, position, section FROM edats_employees WHERE section = ? ORDER BY name ASC'
        : 'SELECT id, name, position, section FROM edats_employees ORDER BY section ASC, name ASC',
      section ? [section] : []
    );

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        position: r.position,
        section: r.section,
      }))
    );
  } catch (error) {
    console.error('Failed to fetch employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

