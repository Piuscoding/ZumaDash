import { useBranding } from '../context/BrandingContext';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { uploadFile } from '../services/upload';

const emptyBike = () => ({
  label: '',
  plateNumber: '',
  model: '',
  color: '',
  photoUrls: [],
  documentUrls: [],
  videoUrl: '',
});

const RiderApply = () => {
  const { platformName } = useBranding();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    riderType: 'individual',
    nin: '',
    numberOfBikes: 1,
    // individual single-bike fields
    plateNumber: '',
    bikeModel: '',
    bikeColor: '',
    guarantorName: '',
    guarantorPhone: '',
    guarantorAddress: '',
  });
  const [fleetBikes, setFleetBikes] = useState([emptyBike()]);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [documentUrls, setDocumentUrls] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [collapsedBikes, setCollapsedBikes] = useState({}); // index -> true

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // When number of bikes changes, grow/shrink fleetBikes list
  useEffect(() => {
    if (form.riderType !== 'fleet') return;
    let n = parseInt(form.numberOfBikes, 10);
    if (!n || n < 1) n = 1;
    if (n > 20) n = 20;
    setFleetBikes((prev) => {
      if (prev.length === n) return prev;
      if (prev.length < n) {
        const next = [...prev];
        while (next.length < n) next.push(emptyBike());
        return next;
      }
      return prev.slice(0, n);
    });
  }, [form.numberOfBikes, form.riderType]);

  const updateFleetBike = (index, field, value) => {
    setFleetBikes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const uploadMany = async (files, folder) => {
    const urls = [];
    for (const file of files) {
      const url = await uploadFile(file, folder);
      urls.push(url);
    }
    return urls;
  };

  const onIndividualPhotos = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    if (!files.length || !isAuthenticated) return;
    setUploading(true);
    setError('');
    try {
      const urls = await uploadMany(files, 'zumadash/rider/bike-photos');
      setPhotoUrls((p) => [...p, ...urls].slice(0, 5));
    } catch (err) {
      setError(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onIndividualDocs = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    if (!files.length || !isAuthenticated) return;
    setUploading(true);
    setError('');
    try {
      const urls = await uploadMany(files, 'zumadash/rider/docs');
      setDocumentUrls((p) => [...p, ...urls].slice(0, 5));
    } catch (err) {
      setError(err.response?.data?.message || 'Document upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onIndividualVideo = async (e) => {
    const file = (e.target.files || [])[0];
    if (!file || !isAuthenticated) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadFile(file, 'zumadash/rider/bike-video');
      setVideoUrl(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Video upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onFleetPhotos = async (e, index) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    if (!files.length || !isAuthenticated) return;
    setUploading(true);
    setError('');
    try {
      const urls = await uploadMany(files, 'zumadash/merchant/bike-photos');
      setFleetBikes((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          photoUrls: [...(next[index].photoUrls || []), ...urls].slice(0, 5),
        };
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onFleetDocs = async (e, index) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    if (!files.length || !isAuthenticated) return;
    setUploading(true);
    setError('');
    try {
      const urls = await uploadMany(files, 'zumadash/merchant/docs');
      setFleetBikes((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          documentUrls: [...(next[index].documentUrls || []), ...urls].slice(0, 5),
        };
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Document upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onFleetVideo = async (e, index) => {
    const file = (e.target.files || [])[0];
    if (!file || !isAuthenticated) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadFile(file, 'zumadash/merchant/bike-video');
      updateFleetBike(index, 'videoUrl', url);
    } catch (err) {
      setError(err.response?.data?.message || 'Video upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (form.riderType === 'fleet') {
        const n = Math.min(20, Math.max(1, parseInt(form.numberOfBikes, 10) || 1));
        if (fleetBikes.length < n) {
          setError('Fill details for every bike');
          setLoading(false);
          return;
        }
        for (let i = 0; i < n; i++) {
          if (!fleetBikes[i].plateNumber?.trim()) {
            setError(`Bike ${i + 1}: plate number is required`);
            setLoading(false);
            return;
          }
        }
        const bikes = fleetBikes.slice(0, n).map((b, i) => ({
          label: b.label || b.plateNumber || `Bike ${i + 1}`,
          plateNumber: b.plateNumber.trim(),
          model: b.model || '',
          color: b.color || '',
          photoUrls: b.photoUrls || [],
          documentUrls: b.documentUrls || [],
          videoUrl: b.videoUrl || '',
          photoUrl: (b.photoUrls || [])[0] || '',
          papersUrl: (b.documentUrls || [])[0] || '',
        }));
        await api.post('/api/users/rider-application', {
          riderType: 'fleet',
          nin: form.nin,
          bikeDetails: bikes,
          fleetApplication: { numberOfBikes: n, bikes },
          guarantor: {
            name: form.guarantorName,
            phone: form.guarantorPhone,
            address: form.guarantorAddress,
          },
        });
      } else {
        await api.post('/api/users/rider-application', {
          riderType: 'individual',
          nin: form.nin,
          bikeDetails: [
            {
              plateNumber: form.plateNumber,
              model: form.bikeModel,
              color: form.bikeColor,
              photoUrl: photoUrls[0] || '',
              papersUrl: documentUrls[0] || '',
              photoUrls,
              documentUrls,
              videoUrl: videoUrl || '',
            },
          ],
          guarantor: {
            name: form.guarantorName,
            phone: form.guarantorPhone,
            address: form.guarantorAddress,
          },
        });
      }
      setMessage('Application submitted successfully! Admin will review and notify you.');
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', padding: '32px 16px' }}>
      <div className="container" style={{ maxWidth: 560 }}>
        <div style={{ marginBottom: 20 }}>
          <Link to="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            ← Home
          </Link>
        </div>
        <div className="card">
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Become a {platformName || 'ZumaDash'} Rider</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 24 }}>
            Individual or fleet. Fleet: enter how many bikes, then fill each bike section.
          </p>

          {!isAuthenticated && (
            <div style={{ background: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              You need an account first.{' '}
              <Link to="/register" style={{ fontWeight: 600 }}>Sign up</Link> or{' '}
              <Link to="/login" style={{ fontWeight: 600 }}>Login</Link>
            </div>
          )}

          {message && (
            <div style={{ background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 8, marginBottom: 16 }}>{message}</div>
          )}
          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>
          )}
          {uploading && (
            <div style={{ background: '#e0f2fe', color: '#075985', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
              Uploading…
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Application type</label>
              <select name="riderType" value={form.riderType} onChange={handleChange}>
                <option value="individual">Individual</option>
                <option value="fleet">Fleet / Merchant</option>
              </select>
            </div>
            <div className="form-group">
              <label>NIN</label>
              <input name="nin" value={form.nin} onChange={handleChange} required placeholder="National Identification Number" />
            </div>

            {form.riderType === 'fleet' && (
              <div className="form-group">
                <label>Number of bikes</label>
                <input
                  type="number"
                  name="numberOfBikes"
                  min={1}
                  max={20}
                  value={form.numberOfBikes}
                  onChange={handleChange}
                  required
                />
                <small style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                  Sections below update to match this number (1–20).
                </small>
              </div>
            )}

            {/* Individual: one bike */}
            {form.riderType === 'individual' && (
              <>
                <div className="form-group">
                  <label>Bike Plate Number</label>
                  <input name="plateNumber" value={form.plateNumber} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Bike Model</label>
                  <input name="bikeModel" value={form.bikeModel} onChange={handleChange} placeholder="e.g. Bajaj Boxer" />
                </div>
                <div className="form-group">
                  <label>Bike Color</label>
                  <input name="bikeColor" value={form.bikeColor} onChange={handleChange} />
                </div>
                <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--gray-200)' }} />
                <h3 style={{ fontSize: 15, marginBottom: 12 }}>Bike photos & documents</h3>
                <div className="form-group">
                  <label>Bike photos (up to 5)</label>
                  <input type="file" accept="image/*" multiple disabled={!isAuthenticated || uploading} onChange={onIndividualPhotos} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {photoUrls.map((u) => (
                      <img key={u} src={u} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Documents</label>
                  <input type="file" accept="image/*,application/pdf" multiple disabled={!isAuthenticated || uploading} onChange={onIndividualDocs} />
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>{documentUrls.length} file(s)</div>
                </div>
                <div className="form-group">
                  <label>Bike video (optional)</label>
                  <input type="file" accept="video/*" disabled={!isAuthenticated || uploading} onChange={onIndividualVideo} />
                  {videoUrl && <video src={videoUrl} controls style={{ width: '100%', marginTop: 8, borderRadius: 8, maxHeight: 200 }} />}
                </div>
              </>
            )}

            {/* Fleet: N bike sections */}
            {form.riderType === 'fleet' &&
              fleetBikes.map((bike, index) => (
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsedBikes[index] ? 0 : 12 }}>
                    <h3 style={{ fontSize: 15, margin: 0 }}>
                      Bike {index + 1}
                      {bike.plateNumber ? ` · ${bike.plateNumber}` : ''}
                    </h3>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => setCollapsedBikes((c) => ({ ...c, [index]: !c[index] }))}
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
                      onChange={(e) => updateFleetBike(index, 'label', e.target.value)}
                      placeholder={`e.g. Unit ${index + 1}`}
                    />
                  </div>
                  <div className="form-group">
                    <label>Plate number *</label>
                    <input
                      required
                      value={bike.plateNumber}
                      onChange={(e) => updateFleetBike(index, 'plateNumber', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Model</label>
                    <input value={bike.model} onChange={(e) => updateFleetBike(index, 'model', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Color</label>
                    <input value={bike.color} onChange={(e) => updateFleetBike(index, 'color', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Photos (up to 5)</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={!isAuthenticated || uploading}
                      onChange={(e) => onFleetPhotos(e, index)}
                    />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      {(bike.photoUrls || []).map((u) => (
                        <img key={u} src={u} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Documents</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      disabled={!isAuthenticated || uploading}
                      onChange={(e) => onFleetDocs(e, index)}
                    />
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{(bike.documentUrls || []).length} file(s)</div>
                  </div>
                  <div className="form-group">
                    <label>Video (optional)</label>
                    <input
                      type="file"
                      accept="video/*"
                      disabled={!isAuthenticated || uploading}
                      onChange={(e) => onFleetVideo(e, index)}
                    />
                    {bike.videoUrl && (
                      <video src={bike.videoUrl} controls style={{ width: '100%', marginTop: 8, borderRadius: 8, maxHeight: 180 }} />
                    )}
                  </div>
                  </>
                  )}
                </div>
              ))}

            <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--gray-200)' }} />
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Guarantor Details</h3>
            <div className="form-group">
              <label>Guarantor Full Name</label>
              <input name="guarantorName" value={form.guarantorName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Guarantor Phone</label>
              <input name="guarantorPhone" value={form.guarantorPhone} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Guarantor Address</label>
              <input name="guarantorAddress" value={form.guarantorAddress} onChange={handleChange} required />
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={loading || uploading || !isAuthenticated}>
              {loading ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RiderApply;
