import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RiderNavbar from '../../components/RiderNavbar';
import api from '../../services/api';

const RiderEarnings = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get('/api/jobs/my');
        // Only completed or delivered jobs for earnings history
        const relevant = (res.data.jobs || []).filter((j) =>
          ['completed', 'delivered', 'picked', 'live', 'accepted'].includes(j.status)
        );
        setJobs(relevant);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RiderNavbar />

      <div className="container" style={{ padding: '24px 16px', maxWidth: 700 }}>
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 4 }}>Total Earnings</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>
              ₦{(user?.totalEarnings || 0).toLocaleString()}
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 4 }}>Commission Owed</div>
            <div style={{
              fontSize: 26,
              fontWeight: 800,
              color: (user?.commissionOwed || 0) > 0 ? 'var(--danger)' : 'var(--success)'
            }}>
              ₦{(user?.commissionOwed || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24, background: 'var(--primary-light)', border: '1px solid #bbf7d0' }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>How commission works</h3>
          <p style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.6 }}>
            You collect the <strong>full agreed amount</strong> from the customer (cash or transfer).  
            At the end of the day (or every 2 days), transfer only the platform commission to ZumaDash.  
            Your net earning stays with you.
          </p>
          {(user?.commissionOwed || 0) > 0 && (
            <p style={{ fontSize: 13, marginTop: 10, fontWeight: 600, color: 'var(--danger)' }}>
              Please clear ₦{(user.commissionOwed).toLocaleString()} to keep receiving new jobs.
            </p>
          )}
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Job History</h2>
        {loading ? (
          <p style={{ color: 'var(--gray-500)' }}>Loading...</p>
        ) : jobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: 'var(--gray-500)' }}>No jobs yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {jobs.map((job) => (
              <div key={job._id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ fontSize: 14 }}>{job.jobId}</strong>
                  <span className="badge badge-info">{job.status}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 6 }}>
                  {new Date(job.createdAt).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span>Agreed: ₦{(job.agreedPrice || job.suggestedPrice || 0).toLocaleString()}</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    You: ₦{(job.riderEarning || 0).toLocaleString()}
                  </span>
                </div>
                {job.commissionAmount > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                    Commission: ₦{job.commissionAmount.toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderEarnings;
