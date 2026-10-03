import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const BrandingContext = createContext();

const DEFAULT_NAME = 'ZumaDash';
const DEFAULT_LOGO = '';

export const BrandingProvider = ({ children }) => {
  const [platformName, setPlatformName] = useState(
    () => localStorage.getItem('zumadash_platform_name') || DEFAULT_NAME
  );
  const [logoUrl, setLogoUrl] = useState(
    () => localStorage.getItem('zumadash_logo_url') || DEFAULT_LOGO
  );
  const [loaded, setLoaded] = useState(false);

  const applyFavicon = useCallback((url) => {
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (url) {
      link.href = url;
      link.type = 'image/png';
    } else {
      link.href =
        'data:image/svg+xml,' +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⛰</text></svg>`
        );
      link.type = 'image/svg+xml';
    }
  }, []);

  const applyDocumentTitle = useCallback((name) => {
    document.title = `${name} | Delivery for Dutse, Kubwa & Bwari`;
  }, []);

  const refreshBranding = useCallback(async () => {
    try {
      const res = await api.get('/api/settings');
      const s = res.data.settings || {};
      const name = s.platformName || DEFAULT_NAME;
      const logo = s.logoUrl || s.platformLogo || DEFAULT_LOGO;
      setPlatformName(name);
      setLogoUrl(logo);
      localStorage.setItem('zumadash_platform_name', name);
      localStorage.setItem('zumadash_logo_url', logo || '');
      applyFavicon(logo);
      applyDocumentTitle(name);
    } catch (e) {
      applyFavicon(logoUrl);
      applyDocumentTitle(platformName);
    } finally {
      setLoaded(true);
    }
  }, [applyFavicon, applyDocumentTitle, logoUrl, platformName]);

  useEffect(() => {
    applyFavicon(logoUrl);
    applyDocumentTitle(platformName);
    refreshBranding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BrandingContext.Provider
      value={{
        platformName,
        logoUrl,
        loaded,
        refreshBranding,
        hasCustomLogo: Boolean(logoUrl),
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
};

/** Logo mark – larger default so uploaded images are clear */
export const BrandLogo = ({ size = 40, className = '' }) => {
  const { logoUrl, platformName } = useBranding();
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={platformName}
        className={`object-contain rounded-lg bg-white/10 ${className}`}
        style={{ height: size, width: size, minWidth: size }}
      />
    );
  }
  return (
    <span
      className={`inline-flex items-center justify-center leading-none ${className}`}
      style={{ fontSize: size * 0.72 }}
      aria-hidden
    >
      ⛰
    </span>
  );
};

export default BrandingContext;
