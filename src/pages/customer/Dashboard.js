import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import CustomerNavbar from '../../components/CustomerNavbar';
import { getPendingBooking, createJobFromPending } from '../../utils/pendingBooking';
import { ensureCloudinaryUrl } from '../../services/upload';

/** Short labels so badges do not crush card content on narrow screens */
const STATUS_LABEL = {
  pending_offers: 'Pending offers',
  accepted: 'Accepted',
  live: 'Live',
  picked: 'Picked up',
  pending_clearance: 'Clearance',
  pending_payment_approval: 'Awaiting payment',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingMsg, setPendingMsg] = useState('');
  const pendingTried = useRef(false);

  // Safety net: if guest booking is still in localStorage after login/OTP, create it here
  useEffect(() => {
    if (!user || user.role !== 'customer') return;
    if (pendingTried.current) return;
    if (!getPendingBooking()) return;

    pendingTried.current = true;
    let cancelled = false;

    (async () => {
      setPendingMsg('Finishing your saved booking…');
      try {
        const tok = localStorage.getItem('zumadash_token');
        if (tok) api.defaults.headers.common['Authorization'] = `Bearer ${tok}`;
        const job = await createJobFromPending(api, user, ensureCloudinaryUrl);
        const jobId = job && (job._id || job.id);
        if (!cancelled && jobId) {
          navigate(`/track/${jobId}`, { replace: true });
          return;
        }
        if (!cancelled) {
          setPendingMsg(
            'Could not create your saved booking automatically. Please book again or contact support if you already paid.'
          );
        }
      } catch (e) {
        console.error('[Dashboard] pending booking create failed', e);
        if (!cancelled) {
          setPendingMsg(
            e.response?.data?.message ||
              e.message ||
              'Could not create your saved booking. Please try booking again.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get('/api/jobs/my');
        setJobs(res.data.jobs || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // Landing "Active" list: in-progress only — NOT awaiting admin payment approval
  // (those stay visible under My deliveries / history)
  const activeJobs = jobs.filter((j) =>
    ['pending_offers', 'accepted', 'live', 'picked'].includes(j.status)
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <CustomerNavbar />

      <div className="container" style={{ padding: '32px 16px', maxWidth: 800 }}>
        {pendingMsg ? (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 8,
              background: '#fef3c7',
              color: '#92400e',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {pendingMsg}
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 28,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0, flex: '1 1 160px' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Hello, {user?.name?.split(' ')[0]} 👋</h1>
            <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>What would you like to send today?</p>
          </div>
          <Link to="/book" className="btn btn-primary" style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>
            + Book Delivery
          </Link>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Active Deliveries</h2>
        {loading ? (
          <p style={{ color: 'var(--gray-500)' }}>Loading...</p>
        ) : activeJobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--gray-500)', marginBottom: 16 }}>No active deliveries</p>
            <Link to="/book" className="btn btn-primary">
              Send your first package
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeJobs.map((job) => (
              <Link
                key={job._id}
                to={`/track/${job._id}`}
                className="card"
                style={{ display: 'block', overflow: 'hidden' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <strong
                    style={{
                      fontSize: 14,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                    }}
                  >
                    {job.jobId}
                  </strong>
                  <span
                    className="badge badge-info"
                    style={{
                      flex: '0 0 auto',
                      fontSize: 11,
                      padding: '3px 8px',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                    }}
                  >
                    {STATUS_LABEL[job.status] || String(job.status).replace(/_/g, ' ')}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--gray-500)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    wordBreak: 'break-word',
                  }}
                >
                  {job.pickup?.description || '—'} → {job.dropoff?.description || '—'}
                </p>
                <p style={{ fontSize: 13, marginTop: 6, fontWeight: 600 }}>
                  ₦{Number(job.agreedPrice || job.suggestedPrice || 0).toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginTop: 32 }}>
          <Link to="/my-deliveries" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}>
            View all deliveries →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
