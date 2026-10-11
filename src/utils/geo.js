/**
 * Device location helpers for map-mode booking and map-job rider actions.
 */

export function geolocationSupported() {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
}

/**
 * Prompt for current position. Resolves { lat, lng, accuracy } or rejects with a clear message.
 */
export function requestDeviceLocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (!geolocationSupported()) {
      reject(new Error('This device does not support location. Use text mode or another device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        let msg = 'Location permission is required for map mode.';
        if (err && err.code === 1) msg = 'Location permission denied. Enable location for this site, then try again.';
        else if (err && err.code === 2) msg = 'Location unavailable. Turn on GPS / location services and try again.';
        else if (err && err.code === 3) msg = 'Location request timed out. Try again outdoors or with GPS on.';
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        maximumAge: options.maximumAge ?? 5000,
        timeout: options.timeout ?? 15000,
      }
    );
  });
}

/**
 * Ensure location is on before map actions. Returns coords or throws.
 */
export async function ensureLocationForMap(actionLabel = 'map features') {
  try {
    return await requestDeviceLocation();
  } catch (e) {
    const err = new Error(
      e.message || `Turn on device location to use ${actionLabel}.`
    );
    err.code = 'LOCATION_REQUIRED';
    throw err;
  }
}
