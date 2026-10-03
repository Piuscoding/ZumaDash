import React from 'react';

const HamburgerButton = ({ open, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={open ? 'Close menu' : 'Open menu'}
    aria-expanded={open}
    className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition"
  >
    <span className={`block h-0.5 w-[18px] rounded bg-white transition ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
    <span className={`block h-0.5 w-[18px] rounded bg-white transition ${open ? 'opacity-0' : ''}`} />
    <span className={`block h-0.5 w-[18px] rounded bg-white transition ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
  </button>
);

export default HamburgerButton;
