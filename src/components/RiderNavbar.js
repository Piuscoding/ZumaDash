import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo, useBranding } from '../context/BrandingContext';
import NotificationBell from './NotificationBell';
import HamburgerButton from './HamburgerButton';
import MobileMenu from './MobileMenu';

const RiderNavbar = () => {
  const { logout } = useAuth();
  const { platformName } = useBranding();
  const [menuOpen, setMenuOpen] = useState(false);

  const mobileLinks = [
    { to: '/rider', label: 'Dashboard' },
    { to: '/rider/jobs', label: 'Available Jobs' },
    { to: '/rider/earnings', label: 'Earnings' },
    { to: '/rider/history', label: 'Job History' },
    { to: '/profile', label: 'Profile & Documents' },
    { to: '/support', label: 'Support' },
    { label: 'Logout', onClick: logout },
  ];

  return (
    <nav className="sticky top-0 z-[200] bg-primary text-white shadow-md">
      <div className="container flex items-center justify-between min-h-[64px] gap-3">
        <Link to="/rider" className="flex items-center gap-2.5 font-extrabold text-lg text-white shrink-0">
          <BrandLogo size={44} />
          <span className="truncate max-w-[120px] sm:max-w-[160px]">{platformName}</span>
        </Link>

        <div className="hidden md:flex items-center gap-4 text-sm font-medium">
          <Link to="/rider/jobs" className="text-white/90 hover:text-white">Jobs</Link>
          <Link to="/rider/earnings" className="text-white/90 hover:text-white">Earnings</Link>
          <Link to="/rider/history" className="text-white/90 hover:text-white">History</Link>
          <Link to="/support" className="text-white/90 hover:text-white">Support</Link>
          <Link to="/profile" className="text-white/90 hover:text-white">Profile</Link>
          <NotificationBell />
          <button type="button" onClick={logout} className="text-white/80 hover:text-white text-sm font-medium bg-transparent">
            Logout
          </button>
        </div>

        <div className="flex md:hidden items-center gap-1">
          <NotificationBell />
          <HamburgerButton open={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={mobileLinks} variant="rider" />
    </nav>
  );
};

export default RiderNavbar;
