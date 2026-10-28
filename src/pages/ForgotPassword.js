import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBranding, BrandLogo } from '../context/BrandingContext';
import api from '../services/api';

const ForgotPassword = () => {
  const { platformName } = useBranding();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email: email.trim().toLowerCase() });
      setInfo(res.data.message || 'If an account exists, a reset code was sent to your email.');
      // Move to reset page with email prefilled
      setTimeout(() => {
        navigate('/reset-password', { state: { email: email.trim().toLowerCase() } });
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send reset code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--gray-50)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div className="card" style={{ maxWidth: 420, width: '100%', padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, justifyContent: 'center' }}>
          <BrandLogo size={28} />
          <strong style={{ color: 'var(--primary)', fontSize: 20 }}>{platformName || 'ZumaDash'}</strong>
        </div>
        <h1 style={{ fontSize: 22, marginBottom: 8, textAlign: 'center' }}>Forgot password</h1>
        <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 20, textAlign: 'center' }}>
          Enter the email on your account. We will send a 6-digit code to reset your password.
        </p>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}
        {info && (
          <div style={{ background: '#f0fdf4', color: '#166534', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset code'}
          </button>
        </form>

        <p className="text-center mt-4" style={{ fontSize: 14, color: 'var(--gray-500)' }}>
          Remembered it?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Back to login
          </Link>
        </p>
        <p className="text-center mt-2" style={{ fontSize: 13 }}>
          <Link to="/reset-password" style={{ color: 'var(--gray-500)' }}>
            Already have a code?
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
