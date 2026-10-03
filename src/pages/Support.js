import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import RoleNavbar from '../components/RoleNavbar';

const Support = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const isAdmin = user?.role === 'admin';

  const fetchTickets = async () => {
    try {
      const endpoint = isAdmin
        ? `/api/support${statusFilter ? `?status=${statusFilter}` : ''}`
        : '/api/support/my';
      const res = await api.get(endpoint);
      setTickets(res.data.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter]);

  const createTicket = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/support', { subject, message });
      setSubject('');
      setMessage('');
      setShowNew(false);
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create ticket');
    }
  };

  const openTicket = async (id) => {
    try {
      const res = await api.get(`/api/support/${id}`);
      setSelected(res.data.ticket);
      setShowNew(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not open ticket');
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    try {
      const res = await api.post(`/api/support/${selected._id}/reply`, { message: reply });
      setSelected(res.data.ticket);
      setReply('');
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reply');
    }
  };

  const closeTicket = async () => {
    try {
      await api.put(`/api/support/${selected._id}/close`);
      setSelected(null);
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RoleNavbar />

      <div className="container" style={{ padding: '20px 16px', maxWidth: 720 }}>
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            {isAdmin ? 'Support Tickets' : 'Support'}
          </h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {isAdmin && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1.5px solid var(--gray-200)',
                  fontSize: 13,
                }}
              >
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="closed">Closed</option>
              </select>
            )}
            {!isAdmin && !selected && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '10px 18px', fontSize: 14 }}
                onClick={() => {
                  setShowNew(true);
                  setSelected(null);
                }}
              >
                + New Ticket
              </button>
            )}
            {selected && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: 13 }}
                onClick={() => setSelected(null)}
              >
                ← Back to list
              </button>
            )}
          </div>
        </div>

        {/* New ticket form */}
        {showNew && !isAdmin && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>Create support ticket</h3>
            <form onSubmit={createTicket}>
              <div className="form-group">
                <label>Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="e.g. Issue with delivery ZD-123"
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  required
                  placeholder="Describe your issue clearly..."
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary">
                  Submit ticket
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNew(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Ticket detail (user or admin) */}
        {selected ? (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontSize: 16 }}>{selected.subject}</strong>
                <span className="badge badge-info" style={{ marginLeft: 8 }}>
                  {selected.status}
                </span>
                {selected.ticketId && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--gray-500)' }}>
                    {selected.ticketId}
                  </span>
                )}
                {isAdmin && selected.user && (
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 6 }}>
                    From: {selected.user.name} · {selected.user.email} · {selected.user.phone}
                    {selected.user.role && ` · ${selected.user.role}`}
                  </div>
                )}
              </div>
            </div>

            <div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 16 }}>
              {(selected.messages || []).map((m, i) => (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: 10,
                    background:
                      m.senderRole === 'admin' ? 'var(--primary-light)' : 'var(--gray-100)',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 4 }}>
                    <strong style={{ textTransform: 'capitalize' }}>{m.senderRole}</strong>
                    {' · '}
                    {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                  </div>
                  <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{m.message}</div>
                </div>
              ))}
            </div>

            {selected.status !== 'closed' && (
              <div>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder={isAdmin ? 'Reply as support...' : 'Type your reply...'}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    border: '1.5px solid var(--gray-200)',
                    marginBottom: 8,
                    fontSize: 14,
                  }}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-primary" onClick={sendReply}>
                    Send reply
                  </button>
                  {isAdmin && (
                    <button type="button" className="btn btn-secondary" onClick={closeTicket}>
                      Close ticket
                    </button>
                  )}
                </div>
              </div>
            )}
            {selected.status === 'closed' && (
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>This ticket is closed.</p>
            )}
          </div>
        ) : (
          !showNew &&
          (loading ? (
            <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Loading...</p>
          ) : tickets.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: 'var(--gray-500)', marginBottom: 16 }}>
                {isAdmin ? 'No tickets yet' : 'No support tickets yet'}
              </p>
              {!isAdmin && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowNew(true)}
                >
                  + Create your first ticket
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tickets.map((t) => (
                <button
                  key={t._id}
                  type="button"
                  className="card"
                  onClick={() => openTicket(t._id)}
                  style={{
                    padding: 14,
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: '1px solid var(--gray-100)',
                    background: 'white',
                    width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ fontSize: 14 }}>{t.subject}</strong>
                    <span className="badge badge-info">{t.status}</span>
                  </div>
                  {isAdmin && t.user && (
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                      {t.user.name || t.user.email} · {t.user.role}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                    {t.ticketId} · {new Date(t.updatedAt).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Support;
