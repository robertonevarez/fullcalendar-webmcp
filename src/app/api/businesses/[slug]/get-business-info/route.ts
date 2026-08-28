import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSeeded } from '@/db/init';
import { ok } from '@/domain/errors';
import { bookingService, handleServiceError } from '@/services/booking-service';

export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  await ensureDatabaseSeeded();
  const { slug } = await context.params;
  try {
    const result = await bookingService.getBusinessInfo(slug);
    return NextResponse.json(ok(result));
  } catch (error) {
    return NextResponse.json(handleServiceError(error), { status: 400 });
  }
}
