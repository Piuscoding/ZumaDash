import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const BookDelivery = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    pickupDescription: '',
    dropoffDescription: '',
    packageSize: 'small',
    packageDescription: '',
    paymentMethod: 'cash',
    suggestedPrice: 1500,
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        pickup: {
          description: form.pickupDescription,
          contactName: user?.name,
          contactPhone: user?.phone,
        },
        dropoff: {
          description: form.dropoffDescription,
        },
        packageSize: form.packageSize,
        packageDescription: form.packageDescription,
        suggestedPrice: Number(form.suggestedPrice),
        paymentMethod: form.paymentMethod,
        distanceBand: 'same_zone',
      };

      const res = await api.post('/api/jobs', payload);
      navigate(`/track/${res.data.job._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create delivery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', padding: '24px 16px' }}>
      <div className="container" style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/dashboard" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Dashboard</Link>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>⛰ ZumaDash</span>
        </div>

        <div className="card">
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Book a Delivery</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 24 }}>
            Dutse • Kubwa • Bwari only
          </p>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <div className="form-group">
                <label>Pickup Location (describe clearly + landmarks)</label>
                <textarea
                  name="pickupDescription"
                  value={form.pickupDescription}
                  onChange={handleChange}
                  rows={3}
                  placeholder="e.g. Kubwa Phase 2, after the big mosque, blue gate opposite pure water seller"
                  required
                />
              </div>
              <div className="form-group">
                <label>Drop-off Location</label>
                <textarea
                  name="dropoffDescription"
                  value={form.dropoffDescription}
                  onChange={handleChange}
                  rows={3}
                  placeholder="e.g. Dutse Alhaji, near the market, red roof house"
                  required
                />
              </div>
              <button
                className="btn btn-primary btn-block"
                onClick={() => setStep(2)}
                disabled={!form.pickupDescription || !form.dropoffDescription}
              >
                Next →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-group">
                <label>Package Size</label>
                <select name="packageSize" value={form.packageSize} onChange={handleChange}>
                  <option value="small">Small (documents, small items)</option>
                  <option value="medium">Medium (bag, food, medium box)</option>
                  <option value="large">Large / Heavy</option>
                </select>
              </div>
              <div className="form-group">
                <label>What are you sending? (optional)</label>
                <input
                  name="packageDescription"
                  value={form.packageDescription}
                  onChange={handleChange}
                  placeholder="e.g. Food, documents, clothes"
                />
              </div>
              <div className="form-group">
                <label>Suggested Price (₦)</label>
                <input
                  type="number"
                  name="suggestedPrice"
                  value={form.suggestedPrice}
                  onChange={handleChange}
                  min={500}
                />
                <small style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                  Riders can make offers. You can accept or negotiate.
                </small>
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange}>
                  <option value="cash">Cash on Delivery</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>
                  ← Back
                </button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ flex: 2 }}>
                  {loading ? 'Creating...' : 'Create Delivery'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDelivery;
