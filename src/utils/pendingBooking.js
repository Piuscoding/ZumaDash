/**
 * Guest booking: store draft in localStorage until user signs up / logs in.
 */

const KEY = 'zumadash_pending_booking';

export const savePendingBooking = (data) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch (e) {
    console.error('Failed to save pending booking', e);
    // Often quota: strip large data URLs and retry without photos
    try {
      const slim = { ...data, pickupPhotos: [], dropoffPhotos: [], savedAt: Date.now() };
      localStorage.setItem(KEY, JSON.stringify(slim));
    } catch (e2) {
      console.error('Failed even without photos', e2);
    }
  }
};

export const getPendingBooking = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.savedAt && Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      clearPendingBooking();
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
};

export const clearPendingBooking = () => {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* ignore */
  }
};

/** Create job from pending booking after auth. Returns job or null. */
export const createJobFromPending = async (api, user, ensureCloudinaryUrl) => {
  const pending = getPendingBooking();
  if (!pending) return null;

  let pickupPhotos = pending.pickupPhotos || [];
  let dropoffPhotos = pending.dropoffPhotos || [];

  if (ensureCloudinaryUrl) {
    pickupPhotos = (
      await Promise.all(pickupPhotos.map((u) => ensureCloudinaryUrl(u, 'zumadash/pickup')))
    ).filter(Boolean);
    dropoffPhotos = (
      await Promise.all(dropoffPhotos.map((u) => ensureCloudinaryUrl(u, 'zumadash/dropoff')))
    ).filter(Boolean);
  }

  const payload = {
    pickup: {
      description: pending.pickupDescription,
      contactName: user?.name || pending.contactName || '',
      contactPhone: user?.phone || pending.contactPhone || '',
      photos: pickupPhotos,
    },
    dropoff: {
      description: pending.dropoffDescription,
      photos: dropoffPhotos,
    },
    packageSize: pending.packageSize || 'small',
    packageDescription: pending.packageDescription || '',
    suggestedPrice: Number(pending.suggestedPrice) || 1500,
    paymentMethod: pending.paymentMethod || 'cash',
    distanceBand: pending.distanceBand || 'same_zone',
  };

  const res = await api.post('/api/jobs', payload);
  clearPendingBooking();
  return res.data.job;
};
