import { AppError, ErrorCodes } from '@/domain/errors';
import type {
  Business,
  Resource,
  Service,
  WorkingHours,
} from '@/domain/types';
import {
  DEFAULT_DEMO_CONFIG,
  DEMO_BUSINESS_ID,
  DEMO_BUSINESS_SLUG,
  DEMO_STAFF_CAPABILITY,
  DEMO_STAFF_RESOURCE_TYPE,
} from '@/demo/defaults';
import type { DemoConfig, DemoServiceInput } from '@/demo/types';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const POSTAL_RE = /^\d{5}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface NormalizedDemoBusiness {
  business: Business;
  services: Service[];
  resources: Resource[];
  postalCodesByZone: Map<string, string[]>;
  notificationEmail: string;
}

function slugifyServiceId(name: string, index: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
  return `demo_svc_${base || 'service'}_${index + 1}`;
}

function keywordsForService(name: string): string[] {
  const tokens = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
  const extras: string[] = [];
  if (tokens.some((t) => t === 'ac' || t === 'air' || t === 'hvac' || t === 'cooling')) {
    extras.push('ac', 'air', 'conditioning', 'cooling', 'hvac', 'upstairs', 'diagnostic');
  }
  if (tokens.some((t) => t.includes('maint'))) {
    extras.push('maintenance', 'tune', 'tuneup', 'preventive', 'checkup');
  }
  if (tokens.some((t) => t.includes('diagnost'))) {
    extras.push('diagnostic', 'inspect', 'look', 'check', 'broken', 'issue');
  }
  return Array.from(new Set([...tokens, ...extras]));
}

function normalizeService(input: DemoServiceInput, index: number): Service {
  const id = input.id?.trim() || slugifyServiceId(input.name, index);
  const duration = Math.round(Number(input.duration_minutes));
  const dollars = Number(input.price_dollars);
  if (!input.name.trim()) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Each service needs a name.', false, 'services');
  }
  if (!Number.isFinite(duration) || duration < 15 || duration > 8 * 60) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      'Service duration must be between 15 and 480 minutes.',
      false,
      'services',
    );
  }
  if (!Number.isFinite(dollars) || dollars < 0) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Service price must be zero or greater.', false, 'services');
  }

  return {
    id,
    business_id: DEMO_BUSINESS_ID,
    name: input.name.trim(),
    description: `${input.name.trim()} offered by this business.`,
    duration_minutes: duration,
    price_cents: Math.round(dollars * 100),
    currency: 'USD',
    keywords: keywordsForService(input.name),
    location_policy: 'CUSTOMER',
    service_area_required: true,
    resource_requirements: [
      {
        resource_type: DEMO_STAFF_RESOURCE_TYPE,
        quantity: 1,
        capability: DEMO_STAFF_CAPABILITY,
      },
    ],
    intake_fields: [],
  };
}

/**
 * Convert simplified demo form state into Protocol Tooling domain objects.
 * Does not touch Postgres or seeded businesses.
 */
export function normalizeDemoConfig(config: DemoConfig): NormalizedDemoBusiness {
  const businessName = config.businessName?.trim();
  if (!businessName) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Business name is required.', false, 'businessName');
  }
  if (!config.services?.length) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Add at least one service.', false, 'services');
  }
  if (!config.staff?.length || config.staff.every((s) => !s.trim())) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Add at least one staff member.', false, 'staff');
  }
  if (!config.availability?.days?.length) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Choose at least one available day.', false, 'availability');
  }
  if (!TIME_RE.test(config.availability.open) || !TIME_RE.test(config.availability.close)) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Open and close times must use HH:mm.', false, 'availability');
  }
  if (config.availability.open >= config.availability.close) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Close time must be after open time.', false, 'availability');
  }

  const postalCodes = (config.postalCodes ?? [])
    .map((c) => c.trim())
    .filter(Boolean);
  for (const code of postalCodes) {
    if (!POSTAL_RE.test(code)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Postal code "${code}" must be a 5-digit US ZIP.`,
        false,
        'postalCodes',
      );
    }
  }

  const notificationEmail = config.notificationEmail?.trim() ?? '';
  if (!notificationEmail || !EMAIL_RE.test(notificationEmail)) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      'Enter a valid notification email.',
      false,
      'notificationEmail',
    );
  }

  const timezone = config.timezone?.trim() || 'America/Chicago';
  const workingHours: WorkingHours[] = config.availability.days.map((day) => ({
    day,
    open: config.availability.open,
    close: config.availability.close,
  }));

  const serviceAreaRequired = postalCodes.length > 0;

  const business: Business = {
    id: DEMO_BUSINESS_ID,
    slug: DEMO_BUSINESS_SLUG,
    name: businessName,
    timezone,
    location_mode: serviceAreaRequired ? 'CUSTOMER_LOCATION' : 'BUSINESS_LOCATION',
    working_hours: workingHours,
    address: {
      line1: 'Demo business address',
      city: 'Austin',
      region: 'TX',
      postal_code: postalCodes[0] ?? '00000',
    },
  };

  const services = config.services.map((svc, index) => {
    const normalized = normalizeService(svc, index);
    return {
      ...normalized,
      location_policy: serviceAreaRequired ? ('CUSTOMER' as const) : ('NONE' as const),
      service_area_required: serviceAreaRequired,
    };
  });

  const staffNames = config.staff.map((n) => n.trim()).filter(Boolean);
  const resources: Resource[] = staffNames.map((name, index) => ({
    id: `demo_res_${index + 1}`,
    business_id: DEMO_BUSINESS_ID,
    name,
    resource_type: DEMO_STAFF_RESOURCE_TYPE,
    capabilities: [DEMO_STAFF_CAPABILITY],
    working_hours: workingHours,
    is_human: true,
  }));

  const postalCodesByZone = new Map<string, string[]>();
  if (postalCodes.length) {
    postalCodesByZone.set('demo-service-area', postalCodes);
  }

  return {
    business,
    services,
    resources,
    postalCodesByZone,
    notificationEmail,
  };
}

/** Clone config so form edits never mutate a shared constant. */
export function cloneDemoConfig(config: DemoConfig = DEFAULT_DEMO_CONFIG): DemoConfig {
  return structuredClone(config);
}
