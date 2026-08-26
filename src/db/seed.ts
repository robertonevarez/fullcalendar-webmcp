import { getDb } from '@/db/client';
import { WorkingHours } from '@/domain/types';

const WEEKDAY_FIELD: WorkingHours[] = [
  { day: 1, open: '08:00', close: '20:00' },
  { day: 2, open: '08:00', close: '20:00' },
  { day: 3, open: '08:00', close: '20:00' },
  { day: 4, open: '08:00', close: '20:00' },
  { day: 5, open: '08:00', close: '20:00' },
  { day: 6, open: '09:00', close: '14:00' },
];

const SALON_HOURS: WorkingHours[] = [
  { day: 2, open: '09:00', close: '19:00' },
  { day: 3, open: '09:00', close: '19:00' },
  { day: 4, open: '09:00', close: '19:00' },
  { day: 5, open: '09:00', close: '19:00' },
  { day: 6, open: '09:00', close: '17:00' },
];

const CLINIC_HOURS: WorkingHours[] = [
  { day: 1, open: '08:00', close: '18:00' },
  { day: 2, open: '08:00', close: '18:00' },
  { day: 3, open: '08:00', close: '18:00' },
  { day: 4, open: '08:00', close: '18:00' },
  { day: 5, open: '08:00', close: '16:00' },
];

const AUTO_HOURS: WorkingHours[] = [
  { day: 1, open: '07:30', close: '18:00' },
  { day: 2, open: '07:30', close: '18:00' },
  { day: 3, open: '07:30', close: '18:00' },
  { day: 4, open: '07:30', close: '18:00' },
  { day: 5, open: '07:30', close: '18:00' },
  { day: 6, open: '08:00', close: '14:00' },
];

export function seedDatabase(force = false) {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as count FROM businesses').get() as { count: number };
  if (count.count > 0 && !force) {
    return { seeded: false };
  }

  if (force) {
    db.exec(`
      DELETE FROM appointment_resources;
      DELETE FROM appointments;
      DELETE FROM slot_tokens;
      DELETE FROM idempotency_records;
      DELETE FROM blocked_times;
      DELETE FROM service_area_zones;
      DELETE FROM resources;
      DELETE FROM services;
      DELETE FROM businesses;
    `);
  }

  const insertBusiness = db.prepare(
    `INSERT INTO businesses (id, slug, name, timezone, location_mode, working_hours_json, address_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertService = db.prepare(
    `INSERT INTO services (
      id, business_id, name, description, duration_minutes, price_cents, currency,
      keywords_json, location_policy, service_area_required, resource_requirements_json, intake_fields_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertResource = db.prepare(
    `INSERT INTO resources (id, business_id, name, resource_type, capabilities_json, working_hours_json, is_human)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertZone = db.prepare(
    `INSERT INTO service_area_zones (id, business_id, zone_id, postal_codes_json) VALUES (?, ?, ?, ?)`,
  );
  const insertBlocked = db.prepare(
    `INSERT INTO blocked_times (id, resource_id, starts_at, ends_at, reason) VALUES (?, ?, ?, ?, ?)`,
  );
  const insertAppointment = db.prepare(
    `INSERT INTO appointments (
      id, business_id, service_id, status, starts_at, ends_at,
      customer_name, customer_email, customer_phone, service_address_json, notes_json,
      price_cents, currency, idempotency_key, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertApptResource = db.prepare(
    `INSERT INTO appointment_resources (appointment_id, resource_id, resource_type) VALUES (?, ?, ?)`,
  );

  // --- Acme HVAC ---
  insertBusiness.run(
    'biz_acme_hvac',
    'acme-hvac',
    'Acme Heating & Air',
    'America/Chicago',
    'CUSTOMER_LOCATION',
    JSON.stringify(WEEKDAY_FIELD),
    JSON.stringify({
      line1: '1200 Service Depot Rd',
      city: 'Austin',
      region: 'TX',
      postal_code: '78701',
    }),
  );
  insertZone.run('zone_acme_central', 'biz_acme_hvac', 'austin-central', JSON.stringify(['78701', '78702', '78704', '78705']));
  insertService.run(
    'svc_ac_diagnostic',
    'biz_acme_hvac',
    'AC Diagnostic Visit',
    'Technician inspects cooling performance, airflow, and refrigerant indicators.',
    90,
    8900,
    'USD',
    JSON.stringify(['AC', 'cooling', 'not cooling', 'airflow', 'diagnostic', 'AC issue', 'upstairs']),
    'CUSTOMER',
    1,
    JSON.stringify([{ resource_type: 'hvac_technician', quantity: 1, capability: 'hvac_diagnostic' }]),
    JSON.stringify(['issue_description', 'symptom_location']),
  );
  insertService.run(
    'svc_ac_repair',
    'biz_acme_hvac',
    'AC Repair',
    'Repairs identified cooling system faults.',
    120,
    14900,
    'USD',
    JSON.stringify(['AC repair', 'cooling repair', 'compressor', 'refrigerant']),
    'CUSTOMER',
    1,
    JSON.stringify([{ resource_type: 'hvac_technician', quantity: 1, capability: 'hvac_repair' }]),
    JSON.stringify(['issue_description']),
  );
  insertService.run(
    'svc_preventive',
    'biz_acme_hvac',
    'Preventive Maintenance',
    'Seasonal HVAC tune-up and safety checks.',
    60,
    7900,
    'USD',
    JSON.stringify(['maintenance', 'tune-up', 'seasonal', 'HVAC']),
    'CUSTOMER',
    1,
    JSON.stringify([{ resource_type: 'hvac_technician', quantity: 1, capability: 'hvac_maintenance' }]),
    JSON.stringify([]),
  );
  insertResource.run(
    'res_hvac_maria',
    'biz_acme_hvac',
    'Maria Lopez',
    'hvac_technician',
    JSON.stringify(['hvac_diagnostic', 'hvac_repair', 'hvac_maintenance']),
    JSON.stringify(WEEKDAY_FIELD),
    1,
  );
  insertResource.run(
    'res_hvac_james',
    'biz_acme_hvac',
    'James Carter',
    'hvac_technician',
    JSON.stringify(['hvac_diagnostic', 'hvac_maintenance']),
    JSON.stringify(WEEKDAY_FIELD),
    1,
  );
  insertBlocked.run(
    'blk_hvac_maria_lunch',
    'res_hvac_maria',
    '2026-08-26T17:00:00.000Z',
    '2026-08-26T18:00:00.000Z',
    'Lunch break',
  );
  insertAppointment.run(
    'appt_seed_hvac_1',
    'biz_acme_hvac',
    'svc_preventive',
    'confirmed',
    '2026-08-26T15:00:00.000Z',
    '2026-08-26T16:00:00.000Z',
    'Pat Lee',
    'pat@example.com',
    '512-555-0101',
    JSON.stringify({ line1: '45 Oak St', city: 'Austin', region: 'TX', postal_code: '78704' }),
    null,
    7900,
    'USD',
    'seed-hvac-1',
    new Date().toISOString(),
    new Date().toISOString(),
  );
  insertApptResource.run('appt_seed_hvac_1', 'res_hvac_james', 'hvac_technician');

  // --- Blue Pipe Plumbing ---
  insertBusiness.run(
    'biz_blue_pipe',
    'blue-pipe-plumbing',
    'Blue Pipe Plumbing',
    'America/Chicago',
    'CUSTOMER_LOCATION',
    JSON.stringify(WEEKDAY_FIELD),
    JSON.stringify({
      line1: '88 Pipeworks Ave',
      city: 'Austin',
      region: 'TX',
      postal_code: '78702',
    }),
  );
  insertZone.run('zone_blue_east', 'biz_blue_pipe', 'austin-east', JSON.stringify(['78702', '78721', '78722', '78723']));
  insertService.run(
    'svc_drain_cleaning',
    'biz_blue_pipe',
    'Drain Cleaning',
    'Clears clogged drains and verifies flow.',
    75,
    9900,
    'USD',
    JSON.stringify(['drain', 'clog', 'slow drain', 'backup']),
    'CUSTOMER',
    1,
    JSON.stringify([{ resource_type: 'plumber', quantity: 1, capability: 'drain_cleaning' }]),
    JSON.stringify(['issue_description']),
  );
  insertService.run(
    'svc_leak_diagnosis',
    'biz_blue_pipe',
    'Leak Diagnosis',
    'Locates and assesses plumbing leaks.',
    90,
    11900,
    'USD',
    JSON.stringify(['leak', 'water damage', 'pipe leak', 'emergency leak']),
    'CUSTOMER',
    1,
    JSON.stringify([{ resource_type: 'plumber', quantity: 1, capability: 'leak_diagnosis' }]),
    JSON.stringify(['issue_description']),
  );
  insertService.run(
    'svc_water_heater',
    'biz_blue_pipe',
    'Water Heater Service',
    'Inspects or services water heater units.',
    120,
    15900,
    'USD',
    JSON.stringify(['water heater', 'no hot water', 'tankless']),
    'CUSTOMER',
    1,
    JSON.stringify([{ resource_type: 'plumber', quantity: 1, capability: 'water_heater_service' }]),
    JSON.stringify(['issue_description']),
  );
  insertResource.run(
    'res_plumber_ana',
    'biz_blue_pipe',
    'Ana Ruiz',
    'plumber',
    JSON.stringify(['drain_cleaning', 'leak_diagnosis', 'water_heater_service']),
    JSON.stringify(WEEKDAY_FIELD),
    1,
  );
  insertResource.run(
    'res_plumber_dev',
    'biz_blue_pipe',
    'Dev Singh',
    'plumber',
    JSON.stringify(['drain_cleaning', 'leak_diagnosis']),
    JSON.stringify(WEEKDAY_FIELD),
    1,
  );

  // --- Northline Salon ---
  insertBusiness.run(
    'biz_northline_salon',
    'northline-salon',
    'Northline Salon',
    'America/Chicago',
    'BUSINESS_LOCATION',
    JSON.stringify(SALON_HOURS),
    JSON.stringify({
      line1: '501 Northline Blvd',
      city: 'Austin',
      region: 'TX',
      postal_code: '78756',
    }),
  );
  insertService.run(
    'svc_haircut',
    'biz_northline_salon',
    'Haircut',
    'Standard haircut service at the salon.',
    45,
    4500,
    'USD',
    JSON.stringify(['haircut', 'trim', 'cut', 'barber', 'salon']),
    'BUSINESS',
    0,
    JSON.stringify([{ resource_type: 'stylist', quantity: 1, capability: 'haircut' }]),
    JSON.stringify([]),
  );
  insertService.run(
    'svc_color',
    'biz_northline_salon',
    'Color Service',
    'Single-process color treatment.',
    120,
    12500,
    'USD',
    JSON.stringify(['color', 'dye', 'highlights', 'salon color']),
    'BUSINESS',
    0,
    JSON.stringify([{ resource_type: 'stylist', quantity: 1, capability: 'hair_color' }]),
    JSON.stringify([]),
  );
  insertService.run(
    'svc_massage',
    'biz_northline_salon',
    'Massage',
    '60-minute massage in a treatment room.',
    60,
    9000,
    'USD',
    JSON.stringify(['massage', 'spa', 'relaxation']),
    'BUSINESS',
    0,
    JSON.stringify([
      { resource_type: 'therapist', quantity: 1, capability: 'massage' },
      { resource_type: 'treatment_room', quantity: 1 },
    ]),
    JSON.stringify([]),
  );
  insertResource.run(
    'res_stylist_sarah',
    'biz_northline_salon',
    'Sarah Kim',
    'stylist',
    JSON.stringify(['haircut', 'hair_color']),
    JSON.stringify(SALON_HOURS),
    1,
  );
  insertResource.run(
    'res_stylist_leo',
    'biz_northline_salon',
    'Leo Martin',
    'stylist',
    JSON.stringify(['haircut']),
    JSON.stringify(SALON_HOURS),
    1,
  );
  insertResource.run(
    'res_therapist_nina',
    'biz_northline_salon',
    'Nina Ortiz',
    'therapist',
    JSON.stringify(['massage']),
    JSON.stringify(SALON_HOURS),
    1,
  );
  insertResource.run(
    'res_room_a',
    'biz_northline_salon',
    'Treatment Room A',
    'treatment_room',
    JSON.stringify([]),
    JSON.stringify(SALON_HOURS),
    0,
  );
  insertResource.run(
    'res_room_b',
    'biz_northline_salon',
    'Treatment Room B',
    'treatment_room',
    JSON.stringify([]),
    JSON.stringify(SALON_HOURS),
    0,
  );

  // --- Harbor Physical Therapy ---
  insertBusiness.run(
    'biz_harbor_pt',
    'harbor-physical-therapy',
    'Harbor Physical Therapy',
    'America/Chicago',
    'BUSINESS_LOCATION',
    JSON.stringify(CLINIC_HOURS),
    JSON.stringify({
      line1: '300 Harbor Clinic Dr',
      city: 'Austin',
      region: 'TX',
      postal_code: '78731',
    }),
  );
  insertService.run(
    'svc_pt_eval',
    'biz_harbor_pt',
    'Physical Therapy Evaluation',
    'Initial PT evaluation in a treatment room.',
    60,
    11000,
    'USD',
    JSON.stringify(['physical therapy', 'PT eval', 'evaluation', 'injury']),
    'BUSINESS',
    0,
    JSON.stringify([
      { resource_type: 'therapist', quantity: 1, capability: 'physical_therapy_eval' },
      { resource_type: 'treatment_room', quantity: 1 },
    ]),
    JSON.stringify(['issue_description']),
  );
  insertService.run(
    'svc_chiro_followup',
    'biz_harbor_pt',
    'Chiropractic Follow-Up',
    'Follow-up chiropractic session.',
    30,
    6500,
    'USD',
    JSON.stringify(['chiropractic', 'follow-up', 'adjustment']),
    'BUSINESS',
    0,
    JSON.stringify([
      { resource_type: 'therapist', quantity: 1, capability: 'chiropractic_followup' },
      { resource_type: 'treatment_room', quantity: 1 },
    ]),
    JSON.stringify([]),
  );
  insertService.run(
    'svc_wellness_consult',
    'biz_harbor_pt',
    'Wellness Consultation',
    'General wellness consultation.',
    45,
    7500,
    'USD',
    JSON.stringify(['wellness', 'consultation', 'health coaching']),
    'BUSINESS',
    0,
    JSON.stringify([
      { resource_type: 'therapist', quantity: 1, capability: 'wellness_consultation' },
      { resource_type: 'treatment_room', quantity: 1 },
    ]),
    JSON.stringify([]),
  );
  insertResource.run(
    'res_pt_elena',
    'biz_harbor_pt',
    'Elena Brooks',
    'therapist',
    JSON.stringify(['physical_therapy_eval', 'wellness_consultation']),
    JSON.stringify(CLINIC_HOURS),
    1,
  );
  insertResource.run(
    'res_pt_marcus',
    'biz_harbor_pt',
    'Marcus Chen',
    'therapist',
    JSON.stringify(['chiropractic_followup', 'wellness_consultation']),
    JSON.stringify(CLINIC_HOURS),
    1,
  );
  insertResource.run(
    'res_clinic_room_1',
    'biz_harbor_pt',
    'Clinic Room 1',
    'treatment_room',
    JSON.stringify([]),
    JSON.stringify(CLINIC_HOURS),
    0,
  );
  insertResource.run(
    'res_clinic_room_2',
    'biz_harbor_pt',
    'Clinic Room 2',
    'treatment_room',
    JSON.stringify([]),
    JSON.stringify(CLINIC_HOURS),
    0,
  );

  // --- Mesa Auto Service ---
  insertBusiness.run(
    'biz_mesa_auto',
    'mesa-auto-service',
    'Mesa Auto Service',
    'America/Chicago',
    'BUSINESS_LOCATION',
    JSON.stringify(AUTO_HOURS),
    JSON.stringify({
      line1: '900 Mesa Motor Ln',
      city: 'Austin',
      region: 'TX',
      postal_code: '78745',
    }),
  );
  insertService.run(
    'svc_oil_change',
    'biz_mesa_auto',
    'Oil Change',
    'Standard oil and filter change.',
    45,
    6999,
    'USD',
    JSON.stringify(['oil change', 'maintenance', 'lube']),
    'BUSINESS',
    0,
    JSON.stringify([
      { resource_type: 'automotive_technician', quantity: 1, capability: 'oil_change' },
      { resource_type: 'service_bay', quantity: 1 },
    ]),
    JSON.stringify([]),
  );
  insertService.run(
    'svc_brake_inspection',
    'biz_mesa_auto',
    'Brake Inspection',
    'Brake system inspection and report.',
    60,
    8900,
    'USD',
    JSON.stringify(['brake', 'inspection', 'safety']),
    'BUSINESS',
    0,
    JSON.stringify([
      { resource_type: 'automotive_technician', quantity: 1, capability: 'brake_service' },
      { resource_type: 'service_bay', quantity: 1 },
    ]),
    JSON.stringify([]),
  );
  insertService.run(
    'svc_battery_replacement',
    'biz_mesa_auto',
    'Battery Replacement',
    'Battery test and replacement service.',
    30,
    14999,
    'USD',
    JSON.stringify(['battery', 'dead battery', 'no start']),
    'BUSINESS',
    0,
    JSON.stringify([
      { resource_type: 'automotive_technician', quantity: 1, capability: 'battery_service' },
      { resource_type: 'service_bay', quantity: 1 },
    ]),
    JSON.stringify([]),
  );
  insertResource.run(
    'res_auto_maria',
    'biz_mesa_auto',
    'Maria Vega',
    'automotive_technician',
    JSON.stringify(['oil_change', 'brake_service', 'battery_service']),
    JSON.stringify(AUTO_HOURS),
    1,
  );
  insertResource.run(
    'res_auto_tom',
    'biz_mesa_auto',
    'Tom Reed',
    'automotive_technician',
    JSON.stringify(['oil_change', 'battery_service']),
    JSON.stringify(AUTO_HOURS),
    1,
  );
  insertResource.run(
    'res_bay_1',
    'biz_mesa_auto',
    'Service Bay 1',
    'service_bay',
    JSON.stringify([]),
    JSON.stringify(AUTO_HOURS),
    0,
  );
  insertResource.run(
    'res_bay_2',
    'biz_mesa_auto',
    'Service Bay 2',
    'service_bay',
    JSON.stringify([]),
    JSON.stringify(AUTO_HOURS),
    0,
  );
  insertAppointment.run(
    'appt_seed_auto_1',
    'biz_mesa_auto',
    'svc_brake_inspection',
    'confirmed',
    '2026-08-29T15:00:00.000Z',
    '2026-08-29T16:00:00.000Z',
    'Chris Nguyen',
    'chris@example.com',
    null,
    null,
    null,
    8900,
    'USD',
    'seed-auto-1',
    new Date().toISOString(),
    new Date().toISOString(),
  );
  insertApptResource.run('appt_seed_auto_1', 'res_auto_maria', 'automotive_technician');
  insertApptResource.run('appt_seed_auto_1', 'res_bay_1', 'service_bay');

  return { seeded: true };
}
