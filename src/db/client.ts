import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = process.env.DATABASE_PATH ?? path.join(DB_DIR, 'schedulemcp.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
  }
  return db;
}

export function resetDbForTests() {
  if (db) {
    db.close();
    db = null;
  }
  for (const suffix of ['', '-wal', '-shm']) {
    const filePath = `${DB_PATH}${suffix}`;
    if (fs.existsSync(/* turbopackIgnore: true */ filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

function initializeSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      timezone TEXT NOT NULL,
      location_mode TEXT NOT NULL,
      working_hours_json TEXT NOT NULL,
      address_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id),
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      price_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      keywords_json TEXT NOT NULL,
      location_policy TEXT NOT NULL,
      service_area_required INTEGER NOT NULL,
      resource_requirements_json TEXT NOT NULL,
      intake_fields_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id),
      name TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      capabilities_json TEXT NOT NULL,
      working_hours_json TEXT NOT NULL,
      is_human INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_area_zones (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id),
      zone_id TEXT NOT NULL,
      postal_codes_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blocked_times (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL REFERENCES resources(id),
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      reason TEXT
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id),
      service_id TEXT NOT NULL REFERENCES services(id),
      status TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT,
      service_address_json TEXT,
      notes_json TEXT,
      price_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointment_resources (
      appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      resource_id TEXT NOT NULL REFERENCES resources(id),
      resource_type TEXT NOT NULL,
      PRIMARY KEY (appointment_id, resource_id)
    );

    CREATE TABLE IF NOT EXISTS slot_tokens (
      slot_id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id),
      service_id TEXT NOT NULL REFERENCES services(id),
      payload_json TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS idempotency_records (
      scope_key TEXT PRIMARY KEY,
      operation TEXT NOT NULL,
      response_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_business ON appointments(business_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_time ON appointments(starts_at, ends_at);
    CREATE INDEX IF NOT EXISTS idx_appointment_resources_resource ON appointment_resources(resource_id);
  `);
}

export function runInTransaction<T>(fn: () => T): T {
  const database = getDb();
  const tx = database.transaction(fn);
  return tx();
}
