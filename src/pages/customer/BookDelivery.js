import { useBranding } from '../../context/BrandingContext';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AdminNavbar from '../../components/AdminNavbar';
import CustomerNavbar from '../../components/CustomerNavbar';
import api from '../../services/api';
import MapPicker from '../../components/map/MapPicker';
import { ensureLocationForMap } from '../../utils/geo';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { savePendingBooking, getPendingBooking } from '../../utils/pendingBooking';
import { uploadImage, uploadFile, fileToDataUrl, ensureCloudinaryUrl } from '../../services/upload';
// saved addresses loaded when authenticated

const CORRIDOR_HINT = 'Must include one of: Dutse, Kubwa, Bwari, Ushafa';

function hasCorridor(text) {
  const t = String(text || '').toLowerCase();
  return ['dutse', 'kubwa', 'bwari', 'ushafa'].some((c) => t.includes(c));
}

const BookDelivery = ({ adminMode = false } = {}) => {
  const { t } = useI18n();

  // Admin: book on behalf of a selected customer
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    if (!adminMode) return undefined;
    (async () => {
      try {
        const res = await api.get('/api/admin/customers');
        setCustomers(res.data.customers || []);
      } catch (_) {}
    })();
  }, [adminMode]);

  useEffect(() => {
    if (!adminMode || !selectedCustomerId) {
      setSelectedCustomer(null);
      return undefined;
    }
    const c = customers.find((x) => String(x._id) === String(selectedCustomerId));
    setSelectedCustomer(c || null);
  }, [adminMode, selectedCustomerId, customers]);

  const { platformName } = useBranding();
  const { user, isAuthenticated } = useAuth();
  const bookingUser = adminMode ? selectedCustomer : user;
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [vatPercent, setVatPercent] = useState(0);
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
  });
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [mapConfig, setMapConfig] = useState({ mapBookingEnabled: false, mapTileUrl: '' });
  const [pickupPin, setPickupPin] = useState(null);
  const [dropPin, setDropPin] = useState(null);
  const [mapQuote, setMapQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [bookingMode, setBookingMode] = useState('text'); // 'map' | 'text'
  const [priceError, setPriceError] = useState('');
  const [activeField, setActiveField] = useState('pickup'); // which field search/map fills
  const [searchQuery, setSearchQuery] = useState('');
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [mapTileUrl, setMapTileUrl] = useState('');
  const [flyTarget, setFlyTarget] = useState(null);
  const searchTimer = useRef(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [form, setForm] = useState({
    pickupDescription: '',
    dropoffDescription: '',
    packageSize: 'small',
    packageDescription: '',
    paymentMethod: 'bank_transfer',
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
        const vp = res.data.settings?.vatPercent != null ? Number(res.data.settings.vatPercent) : 0;
        setVatPercent(!Number.isNaN(vp) && vp > 0 ? vp : 0);
        if (res.data.settings?.mapBookingEnabled) {
          setMapConfig((c) => ({ ...c, mapBookingEnabled: true, mapTileUrl: res.data.settings.mapTileUrl || c.mapTileUrl }));
        }
      })
      .catch(() => {});
    api.get('/api/map/config')
      .then((res) => {
        const tile = res.data.mapTileUrl || '';
        setMapConfig({
          mapBookingEnabled: !!res.data.mapBookingEnabled,
          mapTileUrl: tile,
          mapStackDefault: res.data.mapStackDefault || '',
        });
        if (tile) setMapTileUrl(tile);
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

  const requestMapQuote = useCallback(async (pPin, dPin, size) => {
    if (!pPin || !dPin) {
      setMapQuote(null);
      return;
    }
    setQuoteLoading(true);
    try {
      const res = await api.post('/api/map/quote', {
        pickupLat: Number(pPin.lat),
        pickupLng: Number(pPin.lng),
        dropLat: Number(dPin.lat),
        dropLng: Number(dPin.lng),
        packageSize: size || form.packageSize,
      });
      const data = res.data || {};
      // Normalize: some proxies wrap payload
      const payload = data.locationMode ? data : (data.data || data);
      setMapQuote(payload);
      if (payload.locationMode === 'map' && payload.suggestedPrice != null) {
        setForm((f) => ({ ...f, suggestedPrice: payload.suggestedPrice }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Quote failed';
      setMapQuote({ locationMode: 'text', message: msg, success: false });
    } finally {
      setQuoteLoading(false);
    }
  }, [form.packageSize]);

  // Whenever both pins exist in map mode, fetch route + admin price formula
  useEffect(() => {
    if (bookingMode !== 'map') return;
    if (!pickupPin || !dropPin) return;
    requestMapQuote(pickupPin, dropPin, form.packageSize);
  }, [bookingMode, pickupPin, dropPin, form.packageSize, requestMapQuote]);

  const applyPin = useCallback((field, pin, description) => {
    if (!pin || pin.lat == null || pin.lng == null) return;
    const normalized = { lat: Number(pin.lat), lng: Number(pin.lng) };
    if (field === 'pickup') {
      setPickupPin(normalized);
      if (description) setForm((f) => ({ ...f, pickupDescription: description }));
    } else {
      setDropPin(normalized);
      if (description) setForm((f) => ({ ...f, dropoffDescription: description }));
    }
    setFlyTarget(normalized);
  }, []);

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

  useEffect(() => {
    api.get('/api/map/tile-config').then((r) => {
      if (r.data?.tileUrl) setMapTileUrl(r.data.tileUrl);
    }).catch(() => {});
  }, []);

  // Live search suggestions (Mapbox primary via backend, Nominatim fallback)
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
    paymentMethod: (form.paymentMethod === 'cash' && bookingUser?.kycStatus !== 'approved') ? 'bank_transfer' : form.paymentMethod,
    suggestedPrice: Number(form.suggestedPrice),
        locationMode: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? 'map' : 'text',
        mapDistanceKm: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? mapQuote.mapDistanceKm : undefined,
        routeGeometry: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? mapQuote.routeGeometry : undefined,
        osrmDurationSec: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? mapQuote.osrmDurationSec : undefined,
        displayDurationSec: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? mapQuote.displayDurationSec : undefined,
    distanceBand: 'same_zone',
    contactName: (adminMode ? bookingUser?.name : user?.name) || '',
    contactPhone: (adminMode ? bookingUser?.phone : user?.phone) || '',
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
          contactName: (adminMode ? bookingUser?.name : user?.name),
          contactPhone: (adminMode ? bookingUser?.phone : user?.phone),
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
        bookingVoiceNote: (() => {
          const v = form.bookingVoiceNote;
          if (typeof v !== 'string' || !v.trim()) return null;
          if (v.startsWith('data:') || v.startsWith('blob:')) return null;
          return v;
        })(),
        bookingVideo: (() => {
          const v = form.bookingVideo;
          if (typeof v !== 'string' || !v.trim()) return null;
          if (v.startsWith('data:') || v.startsWith('blob:')) return null;
          return v;
        })(),
      };

      let res;
      if (adminMode) {
        if (!selectedCustomerId) {
          setError('Select a customer first');
          setLoading(false);
          return;
        }
        res = await api.post('/api/admin/jobs', { ...payload, customerId: selectedCustomerId });
      } else {
        res = await api.post('/api/jobs', payload);
      }
      const job = res.data.job;
      navigate(`/track/${job._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create delivery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goNextFromStep2 = () => {
    if (!adminMode) {
      const price = Number(form.suggestedPrice);
      // Text mode only: hard minimum ₦1,500. Map mode may use admin formula below ₦1,500.
      if (bookingMode !== 'map') {
        if (Number.isNaN(price) || price < 1500) {
          setPriceError('Price cannot go below ₦1,500');
          return;
        }
      } else if (Number.isNaN(price) || price <= 0) {
        setPriceError('Enter a valid price');
        return;
      }
    }
    setPriceError('');
    // Bank transfer and COD both go to step 3 (payment / cost summary)
    setPaymentConfirmed(false);
    setStep(3);
  };

  const finishOrAuthGate = () => {
    if (adminMode) {
      createJobNow();
      return;
    }
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


  const startVoiceRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const localUrl = URL.createObjectURL(blob);
        // Immediate playback while Cloudinary upload runs
        setForm((f) => ({ ...f, bookingVoiceNote: localUrl }));
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        try {
          setUploading(true);
          // Must use uploadFile(File) — ensureCloudinaryUrl expects a data: URL string
          const url = await uploadFile(file, 'zumadash/booking/voice');
          if (url && typeof url === 'string') {
            try { URL.revokeObjectURL(localUrl); } catch (_) {}
            setForm((f) => ({ ...f, bookingVoiceNote: url }));
          }
        } catch (err) {
          console.error(err);
          // keep local blob so user can still hear it; block submit until re-record/upload
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


  const payBaseAmount = Math.max(0, Number(form.suggestedPrice) || 0);
  const payVatAmount = vatPercent > 0 ? Math.round((payBaseAmount * vatPercent) / 100) : 0;
  const payTotalAmount = payBaseAmount + payVatAmount;


  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', padding: '24px 16px' }}>
      {adminMode ? <AdminNavbar /> : <CustomerNavbar />}
      <div className="container" style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to={backLink} style={{ color: 'var(--primary)', fontWeight: 600 }}>
            ← {isAuthenticated ? 'Dashboard' : 'Home'}
          </Link>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>⛰ {platformName}</span>
        </div>

        <div className="card">
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>{adminMode ? 'Book for customer' : 'Book a Delivery'}</h1>
          {adminMode && (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Select customer *</label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                style={{ width: '100%', padding: 10, borderRadius: 8 }}
              >
                <option value="">— Choose customer —</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} · {c.phone || c.email}
                    {c.kycStatus === 'approved' ? ' · KYC OK' : ' · KYC pending'}
                  </option>
                ))}
              </select>
              {selectedCustomer && (
                <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>
                  KYC: {selectedCustomer.kycStatus || 'none'} — COD {selectedCustomer.kycStatus === 'approved' ? 'allowed' : 'not allowed'}
                </p>
              )}
            </div>
          )}
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 8 }}>
            {t('book.corridorOnly')}
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
                    onClick={async () => {
                      try {
                        setSearchError('');
                        await ensureLocationForMap('map booking');
                        setBookingMode('map');
                      } catch (e) {
                        setBookingMode('text');
                        setSearchError(e.message || 'Location required for map mode. Switched to text mode.');
                        alert(e.message || 'Enable device location to use map mode.');
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

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setMapFullscreen(true)}>
                      Fullscreen map
                    </button>
                  </div>
                  <MapPicker
                    pickup={pickupPin}
                    dropoff={dropPin}
                    activeField={activeField}
                    onPick={onMapPick}
                    flyTarget={flyTarget}
                    tileUrl={mapTileUrl || mapConfig.mapTileUrl || ''}
                    height={260}
                    label="Map — tap to place pin for the active field"
                  />

                  {(pickupPin || dropPin) && (
                    <p style={{ fontSize: 12, marginTop: 8, color: 'var(--gray-600)' }}>
                      {pickupPin ? 'Pickup pin set' : 'Pickup pin missing'}
                      {' · '}
                      {dropPin ? 'Drop-off pin set' : 'Drop-off pin missing'}
                      {quoteLoading ? ' · calculating price…' : ''}
                    </p>
                  )}
                  {quoteLoading && (
                    <p style={{ fontSize: 12, marginTop: 8, fontWeight: 600 }}>Calculating route &amp; price…</p>
                  )}
                  {!quoteLoading && mapQuote?.locationMode === 'map' && (
                    <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 10, background: '#ecfdf5', border: '1px solid #6ee7b7' }}>
                      <p style={{ fontSize: 14, margin: 0, color: '#065f46', fontWeight: 600, lineHeight: 1.5 }}>
                        Delivery route:{' '}
                        {Number(mapQuote.mapDistanceKm || 0).toFixed(2)} km
                        {mapQuote.displayDurationSec
                          ? ` · ETA ~${Math.round((mapQuote.displayDurationSec || 0) / 60)} min`
                          : ''}
                        {' · '}
                        <span style={{ fontWeight: 800 }}>₦{Number(mapQuote.suggestedPrice || 0).toLocaleString()}</span>
                      </p>
                    </div>
                  )}
                  {!quoteLoading && mapQuote && mapQuote.locationMode !== 'map' && pickupPin && dropPin && (
                    <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: '#fff7ed', border: '1px solid #fdba74', fontSize: 13, color: '#9a3412' }}>
                      {mapQuote.message || 'Could not get map price for these pins (outside corridor or routing unavailable). Use text pricing or move pins.'}
                    </div>
                  )}
                  {!quoteLoading && !mapQuote && pickupPin && dropPin && (
                    <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', fontSize: 13, color: '#991b1b' }}>
                      No quote returned. Check that the backend is running and /api/map/quote succeeds in Network tab.
                    </div>
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
                  placeholder="e.g. Dutse Alhaji, Ushafa village, near the market, red roof house"
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
                onClick={() => {
                  if (!hasCorridor(form.pickupDescription)) {
                    setError('Invalid pickup address — must include Dutse, Kubwa, Bwari or Ushafa');
                    return;
                  }
                  if (!hasCorridor(form.dropoffDescription)) {
                    setError('Invalid drop-off address — must include Dutse, Kubwa, Bwari or Ushafa');
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
                disabled={
                  !form.pickupDescription ||
                  !form.dropoffDescription ||
                  uploading ||
                  !hasCorridor(form.pickupDescription) ||
                  !hasCorridor(form.dropoffDescription)
                }
              >
                Next →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              
              <div className="form-group">
                <label>{t ? t('book.voiceNote') : 'Voice note (optional)'}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  {!isRecording ? (
                    <button type="button" className="btn btn-secondary" disabled={uploading || !!form.bookingVoiceNote} onClick={startVoiceRecord} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span aria-hidden style={{ fontSize: 16 }}>🎤</span> {t ? t('book.recordVoice') : 'Record voice note'}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={stopVoiceRecord} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span aria-hidden>⏹</span> {t ? t('book.stopRecord') : 'Stop recording'}
                    </button>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{t ? t('book.orUpload') : 'or upload a file'}</span>
                </div>
                <input type="file" accept="audio/*" disabled={uploading || isRecording || !!form.bookingVoiceNote} onChange={(e) => handleMediaFile(e, 'bookingVoiceNote', 'voice')} />
                <small style={{ color: 'var(--gray-500)', fontSize: 12 }}>Short audio for landmarks / instructions.</small>
                {form.bookingVoiceNote && (
                  <div style={{ marginTop: 8 }}>
                    <audio controls src={form.bookingVoiceNote} style={{ width: '100%', maxWidth: 320 }} />
                    <button type="button" className="btn btn-secondary" style={{ marginTop: 6, padding: '4px 10px', fontSize: 12 }} onClick={() => setForm((f) => {
                      if (f.bookingVoiceNote && String(f.bookingVoiceNote).startsWith('blob:')) {
                        try { URL.revokeObjectURL(f.bookingVoiceNote); } catch (_) {}
                      }
                      return { ...f, bookingVoiceNote: '' };
                    })}>Remove</button>
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
                <input
                  type="number"
                  name="suggestedPrice"
                  value={form.suggestedPrice}
                  onChange={(e) => {
                    setPriceError('');
                    handleChange(e);
                  }}
                  min={adminMode ? 1 : 1}
                />
                {priceError ? (
                  <small style={{ color: 'var(--danger)', fontSize: 12, display: 'block', marginTop: 4 }}>{priceError}</small>
                ) : (
                  <small style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                    {bookingMode === 'map' && mapQuote?.locationMode === 'map'
                      ? 'Suggested from map distance. You can adjust; riders can still offer.'
                      : adminMode
                        ? 'Admin booking — no minimum enforced here.'
                        : 'Minimum ₦1,500 in text mode. You can edit this amount.'}
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select
                  name="paymentMethod"
                  value={form.paymentMethod === 'cash' && bookingUser?.kycStatus !== 'approved' ? 'bank_transfer' : form.paymentMethod}
                  onChange={(e) => {
                    if (e.target.value === 'cash' && bookingUser?.kycStatus !== 'approved') return;
                    handleChange(e);
                  }}
                >
                  {bookingUser?.kycStatus === 'approved' && <option value="cash">Cash on Delivery</option>}
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
                {bookingUser?.kycStatus !== 'approved' && (
                  <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>
                    Cash on Delivery needs approved KYC.{' '}
                    <a href="/settings" style={{ color: 'var(--primary)', fontWeight: 600 }}>Complete KYC in Settings</a>.
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>← Back</button>
                <button className="btn btn-primary" onClick={goNextFromStep2} disabled={loading || uploading} style={{ flex: 2 }}>
                  Confirm details →
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              {form.paymentMethod === 'bank_transfer' ? (
              <div style={{ background: 'var(--primary-light)', border: '1px solid #86efac', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: 'var(--primary-dark)' }}>Bank Transfer Details</h3>
                <p style={{ fontSize: 13, color: 'var(--gray-700)', marginBottom: 16 }}>
                  Transfer <strong>₦{payTotalAmount.toLocaleString()}</strong> to the account below.
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
                  <div style={{ marginBottom: payVatAmount > 0 ? 10 : 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Amount</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      ₦{payBaseAmount.toLocaleString()}
                    </div>
                  </div>
                  {payVatAmount > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>VAT ({vatPercent}%)</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>
                        ₦{payVatAmount.toLocaleString()}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Total to pay</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
                      ₦{payTotalAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              ) : (
              <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: '#c2410c' }}>Cash on delivery — cost summary</h3>
                <p style={{ fontSize: 13, color: 'var(--gray-700)', marginBottom: 16 }}>
                  Confirm the amounts below. You will pay the rider in cash when the delivery completes.
                  {vatPercent > 0 ? ` VAT is ${vatPercent}% on the delivery amount.` : ''}
                </p>
                <div style={{ background: 'white', borderRadius: 10, padding: 16 }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Amount</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>₦{payBaseAmount.toLocaleString()}</div>
                  </div>
                  {payVatAmount > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>VAT ({vatPercent}%)</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>₦{payVatAmount.toLocaleString()}</div>
                    </div>
                  )}
                  <div style={{ borderTop: payVatAmount > 0 ? '1px solid #e2e8f0' : 'none', paddingTop: payVatAmount > 0 ? 10 : 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Total to pay (cash)</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#c2410c' }}>
                      ₦{payTotalAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              )}
              {form.paymentMethod === 'bank_transfer' && (
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
              )}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
                <input type="checkbox" checked={paymentConfirmed} onChange={(e) => setPaymentConfirmed(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18 }} />
                <span style={{ fontSize: 14 }}>
                  {form.paymentMethod === 'bank_transfer'
                    ? `I confirm I have transferred ₦${payTotalAmount.toLocaleString()} to the account above. My job will wait for admin approval before riders can offer.`
                    : `I confirm the delivery total is ₦${payTotalAmount.toLocaleString()} (cash on delivery).`}
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
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10000, display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setActiveField('pickup')}>Pickup</button>
            <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setActiveField('dropoff')}>Drop-off</button>
          </div>
          <MapPicker
            pickup={pickupPin}
            dropoff={dropPin}
            activeField={activeField}
            onPick={onMapPick}
            flyTarget={flyTarget}
            tileUrl={mapTileUrl || mapConfig.mapTileUrl || ''}
            height="100vh"
            label=""
          />
        </div>
      )}
    </div>
  );
};

export default BookDelivery;
