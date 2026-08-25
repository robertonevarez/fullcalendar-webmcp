#!/usr/bin/env tsx
import { seedDatabase } from '../src/db/seed';

const result = seedDatabase(true);
console.log(JSON.stringify(result));
