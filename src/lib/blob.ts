import { put, list, del } from '@vercel/blob';

export function hasBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Uploads a business photo asset to Vercel Blob storage.
 * @param slug The business slug
 * @param filename File name (e.g., '1.jpg')
 * @param data Buffer or Blob content
 * @param contentType Content type (defaults to 'image/jpeg')
 * @returns Public Vercel Blob CDN URL
 */
export async function uploadBusinessPhoto(
  slug: string,
  filename: string,
  data: Buffer | Blob | ArrayBuffer,
  contentType = 'image/jpeg',
): Promise<string> {
  const pathname = `businesses/${slug}/${filename}`;
  const blob = await put(pathname, data, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

export { put, list, del };
