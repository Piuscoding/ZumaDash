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

/** Merchant applies for additional fleet bikes — same collapsible UX as Become a rider (fleet) */
const AddFleet = () => {
  const [numberOfBikes, setNumberOfBikes] = useState(1);
  const [bikes, setBikes] = useState([emptyBike()]);
  const [collapsedBikes, setCollapsedBikes] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const setBikeCount = (n) => {
    if (n === '' || n === null || n === undefined) {
      setNumberOfBikes('');
      return;
    }
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

  const uploadBikeFile = async (i, field, files, isDoc) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setUploading(true);
    setErr('');
    try {
      for (const file of list) {
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
      }
    } catch (e) {
      setErr(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
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
      await api.post('/api/merchant/add-fleet', {
        numberOfBikes,
        bikes: bikes.slice(0, numberOfBikes),
      });
      setMsg('Application submitted. Admin will review additional fleet bikes.');
      setBikes([emptyBike()]);
      setNumberOfBikes(1);
      setCollapsedBikes({});
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
        <Link to="/merchant" style={{ fontWeight: 600, color: 'var(--primary)' }}>
          ← Dashboard
        </Link>
        <div className="card" style={{ marginTop: 16, padding: 16 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Add more fleets</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
            Application type is fixed as <strong>Merchant / fleet</strong>. Enter how many bikes, then fill each bike
            section (collapse when done).
          </p>
          {msg && <p style={{ color: 'var(--success)', marginBottom: 12 }}>{msg}</p>}
          {err && <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{err}</p>}
          {uploading && (
            <p style={{ color: '#075985', fontSize: 13, marginBottom: 12 }}>Uploading…</p>
          )}

          <form onSubmit={submit}>
            <div className="form-group">
              <label>Application type</label>
              <select
                disabled
                value="merchant"
                style={{ width: '100%', padding: 10, borderRadius: 8, opacity: 0.8 }}
              >
                <option value="merchant">Merchant / fleet</option>
              </select>
            </div>

            <div className="form-group">
              <label>Number of bikes</label>
              <input
                type="number"
                min={1}
                max={20}
                value={numberOfBikes === '' || numberOfBikes == null ? '' : numberOfBikes}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') {
                    setNumberOfBikes('');
                    return;
                  }
                  const n = parseInt(v, 10);
                  if (!Number.isNaN(n)) setBikeCount(String(n));
                }}
                onBlur={() => {
                  if (numberOfBikes === '' || Number(numberOfBikes) < 1) setBikeCount('1');
                }}
              />
            </div>

            {bikes.slice(0, numberOfBikes).map((bike, index) => (
              <div
                key={index}
                style={{
                  marginTop: 16,
                  marginBottom: 8,
                  padding: 16,
                  border: '1px solid var(--gray-200)',
                  borderRadius: 12,
                  background: 'var(--gray-50)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: collapsedBikes[index] ? 0 : 12,
                  }}
                >
                  <h3 style={{ fontSize: 15, margin: 0 }}>
                    Bike {index + 1}
                    {bike.plateNumber ? ` · ${bike.plateNumber}` : ''}
                  </h3>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() =>
                      setCollapsedBikes((c) => ({ ...c, [index]: !c[index] }))
                    }
                  >
                    {collapsedBikes[index] ? 'Expand' : 'Collapse'}
                  </button>
                </div>

                {collapsedBikes[index] ? (
                  <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '8px 0 0' }}>
                    {(bike.photoUrls || []).length} photo(s) · {(bike.documentUrls || []).length} doc(s)
                    {bike.videoUrl ? ' · video' : ''} — tap Expand to edit
                  </p>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Label / name</label>
                      <input
                        value={bike.label}
                        onChange={(e) => updateBike(index, 'label', e.target.value)}
                        placeholder={`e.g. Unit ${index + 1}`}
                      />
                    </div>
                    <div className="form-group">
                      <label>Plate number *</label>
                      <input
                        required
                        value={bike.plateNumber}
                        onChange={(e) => updateBike(index, 'plateNumber', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Model</label>
                      <input
                        value={bike.model}
                        onChange={(e) => updateBike(index, 'model', e.target.value)}
                        placeholder="e.g. Bajaj Boxer"
                      />
                    </div>
                    <div className="form-group">
                      <label>Color</label>
                      <input
                        value={bike.color}
                        onChange={(e) => updateBike(index, 'color', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Photos (up to 5)</label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploading}
                        onChange={(e) => uploadBikeFile(index, 'photoUrls', e.target.files, false)}
                      />
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        {(bike.photoUrls || []).map((u) => (
                          <img
                            key={u}
                            src={u}
                            alt=""
                            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Documents (PDF / DOC)</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,image/*"
                        multiple
                        disabled={uploading}
                        onChange={(e) => uploadBikeFile(index, 'documentUrls', e.target.files, true)}
                      />
                      {(bike.documentUrls || []).length > 0 && (
                        <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                          {(bike.documentUrls || []).length} file(s) attached
                        </p>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Bike video (optional)</label>
                      <input
                        type="file"
                        accept="video/*"
                        disabled={uploading}
                        onChange={(e) => uploadBikeFile(index, 'videoUrl', e.target.files, false)}
                      />
                      {bike.videoUrl && (
                        <video
                          src={bike.videoUrl}
                          controls
                          style={{ width: '100%', marginTop: 8, borderRadius: 8, maxHeight: 200 }}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || uploading}
              style={{ width: '100%', marginTop: 16 }}
            >
              {loading ? 'Submitting…' : 'Submit additional fleet application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddFleet;
