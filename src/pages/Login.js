import PublicNavbar from '../components/PublicNavbar';
import { useBranding, BrandLogo } from '../context/BrandingContext';
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getPendingBooking, createJobFromPending } from '../utils/pendingBooking';
import { ensureCloudinaryUrl } from '../services/upload';

const Login = () => {
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

      // Complete pending guest booking if any
      if (getPendingBooking() && user.role === 'customer') {
        try {
          const job = await createJobFromPending(api, user, ensureCloudinaryUrl);
          if (job) {
            navigate(`/track/${job._id}`);
            return;
          }
        } catch (jobErr) {
          console.error(jobErr);
          setError(jobErr.response?.data?.message || 'Logged in, but failed to create your delivery. Please book again from Dashboard.');
          setLoading(false);
          return;
        }
      }

      if (user.role === 'rider') navigate('/rider');
      else if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'merchant') navigate('/merchant');
      else navigate(location.state?.from || '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
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
          <h2 style={{ marginTop: 16, fontSize: 22 }}>Welcome back</h2>
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
          Don't have an account?{' '}
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
