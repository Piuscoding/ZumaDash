import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RiderNavbar from '../../components/RiderNavbar';
import api from '../../services/api';

const AvailableJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offerAmount, setOfferAmount] = useState({});
  const [offerNote, setOfferNote] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [message, setMessage] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/api/jobs/available');
      setJobs(res.data.jobs || []);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleOffer = async (jobId, suggested) => {
    const amount = offerAmount[jobId] || suggested;
    setSubmitting(jobId);
    setMessage('');
    try {
      await api.post(`/api/jobs/${jobId}/offer`, {
        amount: Number(amount),
        message: offerNote[jobId] || '',
      });
      setMessage('Offer submitted successfully!');
      fetchJobs();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit offer');
    } finally {
      setSubmitting(null);
    }
  };

  const handleAccept = async (jobId) => {
    setSubmitting(jobId);
    setMessage('');
    try {
      const res = await api.post(`/api/jobs/${jobId}/accept-price`);
      setMessage(res.data.message || 'Job accepted!');
      fetchJobs();
      if (res.data.job?._id) {
        // optional: could navigate to track
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to accept job');
    } finally {
      setSubmitting(null);
    }
  };

  const openDetail = async (jobId) => {
    setDetailId(jobId);
    try {
      const res = await api.get(`/api/jobs/${jobId}`);
      setDetail(res.data.job || res.data);
    } catch (err) {
      setDetail({ error: err.response?.data?.message || 'Could not load details' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RiderNavbar />

      <div className="container" style={{ padding: '24px 16px', maxWidth: 700 }}>
        {message && (
          <div
            style={{
              background: message.toLowerCase().includes('success') || message.toLowerCase().includes('accepted')
                ? '#dcfce7'
                : '#fee2e2',
              color: message.toLowerCase().includes('success') || message.toLowerCase().includes('accepted')
                ? '#166534'
                : '#991b1b',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {message}
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Loading available jobs...</p>
        ) : jobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--gray-500)' }}>No open jobs at the moment. Check back soon.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {jobs.map((job) => (
              <div key={job._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <span className="badge badge-warning">{job.packageSize || 'Package'}</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => openDetail(job._id)}
                  >
                    View details
                  </button>
                </div>
                <p style={{ fontSize: 14, marginBottom: 4 }}>
                  <strong>Pickup:</strong> {job.pickup?.description}
                </p>
                <p style={{ fontSize: 14, marginBottom: 8 }}>
                  <strong>Drop-off:</strong> {job.dropoff?.description}
                </p>
                {job.packageDescription && (
                  <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 8 }}>{job.packageDescription}</p>
                )}
                <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--primary)' }}>
                  Suggested: ₦{(job.suggestedPrice || 0).toLocaleString()}
                </p>
                {(job.bookingVoiceNote || job.bookingVideo || (job.pickup?.photos || []).length > 0) && (
                  <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>
                    Has media
                    {job.bookingVoiceNote ? ' · voice' : ''}
                    {job.bookingVideo ? ' · video' : ''}
                    {(job.pickup?.photos || []).length ? ` · ${job.pickup.photos.length} photo(s)` : ''}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAccept(job._id)}
                    disabled={submitting === job._id}
                    style={{ flex: 1, minWidth: 120 }}
                  >
                    {submitting === job._id ? '…' : 'Accept job'}
                  </button>
                </div>

                <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 10 }}>
                  <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>Or make a counter offer</p>
                  <input
                    type="number"
                    placeholder="Your offer (₦)"
                    value={offerAmount[job._id] ?? job.suggestedPrice}
                    onChange={(e) => setOfferAmount({ ...offerAmount, [job._id]: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--gray-200)', marginBottom: 8 }}
                  />
                  <input
                    type="text"
                    placeholder="Short note (optional)"
                    value={offerNote[job._id] || ''}
                    onChange={(e) => setOfferNote({ ...offerNote, [job._id]: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--gray-200)', marginBottom: 8 }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleOffer(job._id, job.suggestedPrice)}
                    disabled={submitting === job._id}
                    style={{ width: '100%' }}
                  >
                    {submitting === job._id ? '...' : 'Make offer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Package details modal (no track id / status) */}
        {detailId && (
          <div
            role="dialog"
            onClick={() => { setDetailId(null); setDetail(null); }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
          >
            <div
              className="card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 420, width: '100%', maxHeight: '85vh', overflow: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Package details</h3>
                <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => { setDetailId(null); setDetail(null); }}>Close</button>
              </div>
              {!detail && <p style={{ color: 'var(--gray-500)' }}>Loading…</p>}
              {detail?.error && <p style={{ color: 'var(--danger)' }}>{detail.error}</p>}
              {detail && !detail.error && (
                <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                  <div><strong>Size:</strong> {detail.packageSize || '—'}</div>
                  <div><strong>Description:</strong> {detail.packageDescription || '—'}</div>
                  <div><strong>Suggested:</strong> ₦{(detail.suggestedPrice || 0).toLocaleString()}</div>
                  <div><strong>Payment:</strong> {detail.paymentMethod === 'bank_transfer' ? 'Bank transfer' : 'Cash on delivery'}</div>
                  <div style={{ marginTop: 8 }}><strong>Pickup:</strong> {detail.pickup?.description}</div>
                  <div><strong>Drop-off:</strong> {detail.dropoff?.description}</div>
                  {(detail.pickup?.photos || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {detail.pickup.photos.map((u) => (
                        <img key={u} src={u} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                      ))}
                    </div>
                  )}
                  {(detail.dropoff?.photos || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {detail.dropoff.photos.map((u) => (
                        <img key={u} src={u} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                      ))}
                    </div>
                  )}
                  {detail.bookingVoiceNote && (
                    <audio controls src={detail.bookingVoiceNote} style={{ width: '100%', marginTop: 10 }} />
                  )}
                  {detail.bookingVideo && (
                    <video controls src={detail.bookingVideo} style={{ width: '100%', marginTop: 10, borderRadius: 8 }} />
                  )}
                  <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 12 }}>
                    Tracking ID and delivery status unlock after you accept the job.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableJobs;
