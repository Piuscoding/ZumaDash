import PublicNavbar from '../components/PublicNavbar';
import { useBranding, BrandLogo } from '../context/BrandingContext';
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getPendingBooking, createJobFromPending } from '../utils/pendingBooking';
import { ensureCloudinaryUrl } from '../services/upload';

const Register = () => {
  const { platformName } = useBranding();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromBooking = location.state?.fromBooking || !!getPendingBooking();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register(form);

      // Complete pending guest booking if any
      if (getPendingBooking()) {
        try {
          const job = await createJobFromPending(api, user, ensureCloudinaryUrl);
          if (job) {
            navigate(`/track/${job._id}`);
            return;
          }
        } catch (jobErr) {
          console.error(jobErr);
          setError(jobErr.response?.data?.message || 'Account created, but failed to create your delivery. Please book again from Dashboard.');
          setLoading(false);
          return;
        }
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div className="text-center mb-4">
          <Link to="/" style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <BrandLogo size={28} /> {platformName}</Link>
          <h2 style={{ marginTop: 16, fontSize: 22 }}>Create your account</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            {fromBooking ? 'Sign up to complete your booking' : 'Send packages across Dutse, Kubwa & Bwari'}
          </p>
        </div>

        {fromBooking && (
          <div style={{ background: '#f0fdf4', color: '#166534', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            Your delivery details are saved. After signup, your job will be created automatically.
          </div>
        )}

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input name="name" value={form.name} onChange={handleChange} required placeholder="Your full name" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input name="phone" value={form.phone} onChange={handleChange} required placeholder="08012345678" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} placeholder="At least 6 characters" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating account...' : fromBooking ? 'Sign Up & Complete Booking' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-4" style={{ fontSize: 14, color: 'var(--gray-500)' }}>
          Already have an account?{' '}
          <Link to="/login" state={{ fromBooking }} style={{ color: 'var(--primary)', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
