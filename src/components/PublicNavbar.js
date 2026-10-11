import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo, useBranding } from '../context/BrandingContext';
import HamburgerButton from './HamburgerButton';
import MobileMenu from './MobileMenu';
import { useI18n } from '../context/I18nContext';

const PublicNavbar = () => {
  const { isAuthenticated, user } = useAuth();
  const { platformName } = useBranding();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const dashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'rider') return '/rider';
    if (user.role === 'admin') return '/admin';
    return '/dashboard';
  };

  const mobileLinks = [
    { to: '/how-it-works', label: t('nav.howItWorks') },
    { to: '/for-riders', label: t('nav.forRiders') },
    { to: '/pricing', label: t('nav.pricing') },
    { to: '/terms-customers', label: 'Terms' },
    ...(isAuthenticated
      ? [{ to: dashboardLink(), label: t('nav.dashboard') }]
      : [
          { to: '/login', label: t('nav.login') },
          { to: '/register', label: t('nav.register') },
          { to: '/become-a-rider', label: t('landing.ctaRider') },
        ]),
  ];

  return (
    <nav className="sticky top-0 z-[200] bg-primary text-white shadow-md">
      <div className="container flex items-center justify-between min-h-[64px] gap-3">
        <Link to="/" className="flex items-center gap-2.5 font-extrabold text-lg text-white shrink-0">
          <BrandLogo size={44} />
          <span className="truncate max-w-[140px] sm:max-w-[180px]">{platformName}</span>
        </Link>

        <div className="hidden md:flex items-center gap-5 text-sm font-medium">
          <Link to="/how-it-works" className="text-white/90 hover:text-white">{t('nav.howItWorks')}</Link>
          <Link to="/for-riders" className="text-white/90 hover:text-white">{t('nav.forRiders')}</Link>
          <Link to="/pricing" className="text-white/90 hover:text-white">{t('nav.pricing')}</Link>
{isAuthenticated ? (
            <Link to={dashboardLink()} className="rounded-lg bg-white text-primary px-4 py-2 font-semibold hover:bg-primary-light">
              {t('nav.dashboard')}
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-white/90 hover:text-white">{t('nav.login')}</Link>
              <Link to="/register" className="rounded-lg bg-white text-primary px-4 py-2 font-semibold hover:bg-primary-light">
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-1">
          <HamburgerButton open={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={mobileLinks} variant="public" />
    </nav>
  );
};

export default PublicNavbar;
