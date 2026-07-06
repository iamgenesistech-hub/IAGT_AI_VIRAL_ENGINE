import { MEDIA_PUBLIC_BASE_URL } from '@/constants/config';

function encodePath(pathValue: string): string {
  return pathValue
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function parseStorageReference(value: string): { bucket: string; objectPath: string } | null {
  const text = value.trim();
  if (!text) return null;

  if (text.startsWith('gs://')) {
    const withoutScheme = text.slice(5);
    const slashIndex = withoutScheme.indexOf('/');
    return {
      bucket: slashIndex === -1 ? withoutScheme : withoutScheme.slice(0, slashIndex),
      objectPath: slashIndex === -1 ? '' : withoutScheme.slice(slashIndex + 1),
    };
  }

  try {
    const url = new URL(text);
    if (url.hostname === 'storage.googleapis.com') {
      const parts = url.pathname.replace(/^\/+/, '').split('/');
      return { bucket: parts.shift() || '', objectPath: parts.join('/') };
    }
    if (url.hostname.endsWith('.storage.googleapis.com')) {
      return {
        bucket: url.hostname.replace(/\.storage\.googleapis\.com$/, ''),
        objectPath: url.pathname.replace(/^\/+/, ''),
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveMediaUrl(value?: string | null): string | null {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text) && !/storage(\.cloud)?\.googleapis\.com/i.test(text)) return text;

  const reference = parseStorageReference(text);
  if (!reference) return text;

  const objectPath = encodePath(reference.objectPath);
  if (MEDIA_PUBLIC_BASE_URL) {
    return objectPath
      ? `${MEDIA_PUBLIC_BASE_URL}/${reference.bucket}/${objectPath}`
      : `${MEDIA_PUBLIC_BASE_URL}/${reference.bucket}`;
  }

  return objectPath
    ? `https://storage.googleapis.com/${reference.bucket}/${objectPath}`
    : `https://storage.googleapis.com/${reference.bucket}`;
}
