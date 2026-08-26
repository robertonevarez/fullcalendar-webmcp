import { seedDatabase } from '@/db/seed';

let initialized = false;

export function ensureDatabaseSeeded() {
  if (!initialized) {
    seedDatabase();
    initialized = true;
  }
}
