import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import RoleNavbar from '../../components/RoleNavbar';

const RiderDashboard = () => {
  const { user } = useAuth();
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

  const activeJobs = jobs.filter((j) => ['accepted', 'live', 'picked'].includes(j.status));
  const completedCount = jobs.filter((j) => j.status === 'completed').length;

  const stats = [
    { key: 'active', label: 'Active', short: 'Active', value: activeJobs.length, color: 'var(--gray-900)', money: false },
    {
      key: 'pending',
      label: 'Pending clear',
      short: 'Pend. clear',
      value: user?.pendingClearance || 0,
      color: '#b45309',
      money: true,
    },
    {
      key: 'available',
      label: 'Available',
      short: 'Available',
      value: user?.availableBalance || 0,
      color: 'var(--primary)',
      money: true,
    },
    {
      key: 'owed',
      label: 'Comm. owed',
      short: 'Comm. owed',
      value: user?.commissionOwed || 0,
      color: (user?.commissionOwed || 0) > 0 ? 'var(--danger)' : 'var(--primary)',
      money: true,
      sub: 'COD only',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RoleNavbar />
      <div className="container" style={{ padding: '24px 16px', maxWidth: 800 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            Hello, {user?.name?.split(' ')[0]} 👋
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span
              className="badge badge-success"
              style={{ background: 'var(--primary)', color: '#fff', borderRadius: 999, padding: '6px 12px' }}
            >
              Available jobs
            </span>
            <Link to="/rider/earnings" className="badge" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 999, padding: '6px 12px', color: 'var(--gray-700)' }}>
              Earnings
            </Link>
            <Link to="/rider/history" className="badge" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 999, padding: '6px 12px', color: 'var(--gray-700)' }}>
              History
            </Link>
            <Link to="/profile" className="badge" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 999, padding: '6px 12px', color: 'var(--gray-700)' }}>
              Profile
            </Link>
          </div>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 10 }}>
            Trust Score: <strong style={{ color: 'var(--primary)' }}>{user?.trustScore ?? 100}</strong>
            {user?.verificationStatus === 'approved' && (
              <span className="badge badge-success" style={{ marginLeft: 10 }}>Verified Rider</span>
            )}
          </p>
        </div>

        {/* Stats: 2 cols on small screens, 4 on wider */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
            marginBottom: 20,
          }}
          className="rider-stats-grid"
        >
          <style>{`
            @media (min-width: 640px) {
              .rider-stats-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
            }
          `}</style>
          {stats.map((s) => (
            <div
              key={s.key}
              className="card"
              style={{
                textAlign: 'center',
                padding: '14px 10px',
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: s.color,
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                }}
              >
                {s.money ? `₦${Number(s.value || 0).toLocaleString()}` : s.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--gray-500)',
                  marginTop: 6,
                  lineHeight: 1.3,
                }}
              >
                <span className="hide-sm">{s.label}</span>
                <span className="show-sm">{s.short}</span>
                {s.sub && (
                  <div style={{ fontSize: 10, marginTop: 2 }}>{s.sub}</div>
                )}
              </div>
            </div>
          ))}
          <style>{`
            .show-sm { display: inline; }
            .hide-sm { display: none; }
            @media (min-width: 480px) {
              .show-sm { display: none; }
              .hide-sm { display: inline; }
            }
          `}</style>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <Link to="/rider/jobs" className="btn btn-primary" style={{ textAlign: 'center' }}>
            View Available Jobs
          </Link>
          <Link to="/rider/earnings" className="btn btn-secondary" style={{ textAlign: 'center' }}>
            My Earnings
          </Link>
        </div>

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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                  <strong style={{ wordBreak: 'break-all' }}>{job.jobId}</strong>
                  <span className="badge badge-info">{job.status}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                  {(job.pickup?.description || '').slice(0, 50)} → {(job.dropoff?.description || '').slice(0, 40)}
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>
                  Your earning: ₦{job.riderEarning?.toLocaleString() || '0'}
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
