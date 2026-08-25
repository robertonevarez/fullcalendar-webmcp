import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSeeded } from '@/db/init';
import { bookingService, handleServiceError } from '@/services/booking-service';

export async function POST(request: NextRequest) {
  ensureDatabaseSeeded();
  const body = await request.json();
  try {
    const result = bookingService.getAppointment(body.appointment_id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(handleServiceError(error), { status: 400 });
  }
}
