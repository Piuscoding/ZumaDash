import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import MerchantNavbar from '../../components/MerchantNavbar';
import { uploadFile } from '../../services/upload';

const emptyBike = () => ({
  label: '',
  plateNumber: '',
  model: '',
  color: '',
  photoUrls: [],
  documentUrls: [],
  videoUrl: '',
});

/** Merchant applies for additional fleet bikes — application type fixed as merchant/fleet */
const AddFleet = () => {
  const [numberOfBikes, setNumberOfBikes] = useState(1);
  const [bikes, setBikes] = useState([emptyBike()]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const setBikeCount = (n) => {
    const c = Math.min(20, Math.max(1, parseInt(n, 10) || 1));
    setNumberOfBikes(c);
    setBikes((prev) => {
      const next = [...prev];
      while (next.length < c) next.push(emptyBike());
      return next.slice(0, c);
    });
  };

  const updateBike = (i, key, val) => {
    setBikes((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: val };
      return next;
    });
  };

  const uploadBikeFile = async (i, field, file, isDoc) => {
    if (!file) return;
    try {
      const url = await uploadFile(file, isDoc ? 'zumadash/merchant/docs' : 'zumadash/merchant/bike');
      setBikes((prev) => {
        const next = [...prev];
        if (field === 'photoUrls' || field === 'documentUrls') {
          next[i] = { ...next[i], [field]: [...(next[i][field] || []), url] };
        } else {
          next[i] = { ...next[i], [field]: url };
        }
        return next;
      });
    } catch (e) {
      setErr(e.response?.data?.message || 'Upload failed');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    setMsg('');
    try {
      for (let i = 0; i < numberOfBikes; i++) {
        if (!bikes[i].plateNumber?.trim()) {
          setErr(`Bike ${i + 1}: plate number required`);
          setLoading(false);
          return;
        }
      }
      await api.post('/api/merchant/fleet-application', {
        riderType: 'fleet',
        numberOfBikes,
        bikes: bikes.slice(0, numberOfBikes),
      });
      setMsg('Application submitted. Admin will review additional fleet bikes.');
      setBikes([emptyBike()]);
      setNumberOfBikes(1);
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Submit failed');
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
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Add more fleets</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
            Application type: <strong>Merchant / fleet</strong> (fixed). Submit extra bikes for admin approval.
          </p>
          {msg && <p style={{ color: 'var(--success)' }}>{msg}</p>}
          {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Application type</label>
              <select disabled value="merchant" style={{ width: '100%', padding: 10, borderRadius: 8, opacity: 0.8 }}>
                <option value="merchant">Merchant / fleet</option>
              </select>
            </div>
            <div className="form-group">
              <label>Number of bikes</label>
              <input type="number" min={1} max={20} value={numberOfBikes} onChange={(e) => setBikeCount(e.target.value)} />
            </div>
            {bikes.slice(0, numberOfBikes).map((b, i) => (
              <div key={i} style={{ marginBottom: 16, padding: 12, border: '1px solid var(--gray-200)', borderRadius: 10 }}>
                <strong>Bike {i + 1}</strong>
                <div className="form-group"><label>Plate</label><input required value={b.plateNumber} onChange={(e) => updateBike(i, 'plateNumber', e.target.value)} /></div>
                <div className="form-group"><label>Model</label><input value={b.model} onChange={(e) => updateBike(i, 'model', e.target.value)} /></div>
                <div className="form-group"><label>Color</label><input value={b.color} onChange={(e) => updateBike(i, 'color', e.target.value)} /></div>
                <div className="form-group">
                  <label>Photo</label>
                  <input type="file" accept="image/*" onChange={(e) => uploadBikeFile(i, 'photoUrls', e.target.files?.[0], false)} />
                </div>
                <div className="form-group">
                  <label>Documents (PDF)</label>
                  <input type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={(e) => uploadBikeFile(i, 'documentUrls', e.target.files?.[0], true)} />
                </div>
              </div>
            ))}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Submitting…' : 'Submit for approval'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddFleet;
