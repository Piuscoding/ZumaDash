import api from './api';

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a File/Blob to POST /api/upload (Cloudinary or local docs).
 */
export async function uploadFile(file, folder = 'zumadash') {
  if (!file) return '';
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder || 'zumadash');
  const res = await api.post('/api/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data?.url || res.data?.secure_url || '';
}

export async function uploadImage(file, folder = 'zumadash') {
  return uploadFile(file, folder);
}

/**
 * Normalize a stored value to a hosted URL.
 * - https URL → returned as-is
 * - data: URL → converted to File and uploaded (requires auth)
 * - File/Blob → uploaded
 */
export async function ensureCloudinaryUrl(value, folder = 'zumadash/pending') {
  if (!value) return '';
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return '';
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    if (s.startsWith('data:')) {
      const res = await fetch(s);
      const blob = await res.blob();
      let ext = (blob.type || 'application/octet-stream').split('/')[1] || 'bin';
      if (ext === 'webm') ext = 'webm';
      if (ext.includes('jpeg')) ext = 'jpg';
      const file = new File([blob], `pending.${ext}`, { type: blob.type || 'application/octet-stream' });
      return uploadFile(file, folder);
    }
    // blob: URLs cannot be recovered after refresh — skip
    if (s.startsWith('blob:')) return '';
    return s;
  }
  if (typeof File !== 'undefined' && value instanceof File) {
    return uploadFile(value, folder);
  }
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    const file = new File([value], 'upload.bin', { type: value.type || 'application/octet-stream' });
    return uploadFile(file, folder);
  }
  return '';
}

export default { uploadFile, uploadImage, fileToDataUrl, ensureCloudinaryUrl };
