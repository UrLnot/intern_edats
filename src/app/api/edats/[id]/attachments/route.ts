import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';

let attachmentsTableReady: Promise<void> | null = null;

const ensureAttachmentsTable = async () => {
  if (!attachmentsTableReady) {
    attachmentsTableReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS attachments (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          tracking_number VARCHAR(191) NOT NULL,
          stored_name VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          mime_type VARCHAR(255) DEFAULT NULL,
          size BIGINT NOT NULL,
          url TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_attachments_tracking (tracking_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })();
  }
  await attachmentsTableReady;
};

const getDir = (trackingNumber: string) =>
  path.join(process.cwd(), 'public', 'uploads', 'edats', trackingNumber);

const safeFileName = (name: string) =>
  name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ensureAttachmentsTable();

    const [rows] = await pool.query<
      Array<
        RowDataPacket & {
          id: number;
          stored_name: string;
          original_name: string;
          mime_type: string | null;
          size: number;
          url: string;
          created_at: string;
        }
      >
    >(
      'SELECT id, stored_name, original_name, mime_type, size, url, created_at FROM attachments WHERE tracking_number = ? ORDER BY id ASC',
      [id]
    );

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        name: row.stored_name,
        originalName: row.original_name,
        type: row.mime_type ?? '',
        size: row.size,
        url: row.url,
        createdAt: row.created_at,
      }))
    );
  } catch (error) {
    console.error('Failed to list attachments:', error);
    return NextResponse.json({ error: 'Failed to list attachments' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ensureAttachmentsTable();
    const dir = getDir(id);
    await mkdir(dir, { recursive: true });

    const form = await request.formData();
    const incoming = form.getAll('files');
    const files = incoming.filter((v): v is File => v instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const saved = [];
    for (const file of files) {
      const random = crypto.randomBytes(6).toString('hex');
      const base = safeFileName(file.name || 'attachment');
      const finalName = `${Date.now()}-${random}-${base}`;
      const bytes = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(dir, finalName), bytes);

      const url = `/uploads/edats/${encodeURIComponent(id)}/${encodeURIComponent(finalName)}`;
      saved.push({
        name: finalName,
        originalName: file.name,
        size: file.size,
        type: file.type,
        url,
      });
    }

    const insertRows = saved.map((f) => [
      id,
      f.name,
      f.originalName,
      f.type || null,
      f.size,
      f.url,
    ]);
    await pool.query(
      'INSERT INTO attachments (tracking_number, stored_name, original_name, mime_type, size, url) VALUES ?',
      [insertRows]
    );

    return NextResponse.json(saved);
  } catch (error) {
    console.error('Failed to upload attachments:', error);
    return NextResponse.json({ error: 'Failed to upload attachments' }, { status: 500 });
  }
}
