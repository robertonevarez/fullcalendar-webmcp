import { beforeEach } from 'vitest';
import { seedDatabase } from '@/db/seed';
import { resetInitFlagForTests } from '@/db/init';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://localhost:5432/schedulemcp_test';

beforeEach(async () => {
  resetInitFlagForTests();
  await seedDatabase(true);
});
