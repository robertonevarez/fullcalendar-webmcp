import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSeeded } from '@/db/init';
import { bookingService, handleServiceError } from '@/services/booking-service';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  await ensureDatabaseSeeded();
  const { slug } = await context.params;
  try {
    const body = await request.json();
    const result = await bookingService.checkAvailability(slug, {
      service_id: body.service_id,
      start_date: body.start_date ?? body.date_from,
      end_date: body.end_date ?? body.date_to,
      postal_code: body.postal_code,
      time_preference: body.time_preference,
      preferred_resource_id: body.preferred_resource_id,
      limit: body.limit,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(handleServiceError(error), { status: 400 });
  }
}
