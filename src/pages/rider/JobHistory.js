import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RiderNavbar from '../../components/RiderNavbar';
import api from '../../services/api';

const JobHistory = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/jobs/my')
      .then((res) => setJobs(res.data.jobs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RiderNavbar />
      <div className="container" style={{ padding: '20px 16px', maxWidth: 640 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Loading...</p>
        ) : jobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--gray-500)' }}>No jobs yet</p>
            <Link to="/rider/jobs" className="btn btn-primary" style={{ marginTop: 12 }}>View available jobs</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {jobs.map((j) => (
              <Link key={j._id} to={`/track/${j._id}`} className="card" style={{ padding: 14, display: 'block', color: 'inherit' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 14 }}>{j.jobId}</strong>
                  <span className="badge badge-info">{j.status?.replace('_', ' ')}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 6 }}>
                  {(j.pickup?.description || '').slice(0, 40)} → {(j.dropoff?.description || '').slice(0, 40)}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    ₦{(j.agreedPrice || j.suggestedPrice || 0).toLocaleString()}
                    {j.riderEarning > 0 && (
                      <span style={{ color: 'var(--primary)', marginLeft: 8 }}>Earn ₦{j.riderEarning.toLocaleString()}</span>
                    )}
                  </span>
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

export default JobHistory;
