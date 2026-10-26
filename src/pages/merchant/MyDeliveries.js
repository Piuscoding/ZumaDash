import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import RoleNavbar from '../../components/RoleNavbar';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'pending_payment_approval', label: 'Pending payment' },
  { key: 'pending_offers', label: 'Pending offers' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'live', label: 'Live' },
  { key: 'picked', label: 'Picked' },
  { key: 'pending_clearance', label: 'Clearance' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const MyDeliveries = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/jobs/my');
        setJobs(res.data.jobs || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = jobs.filter((j) => {
    if (filter === 'all') return true;
    if (filter === 'active') {
      return ['accepted', 'live', 'picked', 'pending_clearance', 'pending_payment_approval'].includes(
        j.status
      );
    }
    return j.status === filter;
  });

  const displayAmount = (j) => {
    if (j.merchantSelfBooking) {
      return (
        Number(j.platformTake) ||
        Number(j.totalPayable) ||
        Number(j.amountPaid) ||
        (Number(j.commissionAmount) || 0) + (Number(j.vatAmount) || 0) ||
        0
      );
    }
    return (
      Number(j.totalPayable) ||
      (Number(j.agreedPrice) || Number(j.suggestedPrice) || 0) + (Number(j.vatAmount) || 0) ||
      0
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RoleNavbar />
      <div className="container" style={{ padding: '24px 16px', maxWidth: 640 }}>
        <Link to="/merchant" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}>
          ← Dashboard
        </Link>
        <h1 style={{ fontSize: 22, margin: '12px 0 16px' }}>My deliveries</h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={filter === f.key ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--gray-500)' }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--gray-500)', marginBottom: 16 }}>No deliveries in this filter</p>
            <Link to="/merchant/book" className="btn btn-primary">
              Book a delivery
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((j) => (
              <Link
                key={j._id}
                to={`/track/${j._id}`}
                className="card"
                style={{ padding: 14, display: 'block', color: 'inherit' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: 14 }}>{j.jobId}</strong>
                  <span className="badge badge-info">{String(j.status || '').replace(/_/g, ' ')}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                  {(j.pickup?.description || '').slice(0, 50)}…
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
                  → {(j.dropoff?.description || '').slice(0, 50)}…
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>
                    ₦{displayAmount(j).toLocaleString()}
                    {j.paymentMethod === 'cash' ? ' · COD' : ' · Bank'}
                    {Number(j.vatAmount) > 0 ? (
                      <span style={{ fontWeight: 500, color: 'var(--gray-500)', fontSize: 12 }}>
                        {' '}
                        (incl. VAT)
                      </span>
                    ) : null}
                  </span>
                  <span style={{ color: 'var(--gray-500)' }}>
                    {j.createdAt ? new Date(j.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDeliveries;
