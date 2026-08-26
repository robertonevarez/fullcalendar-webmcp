import { closePool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';

async function main() {
  // CLI seed always force-reseeds for demo/setup convenience.
  const result = await seedDatabase(true);
  console.log(result);
  await closePool();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
