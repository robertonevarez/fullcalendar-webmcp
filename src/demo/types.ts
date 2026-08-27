import type { Appointment, AvailabilitySlot } from '@/domain/types';

export type DemoArchetype = 'field_service' | 'salon' | 'auto';

/** Simplified business setup — preset-driven, not free-form editable in the UI. */
export interface DemoServiceInput {
  id: string;
  name: string;
  duration_minutes: number;
  /** Dollars, e.g. 89 for $89 */
  price_dollars: number;
}

export interface DemoAvailabilityInput {
  /** 0=Sun … 6=Sat — demo default is Mon–Fri */
  days: number[];
  open: string; // HH:mm
  close: string; // HH:mm
}

export interface DemoConfig {
  archetype: DemoArchetype;
  businessName: string;
  services: DemoServiceInput[];
  staff: string[];
  /** Non-human resources (service bays, rooms) for compound booking presets */
  facilities?: string[];
  availability: DemoAvailabilityInput;
  postalCodes: string[];
  notificationEmail: string;
  timezone: string;
}

export interface DemoPendingOffer {
  service_id: string;
  service_name: string;
  price_cents: number;
  currency: string;
  postal_code?: string;
  time_preference?: string;
  start_date: string;
  end_date: string;
  slots: AvailabilitySlot[];
}

export interface DemoPublicAppointment {
  appointment_id: string;
  service_name: string;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  currency: string;
  provider_name?: string;
  postal_code?: string;
}

export type DemoConversationPhase = 'idle' | 'awaiting_confirmation' | 'booked';

export interface DemoConversationState {
  phase: DemoConversationPhase;
  appointments: Appointment[];
  pendingOffer: DemoPendingOffer | null;
  lastBooking: DemoPublicAppointment | null;
}

export interface DemoTurnRequest {
  config: DemoConfig;
  conversation: DemoConversationState;
  message: string;
}

export interface DemoTurnResponse {
  ok: true;
  reply: string;
  conversation: DemoConversationState;
  /** Business-side consequence after a booking (not a dashboard). */
  businessNotice: {
    headline: string;
    service_name: string;
    when_label: string;
    notification_email: string;
  } | null;
}

export interface DemoTurnErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}
