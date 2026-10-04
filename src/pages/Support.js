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
  const [recipientType, setRecipientType] = useState('admin');
  const [riderId, setRiderId] = useState('');
  const [merchantRiders, setMerchantRiders] = useState([]);

  const isAdmin = user?.role === 'admin';
  const isMerchant = user?.role === 'merchant';
  const isRider = user?.role === 'rider';
  // Fleet rider = linked to a merchant
  const isFleetRider = isRider && !!user?.merchantId;

  useEffect(() => {
    if (isMerchant) {
      api
        .get('/api/merchant/riders')
        .then((res) => setMerchantRiders(res.data.riders || []))
        .catch(() => {});
    }
  }, [isMerchant]);

  // Default recipient for fleet riders
  useEffect(() => {
    if (isFleetRider) setRecipientType('merchant');
    else if (isRider) setRecipientType('admin');
  }, [isFleetRider, isRider]);

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
      let type = 'admin';
      let rid;
      if (isMerchant) {
        type = recipientType;
        rid = recipientType === 'rider' ? riderId : undefined;
      } else if (isFleetRider) {
        type = recipientType; // merchant | admin
      } else {
        type = 'admin'; // independent rider / customer
      }

      await api.post('/api/support', {
        subject,
        message,
        recipientType: type,
        riderId: rid,
      });
      setSubject('');
      setMessage('');
      setShowNew(false);
      setRecipientType(isFleetRider ? 'merchant' : isMerchant ? 'admin' : 'admin');
      setRiderId('');
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

  // Admin: all. Merchant: only merchant_rider channel. Rider/customer: never.
  const canCloseSelected = () => {
    if (!selected || selected.status === 'closed') return false;
    if (isAdmin) return true;
    if (isMerchant && selected.channel === 'merchant_rider') return true;
    return false;
  };

  const closeTicket = async () => {
    if (!canCloseSelected()) {
      alert('You cannot close this ticket.');
      return;
    }
    try {
      await api.put(`/api/support/${selected._id}/close`);
      setSelected(null);
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close');
    }
  };

  const channelLabel = (t) => {
    if (t.channel === 'merchant_rider') return 'Fleet chat';
    return 'Support';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RoleNavbar />

      <div className="container" style={{ padding: '20px 16px', maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>{isAdmin ? 'Support Tickets' : 'Support'}</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {isAdmin && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-200)' }}
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="waiting_for_support">Waiting support</option>
                <option value="waiting_for_user">Waiting user</option>
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
              {/* Merchant: admin / one rider / all riders */}
              {isMerchant && (
                <>
                  <div className="form-group">
                    <label>Send to</label>
                    <select value={recipientType} onChange={(e) => setRecipientType(e.target.value)}>
                      <option value="admin">Admin / Support</option>
                      <option value="all_riders">All my riders</option>
                      <option value="rider">One rider</option>
                    </select>
                  </div>
                  {recipientType === 'rider' && (
                    <div className="form-group">
                      <label>Rider</label>
                      <select value={riderId} onChange={(e) => setRiderId(e.target.value)} required>
                        <option value="">Select rider</option>
                        {merchantRiders.map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.name} ({r.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Fleet rider only: merchant or admin support */}
              {isFleetRider && (
                <div className="form-group">
                  <label>Send to</label>
                  <select value={recipientType} onChange={(e) => setRecipientType(e.target.value)}>
                    <option value="merchant">My merchant</option>
                    <option value="admin">Admin / Support</option>
                  </select>
                </div>
              )}

              {/* Independent rider / customer: no select — goes to admin */}
              {isRider && !isFleetRider && (
                <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
                  Your message will be sent to platform support (admin).
                </p>
              )}

              <div className="form-group">
                <label>Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="e.g. Issue with delivery"
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder="Describe your issue..."
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary">
                  Send
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNew(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Ticket detail / chat */}
        {selected ? (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, margin: 0 }}>{selected.subject}</h2>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                  {selected.ticketId} · {channelLabel(selected)} · {selected.status}
                </div>
              </div>
              <span className="badge badge-info">{selected.status}</span>
            </div>

            {isAdmin && selected.user && (
              <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
                From: {selected.user.name || selected.user.email} ({selected.user.role})
              </div>
            )}

            <div style={{ marginBottom: 16, maxHeight: 360, overflowY: 'auto' }}>
              {(selected.messages || []).map((m, i) => {
                const mine =
                  String(m.sender?._id || m.sender) === String(user?._id || user?.id);
                return (
                  <div
                    key={i}
                    style={{
                      marginBottom: 10,
                      padding: 12,
                      borderRadius: 10,
                      background: mine ? '#ecfdf5' : 'var(--gray-50)',
                      border: '1px solid var(--gray-100)',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 4 }}>
                      {m.sender?.name || m.senderRole || 'User'}
                      {m.senderRole ? ` · ${m.senderRole}` : ''}
                      {m.createdAt ? ` · ${new Date(m.createdAt).toLocaleString()}` : ''}
                    </div>
                    <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{m.message}</div>
                  </div>
                );
              })}
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
                  {canCloseSelected() && (
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
                <button type="button" className="btn btn-primary" onClick={() => setShowNew(true)}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14 }}>{t.subject}</strong>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className="badge badge-info" style={{ fontSize: 11 }}>
                        {channelLabel(t)}
                      </span>
                      <span className="badge badge-info">{t.status}</span>
                    </div>
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
