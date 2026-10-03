import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const activeJobs = jobs.filter((j) =>
    ['pending_offers', 'accepted', 'live', 'picked'].includes(j.status)
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* Top bar */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--gray-200)', padding: '12px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 18 }}>⛰ ZumaDash</Link>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }}>
            <Link to="/notifications">Notifications</Link>
            <Link to="/support">Support</Link>
            <Link to="/profile">{user?.name?.split(' ')[0]}</Link>
            <button onClick={logout} style={{ background: 'none', color: 'var(--gray-500)', fontSize: 14 }}>Logout</button>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '32px 16px', maxWidth: 800 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Hello, {user?.name?.split(' ')[0]} 👋</h1>
            <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>What would you like to send today?</p>
          </div>
          <Link to="/book" className="btn btn-primary">+ Book Delivery</Link>
        </div>

        {/* Active jobs */}
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Active Deliveries</h2>
        {loading ? (
          <p style={{ color: 'var(--gray-500)' }}>Loading...</p>
        ) : activeJobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--gray-500)', marginBottom: 16 }}>No active deliveries</p>
            <Link to="/book" className="btn btn-primary">Send your first package</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeJobs.map((job) => (
              <Link key={job._id} to={`/track/${job._id}`} className="card" style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>{job.jobId}</strong>
                  <span className={`badge badge-info`}>{job.status.replace('_', ' ')}</span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--gray-500)' }}>
                  {job.pickup?.description?.slice(0, 40)}... → {job.dropoff?.description?.slice(0, 40)}...
                </p>
                <p style={{ fontSize: 13, marginTop: 6 }}>
                  ₦{job.agreedPrice || job.suggestedPrice}
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
