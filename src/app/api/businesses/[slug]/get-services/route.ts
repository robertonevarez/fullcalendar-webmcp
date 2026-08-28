import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSeeded } from '@/db/init';
import { ok } from '@/domain/errors';
import { bookingService, handleServiceError } from '@/services/booking-service';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  await ensureDatabaseSeeded();
  const { slug } = await context.params;
  let query: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    query = body?.query;
  } catch {
    // empty body is valid
  }
  try {
    const result = await bookingService.getServices(slug, query);
    return NextResponse.json(ok(result));
  } catch (error) {
    return NextResponse.json(handleServiceError(error), { status: 400 });
  }
}
