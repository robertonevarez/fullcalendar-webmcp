import fs from 'fs';
import path from 'path';
import { loadEnvConfig } from '@next/env';
import { put } from '@vercel/blob';
import { Client } from 'pg';

loadEnvConfig(process.cwd());

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error('Error: BLOB_READ_WRITE_TOKEN environment variable is not set.');
    console.error('To get a token, create a Vercel Blob store in your Vercel project dashboard and run:');
    console.error('  vercel env pull .env.local');
    process.exit(1);
  }

  const connectionString =
    process.env.DATABASE_MIGRATE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://localhost:5432/protocoltooling_test';

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? undefined
      : { rejectUnauthorized: true },
  });

  await client.connect();

  const baseDir = path.join(process.cwd(), 'public', 'images', 'businesses');
  if (!fs.existsSync(baseDir)) {
    console.error(`Error: Directory not found: ${baseDir}`);
    process.exit(1);
  }

  const businesses = fs.readdirSync(baseDir).filter((f) => {
    return fs.statSync(path.join(baseDir, f)).isDirectory();
  });

  console.log(`Found ${businesses.length} businesses with local assets. Syncing to Vercel Blob...\n`);

  for (const slug of businesses) {
    const bizDir = path.join(baseDir, slug);
    const files = fs
      .readdirSync(bizDir)
      .filter((f) => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'))
      .sort();

    console.log(`[${slug}] Uploading ${files.length} images...`);

    // Fetch existing photo metadata from DB if present
    const res = await client.query('SELECT photos_json FROM businesses WHERE slug = $1', [slug]);
    const existingPhotos: Array<{ src: string; objectPosition?: string }> =
      res.rows[0]?.photos_json ?? [];

    const updatedPhotos: Array<{ src: string; objectPosition?: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(bizDir, file);
      const fileBuffer = fs.readFileSync(filePath);
      const pathname = `businesses/${slug}/${file}`;

      const blob = await put(pathname, fileBuffer, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
        allowOverwrite: true,
      });

      console.log(`  -> Uploaded ${file} => ${blob.url}`);

      const matchedConfig = existingPhotos[i] || existingPhotos.find((p) => p.src.includes(file));
      updatedPhotos.push({
        src: blob.url,
        objectPosition: matchedConfig?.objectPosition ?? 'object-center',
      });
    }

    // Update database with Vercel Blob URLs
    await client.query(
      'UPDATE businesses SET photos_json = $1::jsonb WHERE slug = $2',
      [JSON.stringify(updatedPhotos), slug],
    );

    console.log(`[${slug}] Updated database photos_json with Vercel Blob URLs.\n`);
  }

  await client.end();
  console.log('All business photo assets synced to Vercel Blob successfully!');
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
