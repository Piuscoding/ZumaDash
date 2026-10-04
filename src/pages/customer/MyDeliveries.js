import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerNavbar from '../../components/CustomerNavbar';
import api from '../../services/api';

const MyDeliveries = () => {
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/jobs/my')
      .then((res) => setJobs(res.data.jobs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = jobs.filter((j) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending_payment_approval', 'pending_offers', 'accepted', 'live', 'picked', 'pending_clearance'].includes(j.status);
    if (filter === 'done') return ['delivered', 'completed'].includes(j.status);
    if (filter === 'other') return ['cancelled', 'disputed', 'frozen'].includes(j.status);
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <CustomerNavbar />

      <div className="container" style={{ padding: '20px 16px', maxWidth: 640 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'done', label: 'Completed' },
            { id: 'other', label: 'Cancelled / Dispute' },
          ].map((f) => (
            <button
              key={f.id}
              className={`btn ${filter === f.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--gray-500)', marginBottom: 16 }}>No deliveries in this filter</p>
            <Link to="/book" className="btn btn-primary">Book a delivery</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((j) => (
              <Link key={j._id} to={`/track/${j._id}`} className="card" style={{ padding: 14, display: 'block', color: 'inherit' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: 14 }}>{j.jobId}</strong>
                  <span className="badge badge-info">{j.status?.replace('_', ' ')}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                  {(j.pickup?.description || '').slice(0, 50)}…
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
                  → {(j.dropoff?.description || '').slice(0, 50)}…
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 700 }}>₦{(j.agreedPrice || j.suggestedPrice || 0).toLocaleString()}</span>
                  <span style={{ color: 'var(--gray-500)' }}>{new Date(j.createdAt).toLocaleDateString()}</span>
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
