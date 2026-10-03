import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const RiderApply = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    riderType: 'individual',
    nin: '',
    plateNumber: '',
    bikeModel: '',
    bikeColor: '',
    guarantorName: '',
    guarantorPhone: '',
    guarantorAddress: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api.post('/api/users/rider-application', {
        riderType: form.riderType,
        nin: form.nin,
        bikeDetails: [{
          plateNumber: form.plateNumber,
          model: form.bikeModel,
          color: form.bikeColor,
        }],
        guarantor: {
          name: form.guarantorName,
          phone: form.guarantorPhone,
          address: form.guarantorAddress,
        },
      });
      setMessage('Application submitted successfully! Admin will review and notify you.');
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', padding: '32px 16px' }}>
      <div className="container" style={{ maxWidth: 520 }}>
        <div style={{ marginBottom: 20 }}>
          <Link to="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Home</Link>
        </div>
        <div className="card">
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Become a ZumaDash Rider</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 24 }}>
            Fill this form. Admin will verify and approve before you can receive jobs.
          </p>

          {!isAuthenticated && (
            <div style={{ background: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              You need an account first. <Link to="/register" style={{ fontWeight: 600 }}>Sign up</Link> or <Link to="/login" style={{ fontWeight: 600 }}>Login</Link>
            </div>
          )}

          {message && <div style={{ background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 8, marginBottom: 16 }}>{message}</div>}
          {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Rider Type</label>
              <select name="riderType" value={form.riderType} onChange={handleChange}>
                <option value="individual">Individual (I own 1–2 bikes)</option>
                <option value="fleet">Fleet / Business Owner</option>
              </select>
            </div>
            <div className="form-group">
              <label>NIN</label>
              <input name="nin" value={form.nin} onChange={handleChange} required placeholder="National Identification Number" />
            </div>
            <div className="form-group">
              <label>Bike Plate Number</label>
              <input name="plateNumber" value={form.plateNumber} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Bike Model</label>
              <input name="bikeModel" value={form.bikeModel} onChange={handleChange} placeholder="e.g. Bajaj Boxer" />
            </div>
            <div className="form-group">
              <label>Bike Color</label>
              <input name="bikeColor" value={form.bikeColor} onChange={handleChange} />
            </div>
            <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--gray-200)' }} />
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Guarantor Details</h3>
            <div className="form-group">
              <label>Guarantor Full Name</label>
              <input name="guarantorName" value={form.guarantorName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Guarantor Phone</label>
              <input name="guarantorPhone" value={form.guarantorPhone} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Guarantor Address</label>
              <input name="guarantorAddress" value={form.guarantorAddress} onChange={handleChange} required />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading || !isAuthenticated}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RiderApply;
