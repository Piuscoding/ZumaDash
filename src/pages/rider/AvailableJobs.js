import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RiderNavbar from '../../components/RiderNavbar';
import api from '../../services/api';

const AvailableJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offerAmount, setOfferAmount] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [message, setMessage] = useState('');

  const fetchJobs = async () => {
    try {
      const res = await api.get('/api/jobs/available');
      setJobs(res.data.jobs || []);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleOffer = async (jobId, suggested) => {
    const amount = offerAmount[jobId] || suggested;
    setSubmitting(jobId);
    setMessage('');
    try {
      await api.post(`/api/jobs/${jobId}/offer`, { amount: Number(amount) });
      setMessage('Offer submitted successfully!');
      fetchJobs();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit offer');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RiderNavbar />

      <div className="container" style={{ padding: '24px 16px', maxWidth: 700 }}>
        {message && (
          <div style={{
            background: message.includes('success') ? '#dcfce7' : '#fee2e2',
            color: message.includes('success') ? '#166534' : '#991b1b',
            padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14
          }}>
            {message}
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Loading available jobs...</p>
        ) : jobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--gray-500)' }}>No open jobs at the moment. Check back soon.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {jobs.map((job) => (
              <div key={job._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>{job.jobId}</strong>
                  <span className="badge badge-warning">{job.packageSize}</span>
                </div>
                <p style={{ fontSize: 14, marginBottom: 4 }}>
                  <strong>Pickup:</strong> {job.pickup?.description}
                </p>
                <p style={{ fontSize: 14, marginBottom: 12 }}>
                  <strong>Drop-off:</strong> {job.dropoff?.description}
                </p>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
                  Suggested: ₦{job.suggestedPrice?.toLocaleString()}
                </p>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="Your offer (₦)"
                    value={offerAmount[job._id] ?? job.suggestedPrice}
                    onChange={(e) => setOfferAmount({ ...offerAmount, [job._id]: e.target.value })}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--gray-200)' }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => handleOffer(job._id, job.suggestedPrice)}
                    disabled={submitting === job._id}
                  >
                    {submitting === job._id ? '...' : 'Make Offer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableJobs;
