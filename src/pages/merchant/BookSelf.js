import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import MerchantNavbar from '../../components/MerchantNavbar';
import { useAuth } from '../../context/AuthContext';
import MapPicker from '../../components/map/MapPicker';
import { ensureLocationForMap } from '../../utils/geo';
import { uploadImage, uploadFile } from '../../services/upload';

const CORRIDOR_HINT = 'Must include one of: Dutse, Kubwa, Bwari, Ushafa';

function hasCorridor(text) {
  const t = String(text || '').toLowerCase();
  return ['dutse', 'kubwa', 'bwari', 'ushafa'].some((c) => t.includes(c));
}

/** Merchant books own goods — multi-step replica of customer BookDelivery + assign fleet rider */
const BookSelf = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [riders, setRiders] = useState([]);
  const [riderId, setRiderId] = useState('');
  const [mapConfig, setMapConfig] = useState({ mapBookingEnabled: false, mapTileUrl: '' });
  const [bookingMode, setBookingMode] = useState('text');
  const [pickupPin, setPickupPin] = useState(null);
  const [dropPin, setDropPin] = useState(null);
  const [mapQuote, setMapQuote] = useState(null);
  const [activeField, setActiveField] = useState('pickup');
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
  });
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    pickupDescription: '',
    dropoffDescription: '',
    packageSize: 'medium',
    packageDescription: '',
    suggestedPrice: 1500,
    paymentMethod: 'bank_transfer',
    paymentReference: '',
    pickupPhotos: [],
    dropoffPhotos: [],
    bookingVoiceNote: '',
    bookingVideo: '',
  });

  useEffect(() => {
    api
      .get('/api/merchant/riders')
      .then((r) => {
        const list = (r.data.riders || []).filter(
          (x) => !x.fleetFlags?.suspended && x.fleetFlags?.allowTakeJobs !== false
        );
        setRiders(list);
      })
      .catch(() => {});
    api
      .get('/api/map/config')
      .then((r) => {
        setMapConfig({
          mapBookingEnabled: !!r.data.mapBookingEnabled,
          mapTileUrl: r.data.mapTileUrl || r.data.tileUrl || '',
        });
      })
      .catch(() => {});
    api
      .get('/api/settings/public')
      .then((r) => {
        const bd = r.data.settings?.bankDetails || r.data.bankDetails;
        if (bd) setBankDetails(bd);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.address) {
      setForm((f) => ({ ...f, pickupDescription: user.address }));
    }
  }, [user?.address]);

  const requestMapQuote = useCallback(
    async (pPin, dPin, size) => {
      if (!pPin || !dPin) return;
      try {
        const res = await api.post('/api/map/quote', {
          pickupLat: pPin.lat,
          pickupLng: pPin.lng,
          dropLat: dPin.lat,
          dropLng: dPin.lng,
          packageSize: size || form.packageSize,
        });
        if (res.data.locationMode === 'map') {
          setMapQuote(res.data);
          const price = Math.max(1500, Number(res.data.suggestedPrice) || 1500);
          setForm((f) => ({ ...f, suggestedPrice: price }));
          if (res.data.pickupDisplayName) {
            setForm((f) => ({ ...f, pickupDescription: res.data.pickupDisplayName }));
          }
          if (res.data.dropDisplayName) {
            setForm((f) => ({ ...f, dropoffDescription: res.data.dropDisplayName }));
          }
        } else {
          setMapQuote(null);
          setError(res.data.message || 'Pins must be inside the corridor for map mode');
        }
      } catch (e) {
        setError(e.response?.data?.message || 'Quote failed');
      }
    },
    [form.packageSize]
  );

  useEffect(() => {
    if (bookingMode === 'map' && pickupPin && dropPin) {
      requestMapQuote(pickupPin, dropPin, form.packageSize);
    }
  }, [pickupPin, dropPin, form.packageSize, bookingMode, requestMapQuote]);

  const onMapPick = (field, latlng) => {
    if (field === 'pickup') {
      setPickupPin(latlng);
      setActiveField('dropoff');
    } else {
      setDropPin(latlng);
    }
  };

  const handleMediaFile = async (e, field, kind) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      let url;
      if (kind === 'image') url = await uploadImage(file, 'zumadash/jobs');
      else url = await uploadFile(file, 'zumadash/jobs');
      if (field === 'pickupPhotos' || field === 'dropoffPhotos') {
        setForm((f) => ({ ...f, [field]: [...(f[field] || []), url] }));
      } else {
        setForm((f) => ({ ...f, [field]: url }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const addressesValid = () => {
    if (!hasCorridor(form.pickupDescription)) {
      setError('Invalid pickup address — must include Dutse, Kubwa, Bwari or Ushafa');
      return false;
    }
    if (!hasCorridor(form.dropoffDescription)) {
      setError('Invalid drop-off address — must include Dutse, Kubwa, Bwari or Ushafa');
      return false;
    }
    if (bookingMode === 'text' && user?.address) {
      const profile = String(user.address).trim().toLowerCase();
      if (String(form.pickupDescription).trim().toLowerCase() !== profile) {
        setError('Invalid pickup address — must match your profile address');
        return false;
      }
    }
    return true;
  };

  const goNextFromStep1 = () => {
    setError('');
    if (!riderId) {
      setError('Select a fleet rider to assign');
      return;
    }
    if (!form.pickupDescription || !form.dropoffDescription) {
      setError('Pickup and drop-off are required');
      return;
    }
    if (!addressesValid()) return;
    setStep(2);
  };

  const goNextFromStep2 = () => {
    setError('');
    const price = Math.max(1500, Number(form.suggestedPrice) || 0);
    if (price < 1500) {
      setError('Minimum price is ₦1,500');
      return;
    }
    setForm((f) => ({ ...f, suggestedPrice: price }));
    if (form.paymentMethod === 'bank_transfer') {
      setPaymentConfirmed(false);
      setStep(3);
    } else {
      submitBooking();
    }
  };

  const submitBooking = async () => {
    setLoading(true);
    setError('');
    try {
      const price = Math.max(1500, Number(form.suggestedPrice) || 1500);
      const payload = {
        riderId,
        pickup: {
          description: form.pickupDescription,
          photos: form.pickupPhotos || [],
          coordinates: pickupPin || undefined,
        },
        dropoff: {
          description: form.dropoffDescription,
          photos: form.dropoffPhotos || [],
          coordinates: dropPin || undefined,
        },
        packageSize: form.packageSize,
        packageDescription: form.packageDescription,
        suggestedPrice: price,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference || undefined,
        locationMode: bookingMode === 'map' && mapQuote ? 'map' : 'text',
        mapDistanceKm: mapQuote?.mapDistanceKm,
        routeGeometry: mapQuote?.routeGeometry,
        osrmDurationSec: mapQuote?.osrmDurationSec,
        displayDurationSec: mapQuote?.displayDurationSec,
        routingProvider: mapQuote?.routingProvider,
        bookingVoiceNote: form.bookingVoiceNote || undefined,
        bookingVideo: form.bookingVideo || undefined,
      };
      const res = await api.post('/api/merchant/book', payload);
      const jobId = res.data.job?._id || res.data.job?.jobId || res.data.jobId;
      navigate(jobId ? `/track/${jobId}` : '/merchant');
    } catch (e) {
      setError(e.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <MerchantNavbar />
      <div className="container" style={{ maxWidth: 560, padding: '20px 16px 48px' }}>
        <Link to="/merchant" style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 14 }}>
          ← Dashboard
        </Link>

        <div className="card" style={{ marginTop: 16, padding: 20 }}>
          <h1 style={{ fontSize: 20, marginBottom: 4 }}>Book delivery</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
            Step {step} of {form.paymentMethod === 'bank_transfer' ? 3 : 2}
          </p>

          {error && (
            <div
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}
          {uploading && (
            <div
              style={{
                background: '#e0f2fe',
                color: '#075985',
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              Uploading…
            </div>
          )}

          {step === 1 && (
            <>
              <div className="form-group">
                <label>Assign fleet rider *</label>
                <select
                  required
                  value={riderId}
                  onChange={(e) => setRiderId(e.target.value)}
                  style={{ width: '100%', padding: 10 }}
                >
                  <option value="">— Select rider —</option>
                  {riders.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} · {r.phone || r.email}
                    </option>
                  ))}
                </select>
                {riders.length === 0 && (
                  <small style={{ color: 'var(--danger)', fontSize: 12 }}>
                    No available riders. Create a rider and ensure they are not suspended.
                  </small>
                )}
              </div>

              {mapConfig.mapBookingEnabled && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      flex: 1,
                      background: bookingMode === 'map' ? 'var(--primary)' : 'white',
                      color: bookingMode === 'map' ? 'white' : 'var(--gray-700)',
                      border: '1.5px solid var(--primary)',
                      fontWeight: 700,
                    }}
                    onClick={async () => {
                      try {
                        setError('');
                        await ensureLocationForMap('map booking');
                        setBookingMode('map');
                      } catch (e) {
                        setBookingMode('text');
                        setError(e.message || 'Location required for map mode');
                      }
                    }}
                  >
                    Map mode
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      flex: 1,
                      background: bookingMode === 'text' ? 'var(--primary)' : 'white',
                      color: bookingMode === 'text' ? 'white' : 'var(--gray-700)',
                      border: '1.5px solid var(--primary)',
                      fontWeight: 700,
                    }}
                    onClick={() => {
                      setBookingMode('text');
                      setMapQuote(null);
                    }}
                  >
                    Text mode
                  </button>
                </div>
              )}

              {bookingMode === 'map' && mapConfig.mapBookingEnabled && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 10 }}>
                    Active field: <strong>{activeField === 'dropoff' ? 'Drop-off' : 'Pickup'}</strong>
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        flex: 1,
                        fontWeight: activeField === 'pickup' ? 700 : 400,
                        borderColor: activeField === 'pickup' ? 'var(--primary)' : undefined,
                      }}
                      onClick={() => setActiveField('pickup')}
                    >
                      Set pickup
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        flex: 1,
                        fontWeight: activeField === 'dropoff' ? 700 : 400,
                        borderColor: activeField === 'dropoff' ? 'var(--primary)' : undefined,
                      }}
                      onClick={() => setActiveField('dropoff')}
                    >
                      Set drop-off
                    </button>
                  </div>
                  <MapPicker
                    pickup={pickupPin}
                    dropoff={dropPin}
                    activeField={activeField}
                    tileUrl={mapConfig.mapTileUrl}
                    onPick={(latlng) => onMapPick(activeField, latlng)}
                  />
                  {mapQuote && (
                    <p style={{ fontSize: 13, marginTop: 8, color: 'var(--gray-600)' }}>
                      Map · {mapQuote.mapDistanceKm} km · ETA ~
                      {Math.round((mapQuote.displayDurationSec || 0) / 60)} min · suggested ₦
                      {(mapQuote.suggestedPrice || 0).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Pickup address *</label>
                <textarea
                  required
                  rows={2}
                  value={form.pickupDescription}
                  onChange={(e) => {
                    if (bookingMode === 'text') return;
                    setForm({ ...form, pickupDescription: e.target.value });
                  }}
                  readOnly={bookingMode === 'text'}
                  style={{
                    width: '100%',
                    opacity: bookingMode === 'text' ? 0.85 : 1,
                    background: bookingMode === 'text' ? '#f1f5f9' : undefined,
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                  {bookingMode === 'text' ? 'Locked to your profile address' : CORRIDOR_HINT}
                </span>
              </div>

              <div className="form-group">
                <label>Drop-off address *</label>
                <textarea
                  required
                  rows={2}
                  value={form.dropoffDescription}
                  onChange={(e) => setForm({ ...form, dropoffDescription: e.target.value })}
                  style={{ width: '100%' }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: hasCorridor(form.dropoffDescription) ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {CORRIDOR_HINT}
                </span>
              </div>

              <div className="form-group">
                <label>Pickup photos (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={(e) => handleMediaFile(e, 'pickupPhotos', 'image')}
                />
              </div>
              <div className="form-group">
                <label>Drop-off photos (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={(e) => handleMediaFile(e, 'dropoffPhotos', 'image')}
                />
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={
                  uploading ||
                  !riderId ||
                  !form.pickupDescription ||
                  !form.dropoffDescription ||
                  !hasCorridor(form.pickupDescription) ||
                  !hasCorridor(form.dropoffDescription)
                }
                onClick={goNextFromStep1}
              >
                Next →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-group">
                <label>Package size</label>
                <select
                  value={form.packageSize}
                  onChange={(e) => setForm({ ...form, packageSize: e.target.value })}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div className="form-group">
                <label>Package description (optional)</label>
                <textarea
                  rows={2}
                  value={form.packageDescription}
                  onChange={(e) => setForm({ ...form, packageDescription: e.target.value })}
                  placeholder="What is being delivered?"
                />
              </div>
              <div className="form-group">
                <label>Voice note (optional)</label>
                <input
                  type="file"
                  accept="audio/*"
                  disabled={uploading || !!form.bookingVoiceNote}
                  onChange={(e) => handleMediaFile(e, 'bookingVoiceNote', 'file')}
                />
                {form.bookingVoiceNote && (
                  <p style={{ fontSize: 12, color: 'var(--success)' }}>Voice note attached</p>
                )}
              </div>
              <div className="form-group">
                <label>Video (optional)</label>
                <input
                  type="file"
                  accept="video/*"
                  disabled={uploading}
                  onChange={(e) => handleMediaFile(e, 'bookingVideo', 'file')}
                />
              </div>
              <div className="form-group">
                <label>Price (₦) — minimum 1,500</label>
                <input
                  type="number"
                  min={1500}
                  value={form.suggestedPrice}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      suggestedPrice: Math.max(1500, Number(e.target.value) || 1500),
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Payment method</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                >
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash on delivery</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setStep(1)}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={loading || uploading}
                  onClick={goNextFromStep2}
                >
                  {form.paymentMethod === 'bank_transfer'
                    ? 'Next: Payment details →'
                    : loading
                      ? 'Booking…'
                      : 'Book delivery'}
                </button>
              </div>
            </>
          )}

          {step === 3 && form.paymentMethod === 'bank_transfer' && (
            <>
              <p style={{ fontSize: 14, marginBottom: 12 }}>
                Transfer <strong>₦{Number(form.suggestedPrice).toLocaleString()}</strong> to the
                account below.
              </p>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Bank</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{bankDetails.bankName || '—'}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Account name</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {bankDetails.accountName || '—'}
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Account number</div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>
                    {bankDetails.accountNumber || '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Amount</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>
                    ₦{Number(form.suggestedPrice).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Payment reference / note (optional)</label>
                <input
                  value={form.paymentReference}
                  onChange={(e) => setForm({ ...form, paymentReference: e.target.value })}
                  placeholder="e.g. transfer ID or name used"
                />
              </div>

              <label
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  marginBottom: 16,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={paymentConfirmed}
                  onChange={(e) => setPaymentConfirmed(e.target.checked)}
                  style={{ marginTop: 3, width: 18, height: 18 }}
                />
                <span>
                  I confirm I have transferred ₦{Number(form.suggestedPrice).toLocaleString()} to
                  the account above. The job will wait for admin approval; only the assigned rider
                  will be notified.
                </span>
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setStep(2)}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 2, opacity: paymentConfirmed ? 1 : 0.6 }}
                  disabled={loading || !paymentConfirmed}
                  onClick={submitBooking}
                >
                  {loading ? 'Booking…' : 'Confirm & book'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookSelf;
