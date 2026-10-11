import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo, useBranding } from '../context/BrandingContext';
import { useI18n } from '../context/I18nContext';
import HamburgerButton from './HamburgerButton';
import MobileMenu from './MobileMenu';

const AdminNavbar = () => {
  const { user, logout } = useAuth();
  const { platformName } = useBranding();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const mobileLinks = [
    { to: '/admin', label: t('nav.dashboard') },
    { to: '/admin/create-customer', label: t('admin.createCustomer') },
    { to: '/admin/book', label: t('admin.bookForCustomer') },
    { to: '/admin/applications', label: t('admin.applyForUser') },
    { to: '/support', label: t('nav.support') },
    { to: '/notifications', label: t('nav.notifications') },
    { to: '/profile', label: t('nav.profile') },
    { to: '/', label: t('admin.publicSite') },
    { label: t('nav.logout'), onClick: logout },
  ];

  return (
    <nav className="sticky top-0 z-[200] bg-secondary text-white shadow-md">
      <div className="container flex items-center justify-between min-h-[64px] gap-3">
        <Link to="/admin" className="flex items-center gap-2.5 font-extrabold text-lg text-white shrink-0">
          <BrandLogo size={44} />
          <span className="truncate max-w-[140px] sm:max-w-[200px]">{platformName} {t('admin.adminLabel')}</span>
        </Link>

        <div className="hidden lg:flex items-center gap-3 text-sm font-medium flex-wrap justify-end">
          <Link to="/admin/create-customer" className="text-white/90 hover:text-white">{t('admin.createCustomer')}</Link>
          <Link to="/admin/book" className="text-white/90 hover:text-white">{t('admin.bookForCustomer')}</Link>
          <Link to="/admin/applications" className="text-white/90 hover:text-white">{t('admin.applyForUser')}</Link>
          <span className="text-white/50">|</span>
          <span className="text-white/70 text-xs">{user?.name}</span>
          <Link to="/" className="text-white/90 hover:text-white">{t('admin.publicSite')}</Link>
          <button type="button" onClick={logout} className="text-white/80 hover:text-white text-sm font-medium bg-transparent">
            {t('nav.logout')}
          </button>
        </div>

        <div className="flex lg:hidden items-center">
          <HamburgerButton open={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={mobileLinks} variant="admin" />
    </nav>
  );
};

export default AdminNavbar;
