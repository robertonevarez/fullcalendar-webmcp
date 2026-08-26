import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db/client';
import { seedDatabase } from '@/db/seed';

export const runtime = 'nodejs';

/**
 * Force-reseeds the demo SQLite database.
 * Disabled unless DEMO_RESET_TOKEN is configured.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.DEMO_RESET_TOKEN;
  if (!expected) {
    return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Not found.' } }, { status: 404 });
  }

  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (!token || token !== expected) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid demo reset token.' } },
      { status: 401 },
    );
  }

  getDb();
  const result = seedDatabase(true);
  return NextResponse.json({ ok: true, data: { reseeds: true, ...result } });
}
