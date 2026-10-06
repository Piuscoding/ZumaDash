import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo, useBranding } from '../context/BrandingContext';

/**
 * Slide-from-right overlay. Dark panel so white/green links stay readable.
 */
const MobileMenu = ({ open, onClose, links, variant = 'public' }) => {
  const { platformName } = useBranding();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isAdmin = variant === 'admin';

  return (
    <>
      <div
        className={`fixed inset-0 z-[300] bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`fixed top-0 right-0 bottom-0 z-[310] w-[min(320px,88vw)] flex flex-col shadow-2xl transition-transform duration-300 ease-out
          ${isAdmin ? 'bg-secondary' : 'bg-primary-dark'}
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label="Navigation menu"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 text-white font-extrabold text-lg">
            <BrandLogo size={42} />
            <span className="truncate max-w-[160px]">{platformName}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25"
            aria-label="Close menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-10">
          {links.map((item) =>
            item.onClick ? (
              <button
                key={item.label}
                type="button"
                className="w-full text-left px-4 py-3.5 rounded-xl text-[16px] font-semibold text-white hover:bg-white/15 transition"
                onClick={() => {
                  item.onClick();
                  onClose();
                }}
              >
                {item.label}
              </button>
            ) : (
              <Link
                key={item.to + item.label}
                to={item.to}
                className="block px-4 py-3.5 rounded-xl text-[16px] font-semibold text-white hover:bg-white/15 transition"
                onClick={onClose}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="px-5 py-4 border-t border-white/10 text-xs text-white/50">
          Dutse · Kubwa · Bwari · Ushafa
        </div>
      </aside>
    </>
  );
};

export default MobileMenu;
