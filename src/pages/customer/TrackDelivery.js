import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RoleNavbar from '../../components/RoleNavbar';
import api from '../../services/api';
import { uploadImage } from '../../services/upload';

const statusSteps = ['pending_offers', 'accepted', 'live', 'picked', 'delivered', 'completed'];

const TrackDelivery = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  const fetchJob = async () => {
    try {
      const res = await api.get(`/api/jobs/${id}`);
      setJob(res.data.job);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load job');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  const onProofSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const updateStatus = async (status) => {
    setActionLoading(true);
    setMessage('');
    try {
      let photoUrl = null;
      // Require photo for live, picked, delivered
      if (['live', 'picked', 'delivered'].includes(status)) {
        if (!proofFile) {
          setMessage('Please attach a proof photo before updating status.');
          setActionLoading(false);
          return;
        }
        photoUrl = await uploadImage(proofFile, `zumadash/proof/${status}`);
      }

      await api.put(`/api/jobs/${id}/status`, { status, photo: photoUrl });
      setMessage(`Status updated to ${status}`);
      setProofFile(null);
      setProofPreview(null);
      fetchJob();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const acceptOffer = async (offerId) => {
    setActionLoading(true);
    try {
      await api.post(`/api/jobs/${id}/accept-offer`, { offerId });
      setMessage('Offer accepted! Rider assigned.');
      fetchJob();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to accept offer');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;
  if (!job) return null;

  const currentIdx = statusSteps.indexOf(job.status);
  const riderId = job.rider?._id || job.rider;
  const isRider = user?.role === 'rider' && String(riderId) === String(user?.id || user?._id);
  const isCustomer = user?.role === 'customer';

  const PhotoThumbs = ({ photos, label }) => {
    if (!photos || !photos.length) return null;
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>{label}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {photos.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RoleNavbar />
      <div className="container" style={{ maxWidth: 640, padding: '20px 16px' }}>
        <div style={{ marginBottom: 16 }}>
          <Link to={user?.role === 'rider' ? '/rider' : '/dashboard'} style={{ color: 'var(--primary)', fontWeight: 600 }}>
            ← Back
          </Link>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h1 style={{ fontSize: 20 }}>{job.jobId}</h1>
            <span className="badge badge-info">{job.status.replace('_', ' ')}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
            {statusSteps.slice(0, 5).map((s, i) => (
              <div key={s} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', margin: '0 auto 6px',
                  background: i <= currentIdx ? 'var(--primary)' : 'var(--gray-200)',
                  color: i <= currentIdx ? 'white' : 'var(--gray-500)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 10, color: i <= currentIdx ? 'var(--primary)' : 'var(--gray-500)', textTransform: 'capitalize' }}>
                  {s.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Pickup</p>
            <p style={{ fontSize: 15 }}>{job.pickup?.description}</p>
            <PhotoThumbs photos={job.pickup?.photos} label="Pickup photos" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Drop-off</p>
            <p style={{ fontSize: 15 }}>{job.dropoff?.description}</p>
            <PhotoThumbs photos={job.dropoff?.photos} label="Drop-off photos" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Price</p>
            <p style={{ fontSize: 18, fontWeight: 700 }}>
              ₦{(job.agreedPrice || job.suggestedPrice || 0).toLocaleString()}
              {job.riderEarning > 0 && user?.role === 'rider' && (
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--primary)', marginLeft: 8 }}>
                  (You earn ₦{job.riderEarning.toLocaleString()})
                </span>
              )}
            </p>
          </div>

          {/* Proof photos from rider */}
          {(job.proofPhotos?.live || job.proofPhotos?.picked || job.proofPhotos?.delivered) && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 8 }}>Delivery proof</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {job.proofPhotos.live && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>LIVE</div>
                    <a href={job.proofPhotos.live} target="_blank" rel="noreferrer">
                      <img src={job.proofPhotos.live} alt="live" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                    </a>
                  </div>
                )}
                {job.proofPhotos.picked && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>PICKED</div>
                    <a href={job.proofPhotos.picked} target="_blank" rel="noreferrer">
                      <img src={job.proofPhotos.picked} alt="picked" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                    </a>
                  </div>
                )}
                {job.proofPhotos.delivered && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>DELIVERED</div>
                    <a href={job.proofPhotos.delivered} target="_blank" rel="noreferrer">
                      <img src={job.proofPhotos.delivered} alt="delivered" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {message && (
            <div style={{ background: '#e0f2fe', color: '#075985', padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              {message}
            </div>
          )}

          {isCustomer && job.status === 'pending_offers' && job.offers?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Rider Offers</h3>
              {job.offers.filter((o) => o.status === 'pending').map((offer) => (
                <div key={offer._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div>
                    <strong>₦{offer.amount?.toLocaleString()}</strong>
                    <span style={{ fontSize: 13, color: 'var(--gray-500)', marginLeft: 8 }}>{offer.rider?.name || 'Rider'}</span>
                  </div>
                  <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => acceptOffer(offer._id)} disabled={actionLoading}>
                    Accept
                  </button>
                </div>
              ))}
            </div>
          )}

          {isRider && ['accepted', 'live', 'picked', 'delivered'].includes(job.status) && (
            <div style={{ marginTop: 20, padding: 16, background: 'var(--gray-50)', borderRadius: 12 }}>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Update status</h3>
              {job.status !== 'delivered' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 500 }}>Proof photo (required)</label>
                  <input type="file" accept="image/*" onChange={onProofSelect} style={{ display: 'block', marginTop: 6 }} />
                  {proofPreview && (
                    <img src={proofPreview} alt="preview" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {job.status === 'accepted' && (
                  <button className="btn btn-primary" onClick={() => updateStatus('live')} disabled={actionLoading}>
                    {actionLoading ? '…' : 'Start (LIVE)'}
                  </button>
                )}
                {job.status === 'live' && (
                  <button className="btn btn-primary" onClick={() => updateStatus('picked')} disabled={actionLoading}>
                    {actionLoading ? '…' : 'Mark PICKED'}
                  </button>
                )}
                {job.status === 'picked' && (
                  <button className="btn btn-primary" onClick={() => updateStatus('delivered')} disabled={actionLoading}>
                    {actionLoading ? '…' : 'Mark DELIVERED'}
                  </button>
                )}
                {job.status === 'delivered' && (
                  <button className="btn btn-primary" onClick={() => updateStatus('completed')} disabled={actionLoading}>
                    {actionLoading ? '…' : 'Complete Job'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackDelivery;
