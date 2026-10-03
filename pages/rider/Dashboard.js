import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const RiderDashboard = () => {
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
    ['accepted', 'live', 'picked'].includes(j.status)
  );
  const completedCount = jobs.filter((j) => j.status === 'completed').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* Top bar */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--gray-200)', padding: '12px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 18 }}>⛰ ZumaDash</Link>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }}>
            <Link to="/rider/jobs">Jobs</Link>
            <Link to="/rider/earnings">Earnings</Link>
            <Link to="/notifications">Notifications</Link>
            <Link to="/support">Support</Link>
            <button onClick={logout} style={{ background: 'none', color: 'var(--gray-500)', fontSize: 14 }}>Logout</button>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '28px 16px', maxWidth: 800 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Hello, {user?.name?.split(' ')[0]} 👋</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            Trust Score: <strong style={{ color: 'var(--primary)' }}>{user?.trustScore ?? 100}</strong>
            {user?.verificationStatus === 'approved' && (
              <span className="badge badge-success" style={{ marginLeft: 10 }}>Verified Rider</span>
            )}
          </p>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 28 }}>
          <div className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{activeJobs.length}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Active Jobs</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>₦{(user?.totalEarnings || 0).toLocaleString()}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Total Earned</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: (user?.commissionOwed || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
              ₦{(user?.commissionOwed || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Commission Owed</div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          <Link to="/rider/jobs" className="btn btn-primary" style={{ flex: 1 }}>View Available Jobs</Link>
          <Link to="/rider/earnings" className="btn btn-secondary" style={{ flex: 1 }}>My Earnings</Link>
        </div>

        {/* Active jobs */}
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Your Active Jobs</h2>
        {loading ? (
          <p style={{ color: 'var(--gray-500)' }}>Loading...</p>
        ) : activeJobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 36 }}>
            <p style={{ color: 'var(--gray-500)', marginBottom: 12 }}>No active jobs right now</p>
            <Link to="/rider/jobs" className="btn btn-primary">Find Jobs</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeJobs.map((job) => (
              <Link key={job._id} to={`/track/${job._id}`} className="card" style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>{job.jobId}</strong>
                  <span className="badge badge-info">{job.status}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                  {job.pickup?.description?.slice(0, 50)} → {job.dropoff?.description?.slice(0, 40)}
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>
                  Your earning: ₦{job.riderEarning?.toLocaleString() || '—'}
                </p>
              </Link>
            ))}
          </div>
        )}

        <p style={{ marginTop: 24, fontSize: 13, color: 'var(--gray-500)' }}>
          Completed jobs: {completedCount}
        </p>
      </div>
    </div>
  );
};

export default RiderDashboard;
