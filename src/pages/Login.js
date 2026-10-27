import PublicNavbar from '../components/PublicNavbar';
import { useBranding, BrandLogo } from '../context/BrandingContext';
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import api from '../services/api';
import { getPendingBooking, createJobFromPending, reportGuestBookingHold } from '../utils/pendingBooking';
import { ensureCloudinaryUrl } from '../services/upload';

const Login = () => {
  const { t } = useI18n();
  const { platformName } = useBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromBooking = location.state?.fromBooking || !!getPendingBooking();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);

      if (user.needsDeviceOtp && user.pendingToken) {
        navigate('/device-otp', {
          replace: true,
          state: {
            pendingToken: user.pendingToken,
            otpChannel: user.otpChannel || 'whatsapp',
          },
        });
        return;
      }

      // Backend policy: either WhatsApp OR email verified is enough to continue
      const hasVerifiedChannel =
        user.whatsappVerified === true || user.emailVerified === true;
      if (user.needsWhatsappVerification && !hasVerifiedChannel) {
        navigate('/verify-whatsapp', {
          replace: true,
          state: {
            otpChannel: user.otpChannel || (/email/i.test(user.message || user.loginMessage || '') ? 'email' : 'whatsapp'),
            preferEmail: (user.otpChannel === 'email') || /email/i.test(user.message || user.loginMessage || ''),
            otpMessage: user.message || user.loginMessage || '',
            fromBooking: !!getPendingBooking(),
          },
        });
        return;
      }
      if (!hasVerifiedChannel && user.role !== 'admin' && user.role !== 'manager') {
        navigate('/verify-whatsapp', {
          replace: true,
          state: {
            otpChannel: user.otpChannel || 'whatsapp',
            preferEmail: user.otpChannel === 'email',
            otpMessage: user.message || user.loginMessage || '',
            fromBooking: !!getPendingBooking(),
          },
        });
        return;
      }

      // Guest pending booking (only after verified)
      if (getPendingBooking()) {
        const role = user.role || 'customer';
        const tok = localStorage.getItem('zumadash_token');
        if (tok) api.defaults.headers.common['Authorization'] = `Bearer ${tok}`;

        if (role === 'customer') {
          try {
            const job = await createJobFromPending(api, user, ensureCloudinaryUrl);
            const jobId = job && (job._id || job.id);
            if (jobId) {
              navigate(`/track/${jobId}`, { replace: true });
              return;
            }
            setError(
              'Logged in, but your saved booking could not be created. Open Book delivery and try again, or contact support if you already paid.'
            );
            setLoading(false);
            return;
          } catch (jobErr) {
            console.error(jobErr);
            setError(
              jobErr.response?.data?.message ||
                jobErr.message ||
                'Logged in, but failed to create your delivery. Please book again from Dashboard.'
            );
            setLoading(false);
            return;
          }
        }

        // Rider / merchant / other — do not create job; keep pending + report for admin
        try {
          await reportGuestBookingHold(api, user);
        } catch (e) {
          console.error(e);
        }
        const roleLabel = role === 'merchant' ? 'merchant' : role === 'rider' ? 'rider' : role;
        const holdMsg = `This account is a ${roleLabel}. Customer deliveries can't be booked on a ${roleLabel} account. Use a customer account, or contact support if you already paid. Your booking details were kept for support to recover.`;
        try {
          sessionStorage.setItem('zumadash_role_booking_msg', holdMsg);
        } catch (_) {}
        setLoading(false);
        if (role === 'rider') navigate('/rider');
        else if (role === 'merchant') navigate('/merchant');
        else if (role === 'admin' || role === 'manager') navigate('/admin');
        else setError(holdMsg);
        return;
      }

      if (user.role === 'rider') navigate('/rider');
      else {
        const pending =
          (user.role === 'rider' || user.role === 'merchant') &&
          user.verificationStatus &&
          user.verificationStatus !== 'approved' &&
          !(user.role === 'rider' && user.documentsReuploadRequired);
        const appRole = pending ? 'customer' : user.role;
        if (appRole === 'admin' || appRole === 'manager' || user.role === 'admin' || user.role === 'manager') navigate('/admin');
        else if (appRole === 'merchant') navigate('/merchant');
        else if (appRole === 'rider') navigate('/rider');
        else navigate(location.state?.from || '/dashboard');
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'LOGIN_LOCKED' || err.response?.status === 429) {
        setError(data?.message || 'Too many attempts. Try again later.');
      } else if (data?.code === 'ACCOUNT_FROZEN' || err.response?.status === 403) {
        setError(data?.message || 'Your account is frozen. Contact support.');
      } else {
        setError(data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div className="text-center mb-4">
          <Link to="/" style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <BrandLogo size={28} /> {platformName}
          </Link>
          <h2 style={{ marginTop: 16, fontSize: 22 }}>{t('auth.loginTitle')}</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            {fromBooking ? 'Login to complete your booking' : 'Login to continue'}
          </p>
        </div>

        {fromBooking && (
          <div style={{ background: '#f0fdf4', color: '#166534', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            Your delivery details are saved. After login, your job will be created automatically.
          </div>
        )}

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Logging in...' : fromBooking ? 'Login & Complete Booking' : 'Login'}
          </button>
        </form>

        <p className="text-center mt-4" style={{ fontSize: 14, color: 'var(--gray-500)' }}>
          {t('auth.noAccount')}{' '}
          <Link to="/register" state={{ fromBooking }} style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign up</Link>
        </p>
        <p className="text-center mt-2" style={{ fontSize: 13 }}>
          <Link to="/become-a-rider" style={{ color: 'var(--gray-500)' }}>Want to become a rider?</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
