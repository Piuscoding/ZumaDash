import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranding, BrandLogo } from '../context/BrandingContext';
import api from '../services/api';
import { getPendingBooking, createJobFromPending, reportGuestBookingHold } from '../utils/pendingBooking';
import { ensureCloudinaryUrl } from '../services/upload';

const OTP_SECONDS = 300; // 5:00

const VerifyWhatsApp = () => {
  const { user, setUser, setToken, token, logout, loading: authLoading } = useAuth();
  const { platformName } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_SECONDS);
  // Active channel that last received the OTP (drives title + countdown)
  const [channelHint, setChannelHint] = useState(
    location.state?.preferEmail || location.state?.otpChannel === 'email' || sessionStorage.getItem('zumadash_otp_channel') === 'email' ? 'email' : 'whatsapp'
  );
  const inputs = useRef([]);
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (location.state?.preferEmail || location.state?.otpChannel === 'email') {
      setChannelHint('email');
      try { sessionStorage.setItem('zumadash_otp_channel', 'email'); } catch (_) {}
    }
    if (location.state?.otpMessage) {
      setInfo(location.state.otpMessage);
      // If message mentions email, lock UI to email
      if (/email/i.test(location.state.otpMessage)) {
        setChannelHint('email');
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (authLoading) return;
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('zumadash_token') : null;
    if (!token && !stored) {
      navigate('/login', { replace: true });
      return;
    }
    if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }

    // If already verified (either channel), finish pending booking — once
    const emailOk = user?.emailVerified === true;
    const waOk = user?.whatsappVerified === true;
    if (user && (emailOk || waOk) && !redirectingRef.current) {
      redirectingRef.current = true;
      completePendingThenGo(user).finally(() => {
        // allow retry only if still on this page with pending
      });
      return;
    }
  }, [token, user, authLoading]);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const completePendingThenGo = async (u) => {
    const who = {
      role: (u && u.role) || (user && user.role) || 'customer',
      name: (u && u.name) || (user && user.name) || '',
      phone: (u && u.phone) || (user && user.phone) || '',
      email: (u && u.email) || (user && user.email) || '',
      kycStatus: (u && u.kycStatus) || (user && user.kycStatus) || 'none',
      _id: (u && (u._id || u.id)) || (user && (user._id || user.id)),
    };

    const tok = localStorage.getItem('zumadash_token');
    if (tok) api.defaults.headers.common['Authorization'] = `Bearer ${tok}`;

    const pending = getPendingBooking();
    const role = who.role;

    // Non-customer with a guest booking: report to admin, keep pending, go to their dashboard
    if (pending && role && role !== 'customer') {
      try {
        await reportGuestBookingHold(api, who);
      } catch (e) {
        console.error('[VerifyWhatsApp] guest hold report failed', e);
      }
      const roleLabel =
        role === 'merchant' ? 'merchant' : role === 'rider' ? 'rider' : role;
      const holdMsg = `This account is a ${roleLabel}. Customer deliveries can't be booked on a ${roleLabel} account. Use a customer account, or contact support if you already paid. Your booking details were kept for support to recover.`;
      try {
        sessionStorage.setItem('zumadash_role_booking_msg', holdMsg);
      } catch (_) {}
      if (role === 'rider') navigate('/rider', { replace: true });
      else if (role === 'merchant') navigate('/merchant', { replace: true });
      else if (role === 'admin' || role === 'manager') navigate('/admin', { replace: true });
      else navigate('/dashboard', { replace: true });
      return;
    }

    if (role === 'rider') {
      navigate('/rider', { replace: true });
      return;
    }
    if (role === 'admin' || role === 'manager') {
      navigate('/admin', { replace: true });
      return;
    }
    if (role === 'merchant') {
      navigate('/merchant', { replace: true });
      return;
    }

    // Customer: create job from guest pending if any → track page
    if (!pending) {
      navigate('/dashboard', { replace: true });
      return;
    }

    try {
      const job = await createJobFromPending(api, who, ensureCloudinaryUrl);
      const jobId = job && (job._id || job.id);
      if (jobId) {
        navigate(`/track/${jobId}`, { replace: true });
        return;
      }
      setError(
        'Verified, but your saved booking could not be created. Open Book delivery again or contact support if you paid.'
      );
      navigate('/dashboard', { replace: true });
    } catch (e) {
      console.error('[VerifyWhatsApp] createJobFromPending failed', e);
      setError(
        (e.response && e.response.data && e.response.data.message) ||
          e.message ||
          'Verified, but failed to create your delivery.'
      );
      navigate('/dashboard', { replace: true });
    }
  };

  // backward-compatible name used elsewhere in this file
  const redirectByRole = completePendingThenGo;

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
    inputs.current[Math.min(text.length, 5)]?.focus();
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
      const res = await api.post('/api/auth/otp/verify', { code });
      const u = res.data.user;
      if (res.data.token) {
        localStorage.setItem('zumadash_token', res.data.token);
        api.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
        if (setToken) setToken(res.data.token);
      }
      if (u) {
        setUser({
          ...u,
          whatsappVerified: u.whatsappVerified === true,
          emailVerified: u.emailVerified === true,
        });
      }
      setInfo(res.data.message || 'Verified!');
      redirectingRef.current = true;
      await completePendingThenGo(u || user);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resend = async (channel = 'whatsapp') => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/otp/send', { channel });
      const msg = String(res.data.message || '');
      const already =
        /already verified/i.test(msg) ||
        (channel === 'email' && user?.emailVerified === true) ||
        (channel === 'whatsapp' && user?.whatsappVerified === true);

      if (already) {
        // This channel is done — try the other, or continue if either is verified
        const other = channel === 'email' ? 'whatsapp' : 'email';
        const otherOk =
          other === 'email' ? user?.emailVerified === true : user?.whatsappVerified === true;
        const thisOk =
          channel === 'email' ? user?.emailVerified === true : user?.whatsappVerified === true;
        if (thisOk || user?.emailVerified === true || user?.whatsappVerified === true) {
          setInfo(msg || 'Already verified — continuing…');
          setLoading(false);
          await redirectByRole(user);
          return;
        }
        // Try other channel once
        const res2 = await api.post('/api/auth/otp/send', { channel: other });
        const used2 = res2.data.channel || other;
        setChannelHint(used2 === 'email' ? 'email' : 'whatsapp');
        try {
          sessionStorage.setItem('zumadash_otp_channel', used2 === 'email' ? 'email' : 'whatsapp');
        } catch (_) {}
        setInfo(
          res2.data.message ||
            (used2 === 'email' ? 'Code sent to your email' : 'Code sent to your WhatsApp')
        );
        setSecondsLeft(OTP_SECONDS);
        setDigits(['', '', '', '', '', '']);
        inputs.current[0]?.focus();
        return;
      }

      const used = res.data.channel || channel;
      setChannelHint(used === 'email' ? 'email' : 'whatsapp');
      try {
        sessionStorage.setItem('zumadash_otp_channel', used === 'email' ? 'email' : 'whatsapp');
      } catch (_) {}
      setInfo(
        res.data.message ||
          (used === 'email' ? 'Code sent to your email' : 'Code sent to your WhatsApp')
      );
      setSecondsLeft(OTP_SECONDS);
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not resend code';
      if (/already verified/i.test(msg)) {
        setInfo(msg);
        await redirectByRole(user);
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const isEmail = channelHint === 'email';

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
          <strong style={{ color: 'var(--primary)', fontSize: 20 }}>{platformName}</strong>
        </div>

        <h1 style={{ fontSize: 22, marginBottom: 8, textAlign: 'center' }}>
          {isEmail ? 'Verify your email' : 'Verify your WhatsApp'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 16, textAlign: 'center' }}>
          {isEmail ? (
            <>
              Enter the 6-digit code we sent to your email
              {user?.email ? (
                <>
                  {' '}
                  (<strong>{user.email}</strong>)
                </>
              ) : null}
              .
            </>
          ) : (
            <>
              Enter the 6-digit code we sent to your WhatsApp
              {user?.phone ? (
                <>
                  {' '}
                  (<strong>{user.phone}</strong>)
                </>
              ) : null}
              .
            </>
          )}
        </p>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: 10,
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}
        {info && (
          <div
            style={{
              background: isEmail ? '#ecfdf5' : '#e0f2fe',
              color: isEmail ? '#065f46' : '#075985',
              padding: 10,
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            {info}
          </div>
        )}

        <form onSubmit={verify}>
          <div
            style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}
            onPaste={onPaste}
          >
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

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || code.length !== 6}
          >
            {loading ? 'Checking…' : 'Verify'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>
          <p style={{ color: 'var(--gray-600)', marginBottom: 8 }}>
            {isEmail ? "Haven't seen the email code?" : "Haven't seen the WhatsApp code?"}{' '}
            <strong>
              {mm}:{ss}
            </strong>
          </p>

          {/* Primary resend = channel that actually received the last OTP */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', marginBottom: 10 }}
            disabled={loading || secondsLeft > 0}
            onClick={() => resend(isEmail ? 'email' : 'whatsapp')}
          >
            {secondsLeft > 0
              ? `Resend ${isEmail ? 'email' : 'WhatsApp'} in ${mm}:${ss}`
              : `Resend ${isEmail ? 'email' : 'WhatsApp'} code`}
          </button>

          {/* Secondary = switch channel */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%' }}
            disabled={loading}
            onClick={() => resend(isEmail ? 'whatsapp' : 'email')}
          >
            {isEmail ? 'Try WhatsApp instead' : 'Send to my email instead'}
          </button>
        </div>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--gray-500)' }}>
          Wrong account?{' '}
          <button
            type="button"
            onClick={logout}
            style={{
              color: 'var(--primary)',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Log out
          </button>
        </p>
      </div>
    </div>
  );
};

export default VerifyWhatsApp;
