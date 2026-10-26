import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import RoleNavbar from '../../components/RoleNavbar';
import { uploadFile } from '../../services/upload';

const BikeDetails = () => {
  const { id } = useParams();
  const [bike, setBike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [documentUrls, setDocumentUrls] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/merchant/bikes');
      const list = res.data.bikes || [];
      const found = list.find((b) => String(b._id) === String(id));
      if (!found) {
        setError('Bike not found');
        setBike(null);
      } else {
        setBike(found);
        setPhotoUrls(found.photoUrls || []);
        setDocumentUrls(found.documentUrls || []);
        setVideoUrl(found.videoUrl || '');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load bike');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onPhotos = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    if (!files.length) return;
    setUploading(true);
    setMsg('');
    try {
      const urls = [];
      for (const file of files) {
        const url = await uploadFile(file, 'zumadash/merchant/bike');
        if (url) urls.push(url);
      }
      setPhotoUrls((prev) => [...prev, ...urls].slice(0, 10));
    } catch (err) {
      setMsg(err.response?.data?.message || err.message || 'Photo upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onDocs = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    if (!files.length) return;
    setUploading(true);
    setMsg('');
    try {
      const urls = [];
      for (const file of files) {
        // Same folder/path pattern as AddFleet / RiderApply for documents (PDF + images)
        const url = await uploadFile(file, 'zumadash/merchant/docs');
        if (url) urls.push(url);
      }
      setDocumentUrls((prev) => [...prev, ...urls].slice(0, 10));
    } catch (err) {
      setMsg(err.response?.data?.message || err.message || 'Document upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg('');
    try {
      const url = await uploadFile(file, 'zumadash/merchant/bike-video');
      if (url) setVideoUrl(url);
    } catch (err) {
      setMsg(err.response?.data?.message || err.message || 'Video upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submitReupload = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await api.put(`/api/merchant/bikes/${id}/documents`, {
        photoUrls,
        documentUrls,
        videoUrl,
      });
      setMsg(res.data.message || 'Submitted for review');
      await load();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  const canReupload = !!(bike?.canEditDocuments || bike?.reuploadRequired);
  const underReview = bike?.reuploadStatus === 'under_review' && !canReupload;


  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RoleNavbar />
      {uploading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          Uploading… please wait
        </div>
      )}
      <div className="container" style={{ padding: '24px 16px', maxWidth: 640 }}>
        <Link to="/merchant" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}>
          ← Dashboard
        </Link>
        <h1 style={{ fontSize: 22, margin: '12px 0 16px' }}>Bike details</h1>

        {loading && <p style={{ color: 'var(--gray-500)' }}>Loading…</p>}
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        {msg && (
          <div
            style={{
              background: '#e0f2fe',
              color: '#075985',
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            {msg}
          </div>
        )}

        {!loading && bike && (
          <>
            <div className="card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <h2 style={{ fontSize: 18, margin: 0 }}>{bike.label || bike.plateNumber}</h2>
                {canReupload && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: '#fef3c7',
                      color: '#92400e',
                    }}
                  >
                    Re-upload required
                  </span>
                )}
                {underReview && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: '#dbeafe',
                      color: '#1e40af',
                    }}
                  >
                    Under review
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14, color: 'var(--gray-700)', marginTop: 8 }}>
                <div>
                  <strong>Plate:</strong> {bike.plateNumber || '—'}
                </div>
                <div style={{ marginTop: 4 }}>
                  <strong>Model:</strong> {bike.model || '—'}
                </div>
                <div style={{ marginTop: 4 }}>
                  <strong>Color:</strong> {bike.color || '—'}
                </div>
                {bike.assignedRider && (
                  <div style={{ marginTop: 4 }}>
                    <strong>Assigned rider:</strong> {bike.assignedRider.name || bike.assignedRider.email}
                    {bike.assignedRider.demotedFromRider ? ' (suspended until docs approved)' : ''}
                  </div>
                )}
              </div>
              {bike.reuploadNote && (
                <p style={{ fontSize: 13, color: '#92400e', marginTop: 10, marginBottom: 0 }}>
                  Admin note: {bike.reuploadNote}
                </p>
              )}
            </div>

            <div className="card" style={{ padding: 16, marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>Photos</h3>
              {photoUrls.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No photos</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  {photoUrls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img
                        src={u}
                        alt=""
                        style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10 }}
                      />
                    </a>
                  ))}
                </div>
              )}
              {canReupload && (
                <label
                  className="btn btn-secondary"
                  style={{ fontSize: 13, cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}
                >
                  {uploading ? 'Uploading…' : 'Add photos'}
                  <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={onPhotos} />
                </label>
              )}
            </div>

            <div className="card" style={{ padding: 16, marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>Video</h3>
              {!videoUrl ? (
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No video</p>
              ) : (
                <video
                  controls
                  src={videoUrl}
                  style={{ width: '100%', maxWidth: 480, borderRadius: 10, marginBottom: 10 }}
                />
              )}
              {canReupload && (
                <label
                  className="btn btn-secondary"
                  style={{ fontSize: 13, cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}
                >
                  {uploading ? 'Uploading…' : 'Replace video'}
                  <input type="file" accept="video/*" hidden disabled={uploading} onChange={onVideo} />
                </label>
              )}
            </div>

            <div className="card" style={{ padding: 16, marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>Documents (PDF / files)</h3>
              {documentUrls.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No documents</p>
              ) : (
                <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 14 }}>
                  {documentUrls.map((u, i) => (
                    <li key={u} style={{ marginBottom: 8 }}>
                      <a href={u} target="_blank" rel="noreferrer">
                        Document {i + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {canReupload && (
                <label
                  className="btn btn-secondary"
                  style={{ fontSize: 13, cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}
                >
                  {uploading ? 'Uploading…' : 'Add documents'}
                  <input
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                    multiple
                    hidden
                    disabled={uploading}
                    onChange={onDocs}
                  />
                </label>
              )}
            </div>

            {canReupload && (
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={busy || uploading}
                onClick={submitReupload}
              >
                {busy ? 'Submitting…' : 'Submit re-upload for admin review'}
              </button>
            )}

            {!canReupload && (
              <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                {underReview
                  ? 'Documents submitted and under review. Fields stay locked until admin rejects or requests another re-upload.'
                  : 'Documents are view-only. Upload unlocks after admin requests a re-upload for this bike.'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BikeDetails;
