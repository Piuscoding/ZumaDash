import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const NotificationBell = () => {
  const [unread, setUnread] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications');
      setUnread(res.data.unreadCount || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const onFocus = () => fetchCount();
    const onStorage = (e) => {
      if (e.key === 'zumadash_notif_refresh') fetchCount();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    window.addEventListener('zumadash-notif', onFocus);
    const interval = setInterval(fetchCount, 45000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('zumadash-notif', onFocus);
      clearInterval(interval);
    };
  }, [fetchCount]);

  return (
    <Link
      to="/notifications"
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/15 transition"
      aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
};

export default NotificationBell;
