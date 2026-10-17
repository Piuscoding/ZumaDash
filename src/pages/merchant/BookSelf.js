import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import MerchantNavbar from '../../components/MerchantNavbar';
import { useAuth } from '../../context/AuthContext';
import MapPicker from '../../components/map/MapPicker';
import { ensureLocationForMap } from '../../utils/geo';

const CORRIDOR_HINT = 'Must include one of: Dutse, Kubwa, Bwari, Ushafa';

function hasCorridor(text) {
  const t = String(text || '').toLowerCase();
  return ['dutse', 'kubwa', 'bwari', 'ushafa'].some((c) => t.includes(c));
}

/** Merchant books delivery of own goods — assign fleet rider; min ₦1500 */
const BookSelf = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [riders, setRiders] = useState([]);
  const [riderId, setRiderId] = useState('');
  const [mapEnabled, setMapEnabled] = useState(false);
  const [bookingMode, setBookingMode] = useState('text');
  const [mapTileUrl, setMapTileUrl] = useState('');
  const [pickupPin, setPickupPin] = useState(null);
  const [dropPin, setDropPin] = useState(null);
  const [form, setForm] = useState({
    pickupDescription: user?.address || '',
    dropoffDescription: '',
    packageSize: 'medium',
    packageDescription: '',
    suggestedPrice: 1500,
    paymentMethod: 'bank_transfer',
    paymentReference: '',
  });
  const [mapQuote, setMapQuote] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/merchant/riders').then((r) => {
      const list = (r.data.riders || []).filter((x) => !x.fleetFlags?.suspended);
      setRiders(list);
    }).catch(() => {});
    api.get('/api/map/config').then((r) => {
      setMapEnabled(!!r.data.mapBookingEnabled);
      setMapTileUrl(r.data.mapTileUrl || '');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.address) {
      setForm((f) => ({ ...f, pickupDescription: user.address }));
    }
  }, [user?.address]);

  const quoteMap = async (p, d) => {
    if (!p || !d) return;
    try {
      const res = await api.post('/api/map/quote', {
        pickupLat: p.lat,
        pickupLng: p.lng,
        dropLat: d.lat,
        dropLng: d.lng,
        packageSize: form.packageSize,
      });
      if (res.data.locationMode === 'map') {
        setMapQuote(res.data);
        const price = Math.max(1500, Number(res.data.suggestedPrice) || 1500);
        setForm((f) => ({ ...f, suggestedPrice: price }));
      } else {
        setMapQuote(null);
        setError(res.data.message || 'Pins must be inside the corridor for map mode');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Quote failed');
    }
  };

  const onMapPick = (field, latlng) => {
    if (field === 'pickup') {
      setPickupPin(latlng);
      if (dropPin) quoteMap(latlng, dropPin);
    } else {
      setDropPin(latlng);
      if (pickupPin) quoteMap(pickupPin, latlng);
    }
  };

  const canNext = () => {
    if (!riderId) return false;
    if (!hasCorridor(form.pickupDescription)) return false;
    if (!hasCorridor(form.dropoffDescription)) return false;
    if (Number(form.suggestedPrice) < 1500) return false;
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!canNext()) {
      setError('Select a rider, ensure addresses include a corridor name, and price ≥ ₦1,500');
      return;
    }
    if (bookingMode === 'text' && user?.address && form.pickupDescription.trim().toLowerCase() !== String(user.address).trim().toLowerCase()) {
      setError('Invalid pickup address — must match your profile address');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        riderId,
        pickup: {
          description: form.pickupDescription,
          coordinates: bookingMode === 'map' && pickupPin ? { lat: pickupPin.lat, lng: pickupPin.lng } : undefined,
        },
        dropoff: {
          description: form.dropoffDescription,
          coordinates: bookingMode === 'map' && dropPin ? { lat: dropPin.lat, lng: dropPin.lng } : undefined,
        },
        packageSize: form.packageSize,
        packageDescription: form.packageDescription,
        suggestedPrice: Math.max(1500, Number(form.suggestedPrice) || 1500),
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference || null,
        locationMode: bookingMode === 'map' && mapQuote?.locationMode === 'map' ? 'map' : 'text',
        mapDistanceKm: mapQuote?.mapDistanceKm,
        routeGeometry: mapQuote?.routeGeometry,
        osrmDurationSec: mapQuote?.osrmDurationSec,
        displayDurationSec: mapQuote?.displayDurationSec,
      };
      const res = await api.post('/api/merchant/book', payload);
      navigate(`/track/${res.data.job._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <MerchantNavbar />
      <div className="container" style={{ maxWidth: 560, padding: '20px 16px' }}>
        <Link to="/merchant" style={{ fontWeight: 600, color: 'var(--primary)' }}>← Dashboard</Link>
        <div className="card" style={{ marginTop: 16, padding: 16 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Book delivery (own goods)</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Min price ₦1,500 · Default commission 7.5% (+ VAT if set) · Assign a fleet rider</p>
          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Assign fleet rider *</label>
              <select required value={riderId} onChange={(e) => setRiderId(e.target.value)} style={{ width: '100%', padding: 10 }}>
                <option value="">— Select rider —</option>
                {riders.map((r) => (
                  <option key={r._id} value={r._id}>{r.name} · {r.phone || r.email}</option>
                ))}
              </select>
            </div>
            {mapEnabled && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button type="button" className="btn" style={{ background: bookingMode === 'map' ? 'var(--primary)' : '#fff', color: bookingMode === 'map' ? '#fff' : '#333' }}
                  onClick={async () => {
                    try {
                      await ensureLocationForMap('map booking');
                      setBookingMode('map');
                    } catch (e) {
                      setBookingMode('text');
                      setError(e.message);
                    }
                  }}>Map mode</button>
                <button type="button" className="btn" style={{ background: bookingMode === 'text' ? 'var(--primary)' : '#fff', color: bookingMode === 'text' ? '#fff' : '#333' }}
                  onClick={() => setBookingMode('text')}>Text mode</button>
              </div>
            )}
            {bookingMode === 'map' && (
              <MapPicker
                pickup={pickupPin}
                dropoff={dropPin}
                activeField="dropoff"
                onPick={onMapPick}
                tileUrl={mapTileUrl}
                height={240}
              />
            )}
            <div className="form-group">
              <label>Pickup address *</label>
              <textarea
                required
                readOnly={bookingMode === 'text'}
                value={form.pickupDescription}
                onChange={(e) => setForm({ ...form, pickupDescription: e.target.value })}
                rows={2}
                style={{ width: '100%', opacity: bookingMode === 'text' ? 0.85 : 1 }}
              />
              <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{bookingMode === 'text' ? 'Locked to your profile address' : CORRIDOR_HINT}</span>
            </div>
            <div className="form-group">
              <label>Drop-off address *</label>
              <textarea
                required
                value={form.dropoffDescription}
                onChange={(e) => setForm({ ...form, dropoffDescription: e.target.value })}
                rows={2}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: 11, color: hasCorridor(form.dropoffDescription) ? 'var(--success)' : 'var(--danger)' }}>{CORRIDOR_HINT}</span>
            </div>
            <div className="form-group">
              <label>Package size</label>
              <select value={form.packageSize} onChange={(e) => setForm({ ...form, packageSize: e.target.value })}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div className="form-group">
              <label>Price (₦) — min 1500</label>
              <input type="number" min={1500} value={form.suggestedPrice} onChange={(e) => setForm({ ...form, suggestedPrice: Math.max(1500, Number(e.target.value) || 1500) })} />
            </div>
            <div className="form-group">
              <label>Payment</label>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash on delivery</option>
              </select>
            </div>
            {form.paymentMethod === 'bank_transfer' && (
              <div className="form-group">
                <label>Payment reference</label>
                <input value={form.paymentReference} onChange={(e) => setForm({ ...form, paymentReference: e.target.value })} />
              </div>
            )}
            <button className="btn btn-primary" type="submit" disabled={loading || !canNext()} style={{ width: '100%' }}>
              {loading ? 'Booking…' : 'Book delivery'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookSelf;
