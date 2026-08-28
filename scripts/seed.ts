import { loadEnvConfig } from '@next/env';
import { closePool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';

loadEnvConfig(process.cwd());

async function main() {
  const force = !process.argv.includes('--no-force');
  const result = await seedDatabase(force);
  console.log(result);
  await closePool();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
