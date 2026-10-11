import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../context/I18nContext';

/**
 * Floating language control (bottom-left), like reference:
 * closed: flag + short code + chevron
 * open: list of English, Hausa, Yoruba, Pidgin
 * Not placed in the navbar.
 */
const LanguageSwitcher = ({ floating = true, style = {} }) => {
  const { lang, setLang, langs } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = langs.find((l) => l.code === lang) || langs[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (code) => {
    setLang(code);
    setOpen(false);
  };

  const panel = open && (
    <div
      role="listbox"
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        left: 0,
        minWidth: 180,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
        border: '1px solid rgba(0,0,0,0.08)',
        overflow: 'hidden',
        zIndex: 50,
      }}
    >
      {langs.map((l) => {
        const active = l.code === lang;
        return (
          <button
            key={l.code}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => pick(l.code)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '12px 14px',
              border: 'none',
              background: active ? 'rgba(13,107,58,0.08)' : '#fff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: active ? 700 : 500,
              color: '#111',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{l.flag || '🌐'}</span>
            <span>{l.label}</span>
          </button>
        );
      })}
    </div>
  );

  if (!floating) {
    // Inline variant for Settings page
    return (
      <div ref={rootRef} style={{ position: 'relative', display: 'inline-block', ...style }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid var(--gray-200, #e5e7eb)',
            background: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <span style={{ fontSize: 18 }}>{current?.flag || '🌐'}</span>
          <span>{current?.label || 'English'}</span>
          <span style={{ opacity: 0.6, fontSize: 12 }}>{open ? '▴' : '▾'}</span>
        </button>
        {panel}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      style={{
        position: 'fixed',
        left: 16,
        bottom: 16,
        zIndex: 9990,
        ...style,
      }}
    >
      {panel}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Language"
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid rgba(0,0,0,0.12)',
          background: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: 14,
          color: '#111',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{current?.flag || '🌐'}</span>
        <span>{current?.short || 'EN'}</span>
        <span style={{ opacity: 0.55, fontSize: 11 }}>{open ? '▴' : '▾'}</span>
      </button>
    </div>
  );
};

export default LanguageSwitcher;
