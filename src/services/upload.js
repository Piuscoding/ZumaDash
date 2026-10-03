import api from './api';

/**
 * Upload a single image File to Cloudinary via backend.
 * Returns the secure URL string.
 */
export async function uploadImage(file, folder = 'zumadash') {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', folder);

  const res = await api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data.url;
}

/**
 * Read file as data URL (for guest pending booking before auth).
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * If value is a data URL, upload it to Cloudinary after auth; else return as-is (already a URL).
 */
export async function ensureCloudinaryUrl(urlOrDataUrl, folder = 'zumadash') {
  if (!urlOrDataUrl) return null;
  if (!String(urlOrDataUrl).startsWith('data:')) return urlOrDataUrl;

  // Convert data URL to blob and upload
  const res = await fetch(urlOrDataUrl);
  const blob = await res.blob();
  const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
  return uploadImage(file, folder);
}
