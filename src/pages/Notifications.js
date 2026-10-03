import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import RoleNavbar from '../components/RoleNavbar';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const broadcastRefresh = () => {
    try {
      localStorage.setItem('zumadash_notif_refresh', String(Date.now()));
    } catch (e) {
      /* ignore */
    }
    window.dispatchEvent(new Event('zumadash-notif'));
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      broadcastRefresh();
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markOneRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      broadcastRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RoleNavbar />

      <div className="container" style={{ padding: '20px 16px', maxWidth: 600 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            Notifications
            {unreadCount > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--primary)',
                }}
              >
                ({unreadCount} unread)
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: 13 }}
              onClick={markAllRead}
            >
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--gray-500)' }}>No notifications yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifications.map((n) => (
              <div
                key={n._id}
                className="card"
                style={{
                  padding: 14,
                  borderLeft: n.isRead ? '3px solid transparent' : '3px solid var(--primary)',
                  background: n.isRead ? 'white' : '#f0fdf4',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{n.title}</strong>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => markOneRead(n._id)}
                      style={{
                        background: 'none',
                        color: 'var(--primary)',
                        fontSize: 12,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--gray-700)', marginTop: 6 }}>{n.message}</p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    fontSize: 12,
                    color: 'var(--gray-500)',
                  }}
                >
                  <span>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</span>
                  {n.link && (
                    <Link to={n.link} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      View →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
