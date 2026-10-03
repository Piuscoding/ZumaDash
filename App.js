import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Public Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import RiderApply from './pages/RiderApply';
import HowItWorks from './pages/HowItWorks';
import ForRiders from './pages/ForRiders';
import Terms from './pages/Terms';

// Customer Pages
import CustomerDashboard from './pages/customer/Dashboard';
import BookDelivery from './pages/customer/BookDelivery';
import MyDeliveries from './pages/customer/MyDeliveries';
import TrackDelivery from './pages/customer/TrackDelivery';

// Rider Pages
import RiderDashboard from './pages/rider/Dashboard';
import AvailableJobs from './pages/rider/AvailableJobs';
import RiderEarnings from './pages/rider/Earnings';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';

// Shared
import Notifications from './pages/Notifications';
import Support from './pages/Support';
import Profile from './pages/Profile';

const PrivateRoute = ({ children, roles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) {
    // Redirect based on role
    if (user.role === 'rider') return <Navigate to="/rider" />;
    if (user.role === 'admin') return <Navigate to="/admin" />;
    return <Navigate to="/dashboard" />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/become-a-rider" element={<RiderApply />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/for-riders" element={<ForRiders />} />
        <Route path="/terms" element={<Terms />} />

        {/* Customer */}
        <Route path="/dashboard" element={<PrivateRoute roles={['customer']}><CustomerDashboard /></PrivateRoute>} />
        <Route path="/book" element={<PrivateRoute roles={['customer']}><BookDelivery /></PrivateRoute>} />
        <Route path="/my-deliveries" element={<PrivateRoute roles={['customer']}><MyDeliveries /></PrivateRoute>} />
        <Route path="/track/:id" element={<PrivateRoute><TrackDelivery /></PrivateRoute>} />

        {/* Rider */}
        <Route path="/rider" element={<PrivateRoute roles={['rider']}><RiderDashboard /></PrivateRoute>} />
        <Route path="/rider/jobs" element={<PrivateRoute roles={['rider']}><AvailableJobs /></PrivateRoute>} />
        <Route path="/rider/earnings" element={<PrivateRoute roles={['rider']}><RiderEarnings /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />

        {/* Shared authenticated */}
        <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
        <Route path="/support" element={<PrivateRoute><Support /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
