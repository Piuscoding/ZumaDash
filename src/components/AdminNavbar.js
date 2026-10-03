import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo, useBranding } from '../context/BrandingContext';
import HamburgerButton from './HamburgerButton';
import MobileMenu from './MobileMenu';

const AdminNavbar = () => {
  const { user, logout } = useAuth();
  const { platformName } = useBranding();
  const [menuOpen, setMenuOpen] = useState(false);

  const mobileLinks = [
    { to: '/admin', label: 'Admin Dashboard' },
    { to: '/support', label: 'Support Tickets' },
    { to: '/notifications', label: 'Notifications' },
    { to: '/profile', label: 'My Profile' },
    { to: '/', label: 'View Public Site' },
    { label: 'Logout', onClick: logout },
  ];

  return (
    <nav className="sticky top-0 z-[200] bg-secondary text-white shadow-md">
      <div className="container flex items-center justify-between min-h-[64px] gap-3">
        <Link to="/admin" className="flex items-center gap-2.5 font-extrabold text-lg text-white shrink-0">
          <BrandLogo size={44} />
          <span className="truncate max-w-[140px] sm:max-w-[200px]">{platformName} Admin</span>
        </Link>

        <div className="hidden md:flex items-center gap-4 text-sm font-medium">
          <span className="text-white/70 text-xs sm:text-sm">{user?.name}</span>
          <Link to="/" className="text-white/90 hover:text-white">Public site</Link>
          <button type="button" onClick={logout} className="text-white/80 hover:text-white text-sm font-medium bg-transparent">
            Logout
          </button>
        </div>

        <div className="flex md:hidden items-center">
          <HamburgerButton open={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={mobileLinks} variant="admin" />
    </nav>
  );
};

export default AdminNavbar;
