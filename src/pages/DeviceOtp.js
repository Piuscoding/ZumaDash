import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranding, BrandLogo } from '../context/BrandingContext';
import api from '../services/api';

const OTP_SECONDS = 300;

const DeviceOtp = () => {
  const { setUser, completeDeviceLogin } = useAuth();
  const { platformName } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const pendingToken = location.state?.pendingToken || sessionStorage.getItem('zumadash_pending_device') || '';
  const otpChannel = location.state?.otpChannel || 'whatsapp';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_SECONDS);
  const inputs = useRef([]);

  useEffect(() => {
    if (!pendingToken) {
      navigate('/login', { replace: true });
    }
  }, [pendingToken, navigate]);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const code = digits.join('');

  const onDigit = (index, value) => {
    const v = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    if (v && index < 5) inputs.current[index + 1]?.focus();
  };

  const onKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const onPaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (text.length < 4) return;
    e.preventDefault();
    const next = text.split('').concat(Array(6).fill('')).slice(0, 6);
    setDigits(next);
  };

  const redirectByRole = (u) => {
    if (!u) return;
    if (u.role === 'rider') navigate('/rider', { replace: true });
    else if (u.role === 'admin') navigate('/admin', { replace: true });
    else if (u.role === 'merchant') navigate('/merchant', { replace: true });
    else navigate('/dashboard', { replace: true });
  };

  const verify = async (e) => {
    e?.preventDefault();
    if (code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/device-otp/verify', {
        code,
        pendingToken,
      });
      sessionStorage.removeItem('zumadash_pending_device');
      if (completeDeviceLogin) {
        await completeDeviceLogin(res.data.token, res.data.user);
      } else {
        localStorage.setItem('zumadash_token', res.data.token);
        api.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
        setUser(res.data.user);
      }
      redirectByRole(res.data.user);
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'ACCOUNT_FROZEN') {
        setError(data.message || 'Account frozen. Contact support.');
        sessionStorage.removeItem('zumadash_pending_device');
      } else {
        setError(data?.message || 'Verification failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/device-otp/resend', { pendingToken });
      setSecondsLeft(OTP_SECONDS);
      setDigits(['', '', '', '', '', '']);
      setInfo(res.data.message || 'Code resent');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend');
    } finally {
      setLoading(false);
    }
  };

  const mm = String(Math.floor(secondsLeft / 60));
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div className="text-center mb-4">
          <Link to="/" style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <BrandLogo size={28} /> {platformName}
          </Link>
          <h2 style={{ marginTop: 16, fontSize: 22 }}>New device check</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 8 }}>
            You already have 2 active sessions. Enter the security code sent to your{' '}
            {otpChannel === 'email' ? 'email' : 'WhatsApp'} to continue on this device. The oldest session will be signed out.
          </p>
        </div>

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

        <form onSubmit={verify}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }} onPaste={onPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={d}
                onChange={(e) => onDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                style={{
                  width: 48,
                  height: 52,
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: 700,
                  borderRadius: 10,
                  border: '1.5px solid var(--gray-300)',
                }}
              />
            ))}
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading || code.length !== 6}>
            {loading ? 'Checking…' : 'Verify device'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>
          <p style={{ color: 'var(--gray-600)', marginBottom: 8 }}>
            Haven&apos;t seen the code? <strong>{mm}:{ss}</strong>
          </p>
          <button type="button" className="btn btn-secondary" style={{ width: '100%' }} disabled={loading || secondsLeft > 0} onClick={resend}>
            {secondsLeft > 0 ? `Resend in ${mm}:${ss}` : 'Resend code'}
          </button>
        </div>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--gray-500)' }}>
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default DeviceOtp;
