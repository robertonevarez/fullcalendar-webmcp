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
    const result = await bookingService.checkServiceEligibility(slug, {
      service_id: body.service_id,
      postal_code: body.postal_code,
      property_type: body.property_type,
      bedrooms: body.bedrooms,
      bathrooms: body.bathrooms,
      square_footage: body.square_footage,
    });
    return NextResponse.json(ok(result));
  } catch (error) {
    return NextResponse.json(handleServiceError(error), { status: 400 });
  }
}
