import {
  AvailabilityQuery,
  AvailabilitySlot,
  BusinessInfo,
  AppointmentNotes,
  ServiceEligibilityQuery,
  ServiceEligibilityResult,
  AppointmentRequestInput,
} from '@/domain/types';

export type PublicAppointment = {
  appointment_id: string;
  business: string;
  service: string;
  status: 'requested' | 'confirmed' | 'cancelled' | 'declined' | 'completed';
  starts_at: string;
  ends_at: string;
  location: unknown;
  provider: string | null;
  price: {
    amount: number; // in whole currency units (e.g. 180 for $180.00 USD)
    currency: string;
  };
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
    amount: number; // in whole currency units (e.g. 180 for $180.00 USD)
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
 * surface for a real-world service business. Methods return protocol-neutral
 * plain domain objects and throw typed AppErrors on failure.
 *
 * Adapters (WebMCP, MCP, REST APIs, platform integrations) translate these
 * calls to/from protocol-specific conventions without leaking transport envelopes
 * into the domain layer.
 */
export interface BusinessCapabilities {
  getBusinessInfo(businessSlug: string): Promise<BusinessInfo>;

  getServices(businessSlug: string, query?: string): Promise<{ services: PublicService[] }>;

  checkServiceEligibility(
    businessSlug: string,
    input: ServiceEligibilityQuery,
  ): Promise<ServiceEligibilityResult>;

  checkAvailability(
    businessSlug: string,
    query: AvailabilityQuery,
  ): Promise<{ service_id: string; timezone: string; slots: AvailabilitySlot[] }>;

  requestAppointment(
    input: { businessSlug: string } & AppointmentRequestInput,
  ): Promise<PublicAppointment>;

  getAppointment(businessSlug: string, appointmentId: string): Promise<PublicAppointment>;

  rescheduleAppointment(input: {
    businessSlug: string;
    appointment_id: string;
    new_slot_id: string;
    idempotency_key: string;
  }): Promise<PublicAppointment>;

  cancelAppointment(input: {
    businessSlug: string;
    appointment_id: string;
    idempotency_key: string;
    reason?: string;
  }): Promise<{ appointment_id: string; status: string; message: string; appointment: PublicAppointment }>;
}
