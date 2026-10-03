import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const statusSteps = ['pending_offers', 'accepted', 'live', 'picked', 'delivered', 'completed'];

const TrackDelivery = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

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

  const updateStatus = async (status) => {
    setActionLoading(true);
    setMessage('');
    try {
      await api.put(`/api/jobs/${id}/status`, { status });
      setMessage(`Status updated to ${status}`);
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
  const isRider = user?.role === 'rider' && job.rider?._id === user?.id;
  const isCustomer = user?.role === 'customer';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', padding: '20px 16px' }}>
      <div className="container" style={{ maxWidth: 640 }}>
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

          {/* Status timeline */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, position: 'relative' }}>
            {statusSteps.slice(0, 5).map((s, i) => (
              <div key={s} style={{ textAlign: 'center', flex: 1, zIndex: 1 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', margin: '0 auto 6px',
                  background: i <= currentIdx ? 'var(--primary)' : 'var(--gray-200)',
                  color: i <= currentIdx ? 'white' : 'var(--gray-500)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700
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
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Drop-off</p>
            <p style={{ fontSize: 15 }}>{job.dropoff?.description}</p>
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

          {message && (
            <div style={{ background: '#e0f2fe', color: '#075985', padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              {message}
            </div>
          )}

          {/* Customer: accept offers */}
          {isCustomer && job.status === 'pending_offers' && job.offers?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Rider Offers</h3>
              {job.offers.filter(o => o.status === 'pending').map((offer) => (
                <div key={offer._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div>
                    <strong>₦{offer.amount?.toLocaleString()}</strong>
                    <span style={{ fontSize: 13, color: 'var(--gray-500)', marginLeft: 8 }}>
                      {offer.rider?.name || 'Rider'}
                    </span>
                  </div>
                  <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => acceptOffer(offer._id)} disabled={actionLoading}>
                    Accept
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Rider status buttons */}
          {isRider && (
            <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {job.status === 'accepted' && (
                <button className="btn btn-primary" onClick={() => updateStatus('live')} disabled={actionLoading}>Start (LIVE)</button>
              )}
              {job.status === 'live' && (
                <button className="btn btn-primary" onClick={() => updateStatus('picked')} disabled={actionLoading}>Mark PICKED</button>
              )}
              {job.status === 'picked' && (
                <button className="btn btn-primary" onClick={() => updateStatus('delivered')} disabled={actionLoading}>Mark DELIVERED</button>
              )}
              {job.status === 'delivered' && (
                <button className="btn btn-primary" onClick={() => updateStatus('completed')} disabled={actionLoading}>Complete Job</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackDelivery;
