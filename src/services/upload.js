import api from './api';

/**
 * Upload a File (image/audio/video) to Cloudinary via backend.
 * Returns the secure URL string.
 */
export async function uploadFile(file, folder = 'zumadash') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('image', file); // legacy field support
  formData.append('folder', folder);

  const res = await api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data.url;
}

/** @deprecated use uploadFile — kept for existing callers */
export async function uploadImage(file, folder = 'zumadash') {
  return uploadFile(file, folder);
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
 * If value is a data URL, upload it to Cloudinary after auth; else return as-is.
 */
export async function ensureCloudinaryUrl(urlOrDataUrl, folder = 'zumadash') {
  if (!urlOrDataUrl) return null;
  if (!String(urlOrDataUrl).startsWith('data:')) return urlOrDataUrl;

  const res = await fetch(urlOrDataUrl);
  const blob = await res.blob();
  const ext = (blob.type || '').includes('audio')
    ? 'audio.webm'
    : (blob.type || '').includes('video')
      ? 'video.mp4'
      : 'photo.jpg';
  const file = new File([blob], ext, { type: blob.type || 'application/octet-stream' });
  return uploadFile(file, folder);
}
