import {
  AvailabilityQuery,
  AvailabilitySlot,
  BusinessInfo,
  AppointmentNotes,
  ServiceEligibilityQuery,
  ServiceEligibilityResult,
  AppointmentRequestInput,
} from '@/domain/types';
import { ok, toErrorResponse } from '@/domain/errors';

export type PublicAppointment = {
  appointment_id: string;
  business: string;
  service: string;
  status: string;
  starts_at: string;
  ends_at: string;
  location: unknown;
  provider: string | null;
  price: { amount: number; currency: string };
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
  };
  notes: AppointmentNotes | null;
  cancellable: boolean;
  next_steps?: string[];
};

export type PublicService = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: {
    type: 'fixed' | 'starting_at' | 'quote';
    amount: number;
    currency: string;
  };
  location_policy: string;
  service_area_required: boolean;
  required_resources: Array<{ resource_type: string; quantity: number; capability?: string | null }>;
  intake_fields: string[];
  keywords: string[];
};

/**
 * Protocol Tooling Core Business Capabilities.
 *
 * This capability interface defines the structured, agent-native business
 * surface for a real-world service business. Adapters (WebMCP, MCP, REST APIs,
 * platform integrations) implement or consume this layer without coupling
 * business/scheduling logic to protocol-specific runtime globals.
 */
export interface BusinessCapabilities {
  getBusinessInfo(businessSlug: string): Promise<ReturnType<typeof ok<BusinessInfo>> | ReturnType<typeof toErrorResponse>>;

  getServices(
    businessSlug: string,
    query?: string,
  ): Promise<ReturnType<typeof ok<{ services: PublicService[] }>> | ReturnType<typeof toErrorResponse>>;

  checkServiceEligibility(
    businessSlug: string,
    input: ServiceEligibilityQuery,
  ): Promise<ReturnType<typeof ok<ServiceEligibilityResult>> | ReturnType<typeof toErrorResponse>>;

  checkAvailability(
    businessSlug: string,
    query: AvailabilityQuery,
  ): Promise<ReturnType<typeof ok<{ service_id: string; timezone: string; slots: AvailabilitySlot[] }>> | ReturnType<typeof toErrorResponse>>;

  requestAppointment(
    input: { businessSlug: string } & AppointmentRequestInput,
  ): Promise<ReturnType<typeof ok<PublicAppointment>> | ReturnType<typeof toErrorResponse>>;

  getAppointment(
    businessSlug: string,
    appointmentId: string,
  ): Promise<ReturnType<typeof ok<PublicAppointment>> | ReturnType<typeof toErrorResponse>>;

  rescheduleAppointment(input: {
    businessSlug: string;
    appointment_id: string;
    new_slot_id: string;
    idempotency_key: string;
  }): Promise<ReturnType<typeof ok<PublicAppointment>> | ReturnType<typeof toErrorResponse>>;

  cancelAppointment(input: {
    businessSlug: string;
    appointment_id: string;
    idempotency_key: string;
    reason?: string;
  }): Promise<ReturnType<typeof ok<{ appointment_id: string; status: string; message: string; appointment: PublicAppointment }>> | ReturnType<typeof toErrorResponse>>;
}
