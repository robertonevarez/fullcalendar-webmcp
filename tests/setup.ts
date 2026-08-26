import { beforeEach } from 'vitest';
import { resetDbForTests } from '@/db/client';
import { seedDatabase } from '@/db/seed';
import path from 'path';
import os from 'os';
import fs from 'fs';

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schedulemcp-test-'));
process.env.DATABASE_PATH = path.join(testDbDir, 'test.db');

beforeEach(() => {
  resetDbForTests();
  seedDatabase(true);
});
