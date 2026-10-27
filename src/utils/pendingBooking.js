const KEY = 'zumadash_pending_booking';

let createInflight = null;

export function savePendingBooking(payload) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...payload, savedAt: Date.now() }));
  } catch (e) {
    console.error('savePendingBooking failed', e);
  }
}

export function getPendingBooking() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    if (data.savedAt && Date.now() - Number(data.savedAt) > 7 * 24 * 60 * 60 * 1000) {
      clearPendingBooking();
      return null;
    }
    return data;
  } catch (_) {
    return null;
  }
}

export function clearPendingBooking() {
  try {
    localStorage.removeItem(KEY);
  } catch (_) {}
}

export function peekPendingBooking() {
  return getPendingBooking();
}

export async function reportGuestBookingHold(api, _user) {
  const pending = getPendingBooking();
  if (!pending) return null;
  const tok = localStorage.getItem('zumadash_token');
  if (tok) api.defaults.headers.common['Authorization'] = `Bearer ${tok}`;
  const res = await api.post('/api/jobs/guest-booking-hold', {
    payload: pending,
    paymentReference: pending.paymentReference || '',
    suggestedPrice: pending.suggestedPrice,
    paymentMethod: pending.paymentMethod,
    pickupDescription: pending.pickupDescription,
    dropoffDescription: pending.dropoffDescription,
  });
  // Keep pending in localStorage for support recovery (do not clear)
  return res.data;
}

/**
 * Turn guest localStorage booking into a real job (once).
 */
export async function createJobFromPending(api, user, ensureCloudinaryUrl) {
  if (createInflight) return createInflight;

  createInflight = (async () => {
    const pending = getPendingBooking();
    if (!pending) {
      console.warn('[pendingBooking] nothing in localStorage');
      return null;
    }

    const role = (user && user.role) || 'customer';
    if (role !== 'customer') {
      const err = new Error('Only customer accounts can complete a guest booking');
      err.code = 'ROLE_NOT_CUSTOMER';
      throw err;
    }

    const tok = localStorage.getItem('zumadash_token');
    if (tok) {
      api.defaults.headers.common['Authorization'] = `Bearer ${tok}`;
    }

    const pickupDesc = String(
      pending.pickupDescription || pending.pickup?.description || ''
    ).trim();
    const dropDesc = String(
      pending.dropoffDescription || pending.dropoff?.description || ''
    ).trim();

    if (!pickupDesc || !dropDesc) {
      throw new Error('Saved booking is missing pickup or drop-off address');
    }

    // Resolve media best-effort (do not fail the booking)
    const resolveOne = async (url) => {
      if (!url) return '';
      const s = String(url);
      if (s.startsWith('http://') || s.startsWith('https://')) return s;
      if (s.startsWith('blob:')) return '';
      if (s.startsWith('data:') && typeof ensureCloudinaryUrl === 'function') {
        try {
          // Images, audio (voice notes), video — upload after auth
          const folder = s.startsWith('data:audio')
            ? 'zumadash/booking/voice'
            : s.startsWith('data:video')
              ? 'zumadash/booking/video'
              : 'zumadash/pending';
          return (await ensureCloudinaryUrl(s, folder)) || '';
        } catch (e) {
          console.warn('[pendingBooking] media upload failed', e);
          return '';
        }
      }
      return '';
    };
    const resolveMany = async (list) => {
      const out = [];
      for (const u of Array.isArray(list) ? list : []) {
        const r = await resolveOne(u);
        if (r) out.push(r);
      }
      return out;
    };

    let pickupPhotos = [];
    let dropoffPhotos = [];
    let bookingVoiceNote = '';
    let bookingVideo = '';
    try {
      pickupPhotos = await resolveMany(pending.pickupPhotos);
      dropoffPhotos = await resolveMany(pending.dropoffPhotos);
      bookingVoiceNote = await resolveOne(pending.bookingVoiceNote);
      bookingVideo = await resolveOne(pending.bookingVideo);
    } catch (e) {
      console.warn('[pendingBooking] media skipped', e);
    }

    let paymentMethod = pending.paymentMethod === 'cash' ? 'cash' : 'bank_transfer';
    if (paymentMethod === 'cash' && user?.kycStatus !== 'approved') {
      paymentMethod = 'bank_transfer';
    }

    const isMap = pending.locationMode === 'map';
    const payload = {
      pickup: {
        description: pickupDesc,
        coordinates: pending.pickupCoordinates || pending.pickup?.coordinates || undefined,
        contactName: pending.contactName || user?.name || '',
        contactPhone: pending.contactPhone || user?.phone || '',
        photos: pickupPhotos,
      },
      dropoff: {
        description: dropDesc,
        coordinates: pending.dropoffCoordinates || pending.dropoff?.coordinates || undefined,
        contactName: pending.contactName || user?.name || '',
        contactPhone: pending.contactPhone || user?.phone || '',
        photos: dropoffPhotos,
      },
      packageSize: pending.packageSize || 'medium',
      packageDescription: pending.packageDescription || '',
      suggestedPrice: Math.max(1, Number(pending.suggestedPrice) || 1500),
      paymentMethod,
      paymentReference: pending.paymentReference || '',
      distanceBand: pending.distanceBand || 'same_zone',
      locationMode: isMap ? 'map' : 'text',
      mapDistanceKm: isMap ? pending.mapDistanceKm : undefined,
      routeGeometry: isMap ? pending.routeGeometry : undefined,
      osrmDurationSec: isMap ? pending.osrmDurationSec : undefined,
      displayDurationSec: isMap ? pending.displayDurationSec : undefined,
      routingProvider: isMap ? pending.routingProvider : undefined,
      bookingVoiceNote: bookingVoiceNote || undefined,
      bookingVideo: bookingVideo || undefined,
      guestBooking: true,
    };

    console.info('[pendingBooking] POST /api/jobs', {
      pickup: payload.pickup.description.slice(0, 40),
      dropoff: payload.dropoff.description.slice(0, 40),
      price: payload.suggestedPrice,
      method: payload.paymentMethod,
    });

    const res = await api.post('/api/jobs', payload);
    const job = res.data?.job || res.data;
    if (!job || !(job._id || job.id)) {
      throw new Error(res.data?.message || 'Server did not return a job');
    }
    if (!job._id && job.id) job._id = job.id;

    // Only clear after confirmed success
    clearPendingBooking();
    try {
      sessionStorage.removeItem('zumadash_pending_job_lock');
    } catch (_) {}

    return job;
  })();

  try {
    return await createInflight;
  } finally {
    createInflight = null;
  }
}

export default {
  savePendingBooking,
  getPendingBooking,
  clearPendingBooking,
  peekPendingBooking,
  reportGuestBookingHold,
  createJobFromPending,
};
