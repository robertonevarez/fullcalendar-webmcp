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
  try {
    const body = await request.json();
    const result = await bookingService.requestAppointment({
      businessSlug: slug,
      service_id: body.service_id,
      slot_id: body.slot_id,
      start: body.start,
      idempotency_key: body.idempotency_key,
      postal_code: body.postal_code,
      customer: body.customer ?? { name: body.customer_name ?? 'Guest Customer' },
      service_address: body.service_address,
      notes: body.notes,
    });
    return NextResponse.json(ok(result));
  } catch (error) {
    return NextResponse.json(handleServiceError(error), { status: 400 });
  }
}
