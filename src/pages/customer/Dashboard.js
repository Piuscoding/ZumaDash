import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import CustomerNavbar from '../../components/CustomerNavbar';
import { getPendingBooking, createJobFromPending } from '../../utils/pendingBooking';
import { ensureCloudinaryUrl } from '../../services/upload';

const STATUS_LABEL = {
  pending_offers: 'Pending',
  accepted: 'Accepted',
  live: 'In progress',
  picked: 'Picked up',
  pending_clearance: 'Clearance',
  pending_payment_approval: 'Awaiting payment',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const CustomerDashboard = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingMsg, setPendingMsg] = useState('');
  const [creditBalance, setCreditBalance] = useState(0);
  const pendingTried = useRef(false);

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
          setPendingMsg('Could not create your saved booking. Please book again or contact support.');
        }
      } catch (e) {
        if (!cancelled) {
          setPendingMsg(e.response?.data?.message || e.message || 'Could not create your saved booking.');
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

  useEffect(() => {
    let bal = Number(user?.walletCreditBalance) || 0;
    setCreditBalance(bal > 0 ? bal : 0);
    if (user?.role === 'customer') {
      api
        .get('/api/users/me')
        .then((res) => {
          const b = Number(res.data.user?.walletCreditBalance) || 0;
          setCreditBalance(b > 0 ? b : 0);
          if (refreshUser) refreshUser().catch(() => {});
        })
        .catch(() => {});
    }
  }, [user?._id]);

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
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0, flex: '1 1 160px' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              {user?.name?.split(' ')[0] || 'Account'}
            </h1>
          </div>
          <Link to="/book" className="btn btn-primary" style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>
            Book delivery
          </Link>
        </div>

        {/* Wallet credit — always visible when balance > 0 or as zero state card */}
        <div
          className="card"
          style={{
            marginBottom: 20,
            padding: '16px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            border: creditBalance > 0 ? '1px solid #86efac' : '1px solid var(--gray-200)',
            background: creditBalance > 0 ? '#f0fdf4' : undefined,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Wallet credit
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: creditBalance > 0 ? '#166534' : 'var(--gray-800)' }}>
              ₦{Number(creditBalance || 0).toLocaleString()}
            </div>
          </div>
          <Link
            to="/profile"
            className="btn btn-secondary"
            style={{ fontSize: 13, padding: '8px 14px' }}
            onClick={() => {
              try {
                sessionStorage.setItem('profileSection', 'credits');
              } catch (_) {}
            }}
          >
            View details
          </Link>
        </div>

        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>
          Active deliveries
        </h2>
        {loading ? (
          <p style={{ color: 'var(--gray-500)' }}>Loading…</p>
        ) : activeJobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: 'var(--gray-500)', marginBottom: 12 }}>No active deliveries</p>
            <Link to="/book" className="btn btn-primary">
              Book a delivery
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeJobs.map((job) => (
              <Link
                key={job._id}
                to={`/track/${job._id}`}
                className="card"
                style={{
                  padding: 16,
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <strong style={{ fontSize: 14 }}>{job.jobId}</strong>
                  <span className="badge badge-info" style={{ fontSize: 11 }}>
                    {STATUS_LABEL[job.status] || job.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                  {job.pickup?.description?.slice(0, 48)}
                  {(job.pickup?.description || '').length > 48 ? '…' : ''}
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 2 }}>
                  → {job.dropoff?.description?.slice(0, 48)}
                  {(job.dropoff?.description || '').length > 48 ? '…' : ''}
                </div>
                <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>
                  ₦{Number(job.suggestedPrice || job.agreedPrice || 0).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <Link to="/my-deliveries" style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>
            All deliveries →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
