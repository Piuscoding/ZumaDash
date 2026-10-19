/** Pending rider/merchant applicants keep customer UX until admin approves */
export function effectiveAppRole(user) {
  if (!user) return null;
  if (user.role === 'admin' || user.role === 'manager') return user.role;
  if (user.role === 'rider' || user.role === 'merchant') {
    if (user.verificationStatus && user.verificationStatus !== 'approved') {
      return 'customer';
    }
  }
  return user.role;
}

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Public Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyWhatsApp from './pages/VerifyWhatsApp';
import AdminCreateCustomer from './pages/admin/AdminCreateCustomer';
import AdminBookDelivery from './pages/admin/AdminBookDelivery';
import AdminRiderApply from './pages/admin/AdminRiderApply';
import LanguageSwitcher from './components/LanguageSwitcher';
import DeviceOtp from './pages/DeviceOtp';
import RiderApply from './pages/RiderApply';
import RiderPublic from './pages/RiderPublic';
import HowItWorks from './pages/HowItWorks';
import ForRiders from './pages/ForRiders';
import Terms from './pages/Terms';
import Pricing from './pages/Pricing';
import TermsCustomers from './pages/TermsCustomers';
import TermsRiders from './pages/TermsRiders';
import TermsMerchants from './pages/TermsMerchants';

// Customer Pages
import CustomerDashboard from './pages/customer/Dashboard';
import BookDelivery from './pages/customer/BookDelivery';
import MyDeliveries from './pages/customer/MyDeliveries';
import TrackDelivery from './pages/customer/TrackDelivery';

// Rider Pages
import RiderDashboard from './pages/rider/Dashboard';
import AvailableJobs from './pages/rider/AvailableJobs';
import RiderEarnings from './pages/rider/Earnings';
import PayCommission from './pages/rider/PayCommission';
import JobHistory from './pages/rider/JobHistory';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';

// Merchant Pages
import MerchantDashboard from './pages/merchant/Dashboard';
import BookSelf from './pages/merchant/BookSelf';
import AddFleet from './pages/merchant/AddFleet';
import RiderControls from './pages/merchant/RiderControls';

// Shared
import Notifications from './pages/Notifications';
import Support from './pages/Support';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

const PrivateRoute = ({ children, roles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  const channelVerified =
    user?.whatsappVerified === true || user?.emailVerified === true;
  if (user?.role !== 'admin' && user?.role !== 'manager' && !channelVerified) {
    return <Navigate to="/verify-whatsapp" replace />;
  }
  const appRole = effectiveAppRole(user);
  // Pending rider/merchant applicants use customer routes until approved
  if (roles && !roles.includes(appRole) && !(roles.includes('customer') && appRole === 'customer')) {
    if (appRole === 'rider') return <Navigate to="/rider" />;
    if (appRole === 'admin' || appRole === 'manager') return <Navigate to="/admin" />;
    if (appRole === 'merchant') return <Navigate to="/merchant" />;
    return <Navigate to="/dashboard" />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <LanguageSwitcher floating />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-whatsapp" element={<VerifyWhatsApp />} />
        <Route path="/device-otp" element={<DeviceOtp />} />
        <Route path="/become-a-rider" element={<RiderApply />} />
        <Route path="/riders/:id" element={<PrivateRoute><RiderPublic /></PrivateRoute>} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/for-riders" element={<ForRiders />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/terms-customers" element={<TermsCustomers />} />
        <Route path="/terms-riders" element={<TermsRiders />} />
        <Route path="/terms-merchants" element={<TermsMerchants />} />

        {/* Customer */}
        <Route path="/dashboard" element={<PrivateRoute roles={['customer']}><CustomerDashboard /></PrivateRoute>} />
        <Route path="/book" element={<BookDelivery />} />
        <Route path="/my-deliveries" element={<PrivateRoute roles={['customer']}><MyDeliveries /></PrivateRoute>} />
        <Route path="/track/:id" element={<PrivateRoute><TrackDelivery /></PrivateRoute>} />

        {/* Rider */}
        <Route path="/rider" element={<PrivateRoute roles={['rider']}><RiderDashboard /></PrivateRoute>} />
        <Route path="/rider/jobs" element={<PrivateRoute roles={['rider']}><AvailableJobs /></PrivateRoute>} />
        <Route path="/rider/earnings" element={<PrivateRoute roles={['rider']}><RiderEarnings /></PrivateRoute>} />
        <Route path="/rider/history" element={<PrivateRoute roles={['rider']}><JobHistory /></PrivateRoute>} />
        <Route path="/rider/commission" element={<PrivateRoute roles={['rider']}><PayCommission /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<PrivateRoute roles={['admin', 'manager']}><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/create-customer" element={<PrivateRoute roles={['admin', 'manager']}><AdminCreateCustomer /></PrivateRoute>} />
        <Route path="/admin/book" element={<PrivateRoute roles={['admin', 'manager']}><AdminBookDelivery /></PrivateRoute>} />
        <Route path="/admin/applications" element={<PrivateRoute roles={['admin', 'manager']}><AdminRiderApply /></PrivateRoute>} />

        {/* Merchant */}
        <Route path="/merchant" element={<PrivateRoute roles={['merchant']}><MerchantDashboard /></PrivateRoute>} />
        <Route path="/merchant/book" element={<PrivateRoute roles={['merchant']}><BookSelf /></PrivateRoute>} />
        <Route path="/merchant/add-fleet" element={<PrivateRoute roles={['merchant']}><AddFleet /></PrivateRoute>} />
        <Route path="/merchant/riders/:id/controls" element={<PrivateRoute roles={['merchant']}><RiderControls /></PrivateRoute>} />

        {/* Shared authenticated */}
        <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
        <Route path="/support" element={<PrivateRoute><Support /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
