import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import CustomerNavbar from '../../components/CustomerNavbar';
import api from '../../services/api';
import MapPicker from '../../components/map/MapPicker';
import { useAuth } from '../../context/AuthContext';
import { savePendingBooking, getPendingBooking } from '../../utils/pendingBooking';
import { uploadImage, uploadFile, fileToDataUrl } from '../../services/upload';
// saved addresses loaded when authenticated

const BookDelivery = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
  });
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [mapConfig, setMapConfig] = useState({ mapBookingEnabled: false, mapTileUrl: '' });
  const [vatPercent, setVatPercent] = useState(0);
  const [commissionPct, setCommissionPct] = useState(15);
  const [pickupPin, setPickupPin] = useState(null);
  const [dropPin, setDropPin] = useState(null);
  const [mapQuote, setMapQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [bookingMode, setBookingMode] = useState('text'); // 'map' | 'text'
  const [activeField, setActiveField] = useState('pickup'); // which field search/map fills
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [flyTarget, setFlyTarget] = useState(null);
  const searchTimer = useRef(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [form, setForm] = useState({
    pickupDescription: '',
    dropoffDescription: '',
    packageSize: 'small',
    packageDescription: '',
    paymentMethod: 'cash',
    suggestedPrice: 1500,
    pickupPhotos: [],
    dropoffPhotos: [],
    paymentReference: '',
    bookingVoiceNote: '',
    bookingVideo: '',
  });

  useEffect(() => {
    api.get('/api/settings')
      .then((res) => {
        const bd = res.data.settings?.bankDetails;
        if (bd) {
          setBankDetails({
            accountName: bd.accountName || '',
            accountNumber: bd.accountNumber || '',
            bankName: bd.bankName || '',
          });
        }
        if (res.data.settings?.mapBookingEnabled) {
          setMapConfig((c) => ({ ...c, mapBookingEnabled: true, mapTileUrl: res.data.settings.mapTileUrl || c.mapTileUrl }));
        }
        if (res.data.settings?.vatPercent != null) setVatPercent(Number(res.data.settings.vatPercent) || 0);
        if (res.data.settings?.commissionPercentage != null) setCommissionPct(Number(res.data.settings.commissionPercentage) || 15);
      })
      .catch(() => {});
    api.get('/api/map/config')
      .then((res) => {
        setMapConfig({
          mapBookingEnabled: !!res.data.mapBookingEnabled,
          mapTileUrl: res.data.mapTileUrl || '',
        });
      })
      .catch(() => {});

    if (isAuthenticated) {
      api.get('/api/users/addresses')
        .then((res) => setSavedAddresses(res.data.addresses || []))
        .catch(() => {});
    }

    const pending = getPendingBooking();
    if (pending && !isAuthenticated) {
      setForm((f) => ({
        ...f,
        pickupDescription: pending.pickupDescription || '',
        dropoffDescription: pending.dropoffDescription || '',
        packageSize: pending.packageSize || 'small',
        packageDescription: pending.packageDescription || '',
        paymentMethod: pending.paymentMethod || 'cash',
        suggestedPrice: pending.suggestedPrice || 1500,
        pickupPhotos: pending.pickupPhotos || [],
        dropoffPhotos: pending.dropoffPhotos || [],
      }));
    }
  }, [isAuthenticated]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const requestMapQuote = async (pPin, dPin, size) => {
    if (!pPin || !dPin || !mapConfig.mapBookingEnabled) {
      setMapQuote(null);
      return;
    }
    setQuoteLoading(true);
    try {
      const res = await api.post('/api/map/quote', {
        pickupLat: pPin.lat,
        pickupLng: pPin.lng,
        dropLat: dPin.lat,
        dropLng: dPin.lng,
        packageSize: size || form.packageSize,
      });
      setMapQuote(res.data);
      if (res.data.locationMode === 'map' && res.data.suggestedPrice) {
        setForm((f) => ({ ...f, suggestedPrice: res.data.suggestedPrice }));
      }
    } catch (_) {
      setMapQuote({ locationMode: 'text' });
    } finally {
      setQuoteLoading(false);
    }
  };

  const applyPin = useCallback((field, pin, description) => {
    if (field === 'pickup') {
      setPickupPin(pin);
      if (description) setForm((f) => ({ ...f, pickupDescription: description }));
      requestMapQuote(pin, dropPin, form.packageSize);
    } else {
      setDropPin(pin);
      if (description) setForm((f) => ({ ...f, dropoffDescription: description }));
      requestMapQuote(pickupPin, pin, form.packageSize);
    }
    setFlyTarget(pin);
  }, [dropPin, pickupPin, form.packageSize]);

  // Map click → pin for active field + reverse geocode into textarea
  const onMapPick = async (field, pin) => {
    applyPin(field, pin, null);
    try {
      const res = await api.get('/api/map/reverse', { params: { lat: pin.lat, lng: pin.lng } });
      if (res.data?.displayName) {
        if (field === 'pickup') setForm((f) => ({ ...f, pickupDescription: res.data.displayName }));
        else setForm((f) => ({ ...f, dropoffDescription: res.data.displayName }));
      }
    } catch (_) {}
  };

  // Live search suggestions (Nominatim via backend)
  const runSearch = async (q) => {
    const query = String(q || '').trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSearchError('');
      return;
    }
    setSearchLoading(true);
    setSearchError('');
    try {
      const res = await api.get('/api/map/search', { params: { q: query } });
      const list = res.data.results || [];
      setSuggestions(list);
      if (list.length === 0) setSearchError('Address wasn\'t found. Try a nearby landmark or different spelling.');
    } catch (err) {
      setSuggestions([]);
      setSearchError(err.response?.data?.message || 'Search failed. Check connection.');
    } finally {
      setSearchLoading(false);
    }
  };

  const onSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(q), 400);
  };

  const selectSuggestion = (item) => {
    const pin = { lat: item.lat, lng: item.lng };
    applyPin(activeField, pin, item.displayName);
    setSearchQuery(item.displayName);
    setSuggestions([]);
    setSearchError('');
  };

  // Search from textarea content (button or Enter)
  const searchFromTextarea = async (field) => {
    const q = field === 'pickup' ? form.pickupDescription : form.dropoffDescription;
    setActiveField(field);
    setSearchQuery(q);
    await runSearch(q);
  };

  const handlePhotoSelect = async (e, field) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      const urls = [];
      for (const file of files) {
        if (isAuthenticated) {
          const url = await uploadImage(file, field === 'pickupPhotos' ? 'zumadash/pickup' : 'zumadash/dropoff');
          urls.push(url);
        } else {
          // Guest: store as data URL until after auth
          const dataUrl = await fileToDataUrl(file);
          urls.push(dataUrl);
        }
      }
      setForm((prev) => ({
        ...prev,
        [field]: [...(prev[field] || []), ...urls].slice(0, 3),
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Photo upload failed. Try a smaller image.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleMediaFile = async (e, field, kind) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      let url;
      if (isAuthenticated) {
        url = await uploadFile(file, `zumadash/booking/${kind}`);
      } else {
        url = await fileToDataUrl(file);
      }
      setForm((prev) => ({ ...prev, [field]: url }));
    } catch (err) {
      setError(err.response?.data?.message || 'Media upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

    const removePhoto = (field, index) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const buildPendingPayload = () => ({
    pickupDescription: form.pickupDescription,
    dropoffDescription: form.dropoffDescription,
    packageSize: form.packageSize,
    packageDescription: form.packageDescription,
    paymentMethod: form.paymentMethod,
    suggestedPrice: Number(form.suggestedPrice),
        locationMode: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? 'map' : 'text',
        mapDistanceKm: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? mapQuote.mapDistanceKm : undefined,
        routeGeometry: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? mapQuote.routeGeometry : undefined,
        osrmDurationSec: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? mapQuote.osrmDurationSec : undefined,
        displayDurationSec: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? mapQuote.displayDurationSec : undefined,
    distanceBand: 'same_zone',
    contactName: user?.name || '',
    contactPhone: user?.phone || '',
    pickupPhotos: form.pickupPhotos,
    dropoffPhotos: form.dropoffPhotos,
    paymentReference: form.paymentReference || '',
  });

  const createJobNow = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        pickup: {
          description: form.pickupDescription,
          coordinates: bookingMode === 'map' && pickupPin ? { lat: pickupPin.lat, lng: pickupPin.lng } : undefined,
          contactName: user?.name,
          contactPhone: user?.phone,
          photos: form.pickupPhotos.filter((u) => !String(u).startsWith('data:')),
        },
        dropoff: {
          description: form.dropoffDescription,
          coordinates: bookingMode === 'map' && dropPin ? { lat: dropPin.lat, lng: dropPin.lng } : undefined,
          photos: form.dropoffPhotos.filter((u) => !String(u).startsWith('data:')),
        },
        packageSize: form.packageSize,
        packageDescription: form.packageDescription,
        suggestedPrice: Number(form.suggestedPrice),
        locationMode: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? 'map' : 'text',
        mapDistanceKm: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? mapQuote.mapDistanceKm : undefined,
        routeGeometry: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? mapQuote.routeGeometry : undefined,
        osrmDurationSec: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? mapQuote.osrmDurationSec : undefined,
        displayDurationSec: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? mapQuote.displayDurationSec : undefined,
        paymentMethod: form.paymentMethod,
        distanceBand: 'same_zone',
        paymentReference: form.paymentMethod === 'bank_transfer' ? (form.paymentReference || '').trim() || null : null,
        bookingVoiceNote: form.bookingVoiceNote && !String(form.bookingVoiceNote).startsWith('data:') ? form.bookingVoiceNote : null,
        bookingVideo: form.bookingVideo && !String(form.bookingVideo).startsWith('data:') ? form.bookingVideo : null,
      };

      const res = await api.post('/api/jobs', payload);
      const job = res.data.job;
      // Always go to track; status (e.g. pending_payment_approval) shows there
      navigate(`/track/${job._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create delivery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goNextFromStep2 = () => {
    if (form.paymentMethod === 'bank_transfer') {
      setPaymentConfirmed(false);
      setStep(3);
      return;
    }
    finishOrAuthGate();
  };

  const finishOrAuthGate = () => {
    if (isAuthenticated && user?.role === 'customer') {
      createJobNow();
      return;
    }
    if (isAuthenticated && user?.role !== 'customer') {
      setError('Only customer accounts can book deliveries.');
      return;
    }
    savePendingBooking(buildPendingPayload());
    setStep(4);
  };

  const goToRegister = () => {
    savePendingBooking(buildPendingPayload());
    navigate('/register', { state: { fromBooking: true } });
  };

  const goToLogin = () => {
    savePendingBooking(buildPendingPayload());
    navigate('/login', { state: { fromBooking: true } });
  };

  const backLink = isAuthenticated ? '/dashboard' : '/';

  const PhotoRow = ({ field, label }) => (
    <div className="form-group">
      <label>{label}</label>
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={uploading}
        onChange={(e) => handlePhotoSelect(e, field)}
      />
      <small style={{ color: 'var(--gray-500)', fontSize: 12 }}>
        Optional. Up to 3 photos. Max 5MB each.
        {!isAuthenticated && ' (Saved until you sign in.)'}
      </small>
      {form[field]?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {form[field].map((url, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img
                src={url}
                alt=""
                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--gray-200)' }}
              />
              <button
                type="button"
                onClick={() => removePhoto(field, i)}
                style={{
                  position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--danger)', color: 'white', fontSize: 12, lineHeight: '22px', padding: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', padding: '24px 16px' }}>
      <CustomerNavbar />
      <div className="container" style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to={backLink} style={{ color: 'var(--primary)', fontWeight: 600 }}>
            ← {isAuthenticated ? 'Dashboard' : 'Home'}
          </Link>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>⛰ ZumaDash</span>
        </div>

        <div className="card">
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Book a Delivery</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 8 }}>
            Dutse • Kubwa • Bwari only
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[1, 2, 3, 4].slice(0, isAuthenticated ? (form.paymentMethod === 'bank_transfer' || step >= 3 ? 3 : 2) : 4).map((s) => (
              <div
                key={s}
                style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: step >= s ? 'var(--primary)' : 'var(--gray-200)',
                }}
              />
            ))}
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}
          {uploading && (
            <div style={{ background: '#e0f2fe', color: '#075985', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
              Uploading photo…
            </div>
          )}


          {step === 1 && (
            <>
              {isAuthenticated && savedAddresses.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Use saved address</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {savedAddresses.map((a) => (
                      <button
                        key={a._id}
                        type="button"
                        className="btn btn-secondary"
                        style={{ textAlign: 'left', fontSize: 13, padding: '10px 12px' }}
                        onClick={() => {
                          // Prefer fill empty fields: if pickup empty use for pickup else dropoff
                          if (!form.pickupDescription) {
                            setForm((f) => ({ ...f, pickupDescription: a.description }));
                          } else {
                            setForm((f) => ({ ...f, dropoffDescription: a.description }));
                          }
                        }}
                      >
                        <strong>{a.label || 'Saved'}</strong>
                        {a.zone ? ` · ${a.zone}` : ''} — {(a.description || '').slice(0, 50)}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>Tap once for pickup, again for drop-off</p>
                </div>
              )}
              {/* Mode toggle */}
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
                    onClick={() => setBookingMode('map')}
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
                      setSuggestions([]);
                      setSearchError('');
                    }}
                  >
                    Text mode
                  </button>
                </div>
              )}

              {bookingMode === 'map' && mapConfig.mapBookingEnabled && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 10 }}>
                    Search or tap the map. Active field: <strong>{activeField === 'dropoff' ? 'Drop-off' : 'Pickup'}</strong>
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: activeField === 'pickup' ? 800 : 500,
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
                        fontSize: 13,
                        fontWeight: activeField === 'dropoff' ? 800 : 500,
                        borderColor: activeField === 'dropoff' ? 'var(--primary)' : undefined,
                      }}
                      onClick={() => setActiveField('dropoff')}
                    >
                      Set drop-off
                    </button>
                  </div>

                  <div className="form-group" style={{ position: 'relative', marginBottom: 8 }}>
                    <label>Search location</label>
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={onSearchChange}
                      placeholder="Type place name e.g. Kubwa Express Junction…"
                      autoComplete="off"
                      style={{ width: '100%' }}
                    />
                    {searchLoading && (
                      <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>Searching…</p>
                    )}
                    {searchError && (
                      <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{searchError}</p>
                    )}
                    {suggestions.length > 0 && (
                      <ul
                        style={{
                          listStyle: 'none',
                          margin: '6px 0 0',
                          padding: 0,
                          border: '1px solid var(--gray-200)',
                          borderRadius: 10,
                          background: 'white',
                          maxHeight: 200,
                          overflowY: 'auto',
                          zIndex: 20,
                          position: 'relative',
                        }}
                      >
                        {suggestions.map((s, i) => (
                          <li key={`${s.lat}-${s.lng}-${i}`}>
                            <button
                              type="button"
                              onClick={() => selectSuggestion(s)}
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

                  <MapPicker
                    pickup={pickupPin}
                    dropoff={dropPin}
                    activeField={activeField}
                    onPick={onMapPick}
                    flyTarget={flyTarget}
                    tileUrl={mapConfig.mapTileUrl}
                    height={260}
                    label="Map — tap to place pin for the active field"
                  />

                  {quoteLoading && <p style={{ fontSize: 12, marginTop: 8 }}>Getting route from OSRM…</p>}
                  {mapQuote?.locationMode === 'map' && (
                    <p style={{ fontSize: 13, marginTop: 8, color: 'var(--primary)', fontWeight: 600 }}>
                      Map mode · {mapQuote.mapDistanceKm} km · ETA ~{Math.round((mapQuote.displayDurationSec || 0) / 60)} min · suggested ₦{(mapQuote.suggestedPrice || 0).toLocaleString()}
                    </p>
                  )}
                  {mapQuote && mapQuote.locationMode !== 'map' && (pickupPin || dropPin) && (
                    <p style={{ fontSize: 12, marginTop: 8, color: 'var(--gray-500)' }}>
                      {mapQuote.message || 'Pins incomplete or outside corridor — will use text pricing.'}
                    </p>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Pickup address / landmarks <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea
                  name="pickupDescription"
                  value={form.pickupDescription}
                  onChange={handleChange}
                  onFocus={() => setActiveField('pickup')}
                  rows={3}
                  placeholder="e.g. Kubwa Phase 2, after the big mosque, blue gate opposite pure water seller"
                  required
                />
                {bookingMode === 'map' && mapConfig.mapBookingEnabled && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: 6, padding: '6px 12px', fontSize: 12 }}
                    onClick={() => searchFromTextarea('pickup')}
                  >
                    Find this address on map
                  </button>
                )}
              </div>
              <div className="form-group">
                <label>Drop-off address / landmarks <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea
                  name="dropoffDescription"
                  value={form.dropoffDescription}
                  onChange={handleChange}
                  onFocus={() => setActiveField('dropoff')}
                  rows={3}
                  placeholder="e.g. Dutse Alhaji, near the market, red roof house"
                  required
                />
                {bookingMode === 'map' && mapConfig.mapBookingEnabled && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: 6, padding: '6px 12px', fontSize: 12 }}
                    onClick={() => searchFromTextarea('dropoff')}
                  >
                    Find this address on map
                  </button>
                )}
              </div>

<PhotoRow field="pickupPhotos" label="Pickup photos (optional)" />
              <PhotoRow field="dropoffPhotos" label="Drop-off photos (optional)" />
              <button
                className="btn btn-primary btn-block"
                onClick={() => setStep(2)}
                disabled={!form.pickupDescription || !form.dropoffDescription || uploading}
              >
                Next →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              
              <div className="form-group">
                <label>Voice note (optional)</label>
                <input type="file" accept="audio/*" disabled={uploading} onChange={(e) => handleMediaFile(e, 'bookingVoiceNote', 'voice')} />
                <small style={{ color: 'var(--gray-500)', fontSize: 12 }}>Short audio for landmarks / instructions.</small>
                {form.bookingVoiceNote && (
                  <div style={{ marginTop: 8 }}>
                    <audio controls src={form.bookingVoiceNote} style={{ width: '100%', maxWidth: 320 }} />
                    <button type="button" className="btn btn-secondary" style={{ marginTop: 6, padding: '4px 10px', fontSize: 12 }} onClick={() => setForm((f) => ({ ...f, bookingVoiceNote: '' }))}>Remove</button>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Short video (optional)</label>
                <input type="file" accept="video/*" disabled={uploading} onChange={(e) => handleMediaFile(e, 'bookingVideo', 'video')} />
                <small style={{ color: 'var(--gray-500)', fontSize: 12 }}>Optional. Keep it short for faster upload.</small>
                {form.bookingVideo && (
                  <div style={{ marginTop: 8 }}>
                    <video src={form.bookingVideo} controls style={{ width: '100%', maxWidth: 320, borderRadius: 8 }} />
                    <button type="button" className="btn btn-secondary" style={{ marginTop: 6, padding: '4px 10px', fontSize: 12 }} onClick={() => setForm((f) => ({ ...f, bookingVideo: '' }))}>Remove</button>
                  </div>
                )}
              </div>
<div className="form-group">
                <label>Package Size</label>
                <select name="packageSize" value={form.packageSize} onChange={handleChange}>
                  <option value="small">Small (documents, small items)</option>
                  <option value="medium">Medium (bag, food, medium box)</option>
                  <option value="large">Large / Heavy</option>
                </select>
              </div>
              <div className="form-group">
                <label>What are you sending? (optional)</label>
                <input
                  name="packageDescription"
                  value={form.packageDescription}
                  onChange={handleChange}
                  placeholder="e.g. Food, documents, clothes"
                />
              </div>
              <div className="form-group">
                <label>Suggested Price (₦)</label>
                <input type="number" name="suggestedPrice" value={form.suggestedPrice} onChange={handleChange} min={500} />
                {vatPercent > 0 && (
                  <p style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 6 }}>
                    VAT {vatPercent}% ≈ ₦{Math.round((Number(form.suggestedPrice) * vatPercent) / 100).toLocaleString()} and commission ~{commissionPct}% are taken from this delivery amount for the platform (rider keeps the rest). Customer pays this full amount (COD or transfer).
                  </p>
                )}
                <small style={{ color: 'var(--gray-500)', fontSize: 12 }}>Riders can make offers.</small>
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange}>
                  <option value="cash">Cash on Delivery</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>← Back</button>
                <button className="btn btn-primary" onClick={goNextFromStep2} disabled={loading || uploading} style={{ flex: 2 }}>
                  {form.paymentMethod === 'bank_transfer'
                    ? 'Next: Payment Details →'
                    : isAuthenticated
                      ? (loading ? 'Creating...' : 'Create Delivery')
                      : 'Continue →'}
                </button>
              </div>
            </>
          )}

          {step === 3 && form.paymentMethod === 'bank_transfer' && (
            <>
              <div style={{ background: 'var(--primary-light)', border: '1px solid #86efac', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: 'var(--primary-dark)' }}>Bank Transfer Details</h3>
                <p style={{ fontSize: 13, color: 'var(--gray-700)', marginBottom: 16 }}>
                  Transfer <strong>₦{Number(form.suggestedPrice).toLocaleString()}</strong> to the account below.
                  {vatPercent > 0 && (
                    <div style={{ marginTop: 10, fontSize: 13, background: 'var(--gray-50)', padding: 10, borderRadius: 8 }}>
                      <div>Delivery: ₦{Number(form.suggestedPrice).toLocaleString()}</div>
                      <div>VAT ({vatPercent}%): ₦{Math.round((Number(form.suggestedPrice) * vatPercent) / 100).toLocaleString()}</div>
                      <div>Platform commission (~{commissionPct}%): ₦{Math.round((Number(form.suggestedPrice) * commissionPct) / 100).toLocaleString()}</div>
                      <div style={{ fontWeight: 700, marginTop: 4 }}>Amount to transfer: ₦{Number(form.suggestedPrice).toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>VAT and commission are platform take from the delivery amount (rider share is reduced). You still transfer the full delivery price.</div>
                    </div>
                  )}
                </p>
                <div style={{ background: 'white', borderRadius: 10, padding: 16 }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Bank Name</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{bankDetails.bankName || '—'}</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Account Name</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{bankDetails.accountName || '—'}</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Account Number</div>
                    <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>{bankDetails.accountNumber || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Amount to Pay</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
                      ₦{Number(form.suggestedPrice).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Payment reference / note (optional)</label>
                <input
                  type="text"
                  name="paymentReference"
                  value={form.paymentReference}
                  onChange={handleChange}
                  placeholder="e.g. transfer ref or sender name"
                />
                <small style={{ color: 'var(--gray-500)', fontSize: 12 }}>Helps admin match your transfer.</small>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
                <input type="checkbox" checked={paymentConfirmed} onChange={(e) => setPaymentConfirmed(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18 }} />
                <span style={{ fontSize: 14 }}>
                  I confirm I have transferred ₦{Number(form.suggestedPrice).toLocaleString()} to the account above. My job will wait for admin approval before riders can offer.
                </span>
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>← Back</button>
                <button className="btn btn-primary" onClick={finishOrAuthGate} disabled={loading || !paymentConfirmed} style={{ flex: 2, opacity: paymentConfirmed ? 1 : 0.6 }}>
                  {loading ? 'Creating...' : isAuthenticated ? 'Confirm & Book Delivery' : 'Continue →'}
                </button>
              </div>
            </>
          )}

          {step === 4 && !isAuthenticated && (
            <>
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: 24, marginBottom: 20, textAlign: 'center' }}>
                <h3 style={{ fontSize: 18, marginBottom: 8 }}>Almost done!</h3>
                <p style={{ fontSize: 14, color: 'var(--gray-700)', marginBottom: 8 }}>
                  Create a free account or login to complete your booking.
                </p>
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                  Your details and photos are saved. The job will be created after you sign in.
                </p>
              </div>
              <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13 }}>
                <strong>Summary</strong>
                <div style={{ marginTop: 8 }}>Pickup: {form.pickupDescription.slice(0, 60)}…</div>
                <div>Drop-off: {form.dropoffDescription.slice(0, 60)}…</div>
                <div>Price: ₦{Number(form.suggestedPrice).toLocaleString()} · {form.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cash'}</div>
                <div>Photos: {(form.pickupPhotos?.length || 0) + (form.dropoffPhotos?.length || 0)}</div>
              </div>
              <button className="btn btn-primary btn-block" onClick={goToRegister} style={{ marginBottom: 12 }}>I am new – Create Account</button>
              <button className="btn btn-secondary btn-block" onClick={goToLogin}>I already have an account – Login</button>
              <button type="button" onClick={() => setStep(form.paymentMethod === 'bank_transfer' ? 3 : 2)} style={{ background: 'none', width: '100%', marginTop: 16, color: 'var(--gray-500)', fontSize: 14 }}>
                ← Back to edit details
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDelivery;
