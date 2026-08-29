import { beforeAll, beforeEach } from 'vitest';
import { seedDatabase } from '@/db/seed';
import { resetInitFlagForTests } from '@/db/init';
import { runMigrations } from '../scripts/migrate';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://localhost:5432/protocoltooling_test';

beforeAll(async () => {
  await runMigrations(process.env.DATABASE_URL);
});

beforeEach(async () => {
  resetInitFlagForTests();
  await seedDatabase(true);
});
