import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useBranding, BrandLogo } from '../context/BrandingContext';
import api from '../services/api';

const OTP_SECONDS = 300;

const ResetPassword = () => {
  const { platformName } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  useEffect(() => {
    if (location.state?.email) setEmail(location.state.email);
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        password,
        confirmPassword,
      });
      setInfo(res.data.message || 'Password updated. Redirecting to login…');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter your email first');
      return;
    }
    setResendLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password/resend', {
        email: email.trim().toLowerCase(),
      });
      setInfo(res.data.message || 'Code sent if the account exists.');
      setSecondsLeft(OTP_SECONDS);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend code');
    } finally {
      setResendLoading(false);
    }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

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
        <h1 style={{ fontSize: 22, marginBottom: 8, textAlign: 'center' }}>Reset password</h1>
        <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 20, textAlign: 'center' }}>
          Enter the 6-digit code from your email and choose a new password.
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
          <div className="form-group">
            <label>Reset code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              placeholder="6-digit code"
              autoComplete="one-time-code"
            />
          </div>
          <div className="form-group">
            <label>New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Repeat password"
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 13, padding: '8px 14px' }}
            disabled={resendLoading || secondsLeft > 0}
            onClick={resend}
          >
            {secondsLeft > 0 ? `Resend in ${mm}:${ss}` : resendLoading ? 'Sending…' : 'Resend code'}
          </button>
        </div>

        <p className="text-center mt-4" style={{ fontSize: 14, color: 'var(--gray-500)' }}>
          <Link to="/forgot-password" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Request a new code
          </Link>
          {' · '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
