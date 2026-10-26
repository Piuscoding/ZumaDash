import React, { useState, useEffect, useCallback, useRef } from 'react';
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

/** Merchant books own goods — multi-step like customer BookDelivery + assign fleet rider */
const BookSelf = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchTimer = useRef(null);

  const [step, setStep] = useState(1);
  const [priceError, setPriceError] = useState('');
  const [riders, setRiders] = useState([]);
  const [riderId, setRiderId] = useState('');
  const [mapConfig, setMapConfig] = useState({ mapBookingEnabled: false, mapTileUrl: '' });
  const [bookingMode, setBookingMode] = useState('text');
  const [pickupPin, setPickupPin] = useState(null);
  const [dropPin, setDropPin] = useState(null);
  const [mapQuote, setMapQuote] = useState(null);
  const [activeField, setActiveField] = useState('pickup');
  const [flyTarget, setFlyTarget] = useState(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
  });
  const [ownGoodsRates, setOwnGoodsRates] = useState({ commissionPct: 7.5, vatPct: 0 });
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

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
        const tile = r.data.mapTileUrl || r.data.tileUrl || '';
        setMapConfig({
          mapBookingEnabled: !!r.data.mapBookingEnabled,
          mapTileUrl: tile,
        });
      })
      .catch(() => {});
    api
      .get('/api/settings')
      .then((r) => {
        const s = r.data.settings || r.data || {};
        const bd = s.bankDetails;
        if (bd) {
          setBankDetails({
            accountName: bd.accountName || '',
            accountNumber: bd.accountNumber || '',
            bankName: bd.bankName || '',
          });
        }
        const cPct =
          s.allMerchantsOwnGoodsCommissionPercent != null
            ? Number(s.allMerchantsOwnGoodsCommissionPercent)
            : s.merchantOwnGoodsCommissionPercent != null
              ? Number(s.merchantOwnGoodsCommissionPercent)
              : 7.5;
        const vPct = s.vatPercent != null ? Number(s.vatPercent) : 0;
        setOwnGoodsRates({ commissionPct: cPct, vatPct: vPct });
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

  const runSearch = async (q) => {
    const query = String(q || '').trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      setSearchError('');
      const res = await api.get('/api/map/search', { params: { q: query } });
      setSuggestions(res.data.results || []);
    } catch (e) {
      setSuggestions([]);
      setSearchError(e.response?.data?.message || 'Search unavailable');
    }
  };

  const onSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(q), 400);
  };

  const applySuggestion = (s) => {
    const pin = { lat: s.lat, lng: s.lng };
    setFlyTarget(pin);
    if (activeField === 'pickup') {
      setPickupPin(pin);
      setForm((f) => ({ ...f, pickupDescription: s.displayName || f.pickupDescription }));
    } else {
      setDropPin(pin);
      setForm((f) => ({ ...f, dropoffDescription: s.displayName || f.dropoffDescription }));
    }
    setSuggestions([]);
    setSearchQuery('');
  };

  const onMapPick = async (field, latlng) => {
    if (field === 'pickup') {
      setPickupPin(latlng);
      setActiveField('dropoff');
    } else {
      setDropPin(latlng);
    }
    setFlyTarget(latlng);
    try {
      const res = await api.get('/api/map/reverse', {
        params: { lat: latlng.lat, lng: latlng.lng },
      });
      if (res.data?.displayName) {
        if (field === 'pickup') {
          setForm((f) => ({ ...f, pickupDescription: res.data.displayName }));
        } else {
          setForm((f) => ({ ...f, dropoffDescription: res.data.displayName }));
        }
      }
    } catch (_) {}
  };

  const handleMediaFile = async (e, field, kind) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      let url;
      if (kind === 'image') {
        url = await uploadImage(
          file,
          field === 'pickupPhotos' ? 'zumadash/pickup' : 'zumadash/dropoff'
        );
      } else {
        url = await uploadFile(file, `zumadash/booking/${kind}`);
      }
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

  const startVoiceRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const localUrl = URL.createObjectURL(blob);
        setForm((f) => ({ ...f, bookingVoiceNote: localUrl }));
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        try {
          setUploading(true);
          const url = await uploadFile(file, 'zumadash/booking/voice');
          if (url && typeof url === 'string') {
            try {
              URL.revokeObjectURL(localUrl);
            } catch (_) {}
            setForm((f) => ({ ...f, bookingVoiceNote: url }));
          }
        } catch (err) {
          console.error(err);
        } finally {
          setUploading(false);
        }
      };
      rec.start();
      setMediaRecorder(rec);
      setIsRecording(true);
    } catch (err) {
      alert('Microphone permission is required to record a voice note.');
    }
  };

  const stopVoiceRecord = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    setIsRecording(false);
    setMediaRecorder(null);
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
    if (!pickupMatchesProfile) {
      setError('Pickup address must match your profile address');
      return;
    }
    setStep(2);
  };

  const goNextFromStep2 = () => {
    setError('');
    const price = Number(form.suggestedPrice);
    if (Number.isNaN(price) || price < 1500) {
      setPriceError('Price cannot go below ₦1,500');
      return;
    }
    setPriceError('');
    setForm((f) => ({ ...f, suggestedPrice: price }));
    setPaymentConfirmed(false);
    setStep(3);
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

  const tileUrl = mapConfig.mapTileUrl || '';
  const priceBase = Math.max(1500, Number(form.suggestedPrice) || 1500);
  const commissionAmt = Math.round((priceBase * (ownGoodsRates.commissionPct || 0)) / 100);
  const vatAmt = Math.round((priceBase * (ownGoodsRates.vatPct || 0)) / 100);
  const platformTakeAmount = commissionAmt + vatAmt;
  const profileAddr = String(user?.address || '').trim().toLowerCase();
  const pickupMatchesProfile =
    !profileAddr || String(form.pickupDescription || '').trim().toLowerCase() === profileAddr;


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
            Step {step} of 3
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
                    Active field:{' '}
                    <strong>{activeField === 'dropoff' ? 'Drop-off' : 'Pickup'}</strong>
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        flex: 1,
                        fontWeight: activeField === 'pickup' ? 700 : 400,
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
                      }}
                      onClick={() => setActiveField('dropoff')}
                    >
                      Set drop-off
                    </button>
                  </div>

                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>Search address</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={onSearchChange}
                      placeholder="Search place in corridor…"
                      style={{ width: '100%', padding: 10 }}
                    />
                    {searchError && (
                      <p style={{ fontSize: 12, color: 'var(--danger)' }}>{searchError}</p>
                    )}
                    {suggestions.length > 0 && (
                      <ul
                        style={{
                          listStyle: 'none',
                          margin: 0,
                          padding: 0,
                          border: '1px solid var(--gray-200)',
                          borderRadius: 8,
                          maxHeight: 200,
                          overflow: 'auto',
                          background: 'white',
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          zIndex: 20,
                        }}
                      >
                        {suggestions.map((s, i) => (
                          <li key={`${s.lat}-${s.lng}-${i}`}>
                            <button
                              type="button"
                              onClick={() => applySuggestion(s)}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '10px 12px',
                                border: 'none',
                                borderBottom: '1px solid var(--gray-100)',
                                background: 'white',
                                fontSize: 13,
                                cursor: 'pointer',
                              }}
                            >
                              {s.displayName}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => setMapFullscreen(true)}
                    >
                      Fullscreen map
                    </button>
                  </div>

                  <MapPicker
                    pickup={pickupPin}
                    dropoff={dropPin}
                    activeField={activeField}
                    tileUrl={tileUrl}
                    flyTarget={flyTarget}
                    onPick={(latlng) => onMapPick(activeField, latlng)}
                    height={260}
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
                <span style={{ fontSize: 11, color: bookingMode === 'text' || pickupMatchesProfile ? 'var(--gray-500)' : 'var(--danger)' }}>
                  {bookingMode === 'text'
                    ? 'Locked to your profile address'
                    : pickupMatchesProfile
                      ? 'Must match your profile address'
                      : 'Pickup must match your profile address'}
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
                    color: hasCorridor(form.dropoffDescription)
                      ? 'var(--success)'
                      : 'var(--danger)',
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
                  disabled={uploading}
                  onChange={(e) => handleMediaFile(e, 'pickupPhotos', 'image')}
                />
                {(form.pickupPhotos || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {form.pickupPhotos.map((u) => (
                      <img
                        key={u}
                        src={u}
                        alt=""
                        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Drop-off photos (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => handleMediaFile(e, 'dropoffPhotos', 'image')}
                />
                {(form.dropoffPhotos || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {form.dropoffPhotos.map((u) => (
                      <img
                        key={u}
                        src={u}
                        alt=""
                        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }}
                      />
                    ))}
                  </div>
                )}
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
                  !hasCorridor(form.dropoffDescription) ||
                  !pickupMatchesProfile
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
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                  {!isRecording ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={startVoiceRecord}
                      disabled={uploading || !!form.bookingVoiceNote}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <span aria-hidden style={{ fontSize: 16 }}>
                        🎤
                      </span>{' '}
                      Record voice note
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={stopVoiceRecord}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <span aria-hidden>⏹</span> Stop recording
                    </button>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>or upload a file</span>
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  disabled={uploading || isRecording || !!form.bookingVoiceNote}
                  onChange={(e) => handleMediaFile(e, 'bookingVoiceNote', 'voice')}
                />
                {form.bookingVoiceNote && (
                  <div style={{ marginTop: 8 }}>
                    <audio controls src={form.bookingVoiceNote} style={{ width: '100%', maxWidth: 320 }} />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ marginTop: 6, padding: '4px 10px', fontSize: 12 }}
                      onClick={() =>
                        setForm((f) => {
                          if (f.bookingVoiceNote && String(f.bookingVoiceNote).startsWith('blob:')) {
                            try {
                              URL.revokeObjectURL(f.bookingVoiceNote);
                            } catch (_) {}
                          }
                          return { ...f, bookingVoiceNote: '' };
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Video (optional)</label>
                <input
                  type="file"
                  accept="video/*"
                  disabled={uploading}
                  onChange={(e) => handleMediaFile(e, 'bookingVideo', 'video')}
                />
                {form.bookingVideo && (
                  <div style={{ marginTop: 8 }}>
                    <video
                      src={form.bookingVideo}
                      controls
                      style={{ width: '100%', maxWidth: 320, borderRadius: 8 }}
                    />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Price (₦)</label>
                <input
                  type="number"
                  min={1}
                  value={form.suggestedPrice}
                  onChange={(e) => {
                    setPriceError('');
                    setForm({ ...form, suggestedPrice: e.target.value });
                  }}
                />
                {priceError ? (
                  <small style={{ color: 'var(--danger)', fontSize: 12, display: 'block', marginTop: 4 }}>{priceError}</small>
                ) : (
                  <small style={{ color: 'var(--gray-500)', fontSize: 12 }}>Minimum ₦1,500. You can edit this amount.</small>
                )}
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
                  Confirm details →
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              {form.paymentMethod === 'bank_transfer' ? (
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
                  <div style={{ marginBottom: vatAmt > 0 ? 8 : 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Commission</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>₦{commissionAmt.toLocaleString()}</div>
                  </div>
                  {vatAmt > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                        VAT ({ownGoodsRates.vatPct}%)
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>₦{vatAmt.toLocaleString()}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Total to pay</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      ₦{platformTakeAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#fff7ed',
                    border: '1px solid #fdba74',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 16,
                  }}
                >
                  <h3 style={{ fontSize: 16, marginBottom: 12, color: '#c2410c' }}>
                    Cash on delivery — cost summary
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--gray-700)', marginBottom: 16 }}>
                    Confirm the platform fee below. Own-goods: you pay commission
                    {vatAmt > 0 ? ' + VAT' : ''} (fleet rider earns ₦0 on this job).
                  </p>
                  <div style={{ background: 'white', borderRadius: 10, padding: 16 }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Commission</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        ₦{commissionAmt.toLocaleString()}
                      </div>
                    </div>
                    {vatAmt > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                          VAT ({ownGoodsRates.vatPct}%)
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>₦{vatAmt.toLocaleString()}</div>
                      </div>
                    )}
                    <div
                      style={{
                        borderTop: vatAmt > 0 ? '1px solid #e2e8f0' : 'none',
                        paddingTop: vatAmt > 0 ? 10 : 0,
                      }}
                    >
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Total to pay</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#c2410c' }}>
                        ₦{platformTakeAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {form.paymentMethod === 'bank_transfer' && (
                <div className="form-group">
                  <label>Payment reference (optional)</label>
                  <input
                    value={form.paymentReference}
                    onChange={(e) => setForm({ ...form, paymentReference: e.target.value })}
                    placeholder="Transfer reference"
                  />
                </div>
              )}

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
                  {form.paymentMethod === 'bank_transfer'
                    ? `I confirm I transferred ₦${platformTakeAmount.toLocaleString()} to this account.`
                    : `I confirm the total is ₦${platformTakeAmount.toLocaleString()} (cash on delivery).`}
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

      {mapFullscreen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0f172a' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ position: 'absolute', top: 12, right: 12, zIndex: 10000 }}
            onClick={() => setMapFullscreen(false)}
          >
            Close map
          </button>
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 10000,
              display: 'flex',
              gap: 8,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: 12 }}
              onClick={() => setActiveField('pickup')}
            >
              Pickup
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: 12 }}
              onClick={() => setActiveField('dropoff')}
            >
              Drop-off
            </button>
          </div>
          <MapPicker
            pickup={pickupPin}
            dropoff={dropPin}
            activeField={activeField}
            tileUrl={tileUrl}
            flyTarget={flyTarget}
            onPick={(latlng) => onMapPick(activeField, latlng)}
            height="100vh"
            label=""
          />
        </div>
      )}
    </div>
  );
};

export default BookSelf;
