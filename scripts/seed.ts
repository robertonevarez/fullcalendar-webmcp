import { closePool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';

async function main() {
  const force = process.argv.includes('--force') || process.argv.includes('--force=true');
  // Default CLI seed is intentional force for demo setup convenience.
  const result = await seedDatabase(true);
  console.log(result);
  await closePool();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
