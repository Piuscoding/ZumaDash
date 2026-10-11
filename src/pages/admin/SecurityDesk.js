import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SecurityDesk = () => {
  const { user } = useAuth();
  const canDownload = user?.role === 'admin';
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await api.get('/api/admin/security/users', {
        params: role ? { role } : {},
      });
      setUsers(res.data.users || []);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [role]);

  const act = async (fn, successMsg) => {
    setMsg('');
    setErr('');
    try {
      await fn();
      setMsg(successMsg);
      load();
      if (selected) {
        const res = await api.get('/api/admin/security/users', { params: role ? { role } : {} });
        const list = res.data.users || [];
        setUsers(list);
        setSelected(list.find((u) => u.id === selected.id) || null);
      }
    } catch (e) {
      setErr(e.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Security control plane</h2>
      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
        Verification, KYC, freeze, login lock, channel alerts, media. OTP codes are never shown — only last sent time.
      </p>
      {msg && <div style={{ background: '#f0fdf4', color: '#166534', padding: 10, borderRadius: 8, marginBottom: 10 }}>{msg}</div>}
      {err && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 10, borderRadius: 8, marginBottom: 10 }}>{err}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="rider">Riders</option>
          <option value="merchant">Merchants</option>
        </select>
        <button type="button" className="btn btn-secondary" onClick={load}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {users.map((u) => (
            <div
              key={u.id}
              className="card"
              style={{
                padding: 12,
                cursor: 'pointer',
                border: selected?.id === u.id ? '2px solid var(--primary)' : '1px solid var(--gray-200)',
              }}
              onClick={() => setSelected(u)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <strong>{u.name}</strong> · {u.role}
                  {u.isFrozen && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Frozen</span>}
                  {u.loginLocked && <span className="badge badge-warning" style={{ marginLeft: 6 }}>Login locked</span>}
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                    {u.email} · {u.phone}
                  </div>
                </div>
                <div style={{ fontSize: 12, textAlign: 'right' }}>
                  <div>WA: {u.whatsappVerified ? '✓' : '✗'} · Email: {u.emailVerified ? '✓' : '✗'}</div>
                  <div>KYC: {u.kycStatus}</div>
                  <div>Sessions: {u.activeSessionCount}</div>
                  <div style={{ color: (u.fraudScore || 0) >= 15 ? 'var(--danger)' : 'inherit' }}>
                    Fraud score: {u.fraudScore || 0}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="card" style={{ marginTop: 16, padding: 16, border: '2px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{selected.name}</h3>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
            <div>
              <strong>Role:</strong> {selected.role} · <strong>KYC:</strong> {selected.kycStatus}
              {selected.kycRejectReason ? ` (${selected.kycRejectReason})` : ''}
            </div>
            <div>
              <strong>WhatsApp verified:</strong> {selected.whatsappVerified ? 'Yes' : 'No'} ·{' '}
              <strong>Email verified:</strong> {selected.emailVerified ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Alerts:</strong> email {selected.emailAlertsEnabled ? 'ON' : 'OFF'} · WhatsApp{' '}
              {selected.whatsappAlertsEnabled ? 'ON' : 'OFF'}
            </div>
            <div>
              <strong>Frozen:</strong> {selected.isFrozen ? 'Yes' : 'No'} · <strong>Login lock:</strong>{' '}
              {selected.loginLocked ? `Until ${new Date(selected.loginLockedUntil).toLocaleString()}` : 'No'}
            </div>
            <div>
              <strong>Last OTP sent:</strong>{' '}
              {selected.lastOtpSentAt ? new Date(selected.lastOtpSentAt).toLocaleString() : '—'} (code never stored)
            </div>
            <div>
              <strong>Active sessions:</strong> {selected.activeSessionCount}
            </div>
            <div>
              <strong>Fraud score:</strong>{' '}
              <span style={{ color: (selected.fraudScore || 0) >= 15 ? 'var(--danger)' : 'inherit', fontWeight: 700 }}>
                {selected.fraudScore || 0}
              </span>
              {selected.freezeReason ? ` · ${selected.freezeReason}` : ''}
            </div>
            {selected.recentSignals?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <strong>Recent signals</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--gray-600)' }}>
                  {selected.recentSignals.map((s, i) => (
                    <li key={i}>
                      {s.type}
                      {s.detail ? ` — ${s.detail}` : ''}
                      {s.at ? ` · ${new Date(s.at).toLocaleString()}` : ''}
                      {s.ip ? ` · ${s.ip}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            {selected.media?.ninPhotoUrl && (
              canDownload ? (
              <a href={selected.media.ninPhotoUrl} target="_blank" rel="noreferrer">
                <img src={selected.media.ninPhotoUrl} alt="NIN" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ fontSize: 11 }}>NIN / onboarding</div>
              </a>
              ) : (
              <div>
                <img src={selected.media.ninPhotoUrl} alt="NIN" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ fontSize: 11 }}>NIN (no download)</div>
              </div>
              )
            )}
            {selected.media?.applicationSelfieUrl && (
              canDownload ? (
              <a href={selected.media.applicationSelfieUrl} target="_blank" rel="noreferrer">
                <img src={selected.media.applicationSelfieUrl} alt="Selfie" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ fontSize: 11 }}>Selfie</div>
              </a>
              ) : (
              <div>
                <img src={selected.media.applicationSelfieUrl} alt="Selfie" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ fontSize: 11 }}>Selfie (no download)</div>
              </div>
              )
            )}
            {selected.media?.licenceFrontUrl && (
              canDownload ? (
              <a href={selected.media.licenceFrontUrl} target="_blank" rel="noreferrer">
                <img src={selected.media.licenceFrontUrl} alt="Licence" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ fontSize: 11 }}>Licence front</div>
              </a>
              ) : (
              <div>
                <img src={selected.media.licenceFrontUrl} alt="Licence" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ fontSize: 11 }}>Licence (no download)</div>
              </div>
              )
            )}
            {selected.media?.kycSelfieUrl && selected.media.kycSelfieUrl !== selected.media.applicationSelfieUrl && (
              canDownload ? (
              <a href={selected.media.kycSelfieUrl} target="_blank" rel="noreferrer">
                <img src={selected.media.kycSelfieUrl} alt="KYC selfie" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ fontSize: 11 }}>KYC selfie</div>
              </a>
              ) : (
              <div>
                <img src={selected.media.kycSelfieUrl} alt="KYC selfie" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ fontSize: 11 }}>KYC selfie (no download)</div>
              </div>
              )
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
              onClick={() =>
                act(
                  () => api.put(`/api/admin/users/${selected.id}/freeze`, { freeze: !selected.isFrozen }),
                  selected.isFrozen ? 'Unfrozen' : 'Frozen'
                )
              }
            >
              {selected.isFrozen ? 'Unfreeze' : 'Freeze'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
              disabled={!selected.loginLocked}
              onClick={() => act(() => api.put(`/api/admin/users/${selected.id}/clear-login-lock`), 'Login lock cleared')}
            >
              Clear login lock
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
              onClick={() =>
                act(
                  () =>
                    api.put(`/api/admin/users/${selected.id}/channel-alerts`, {
                      emailAlertsEnabled: !selected.emailAlertsEnabled,
                    }),
                  'Email alerts toggled'
                )
              }
            >
              Toggle email alerts
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
              onClick={() =>
                act(
                  () =>
                    api.put(`/api/admin/users/${selected.id}/channel-alerts`, {
                      whatsappAlertsEnabled: !selected.whatsappAlertsEnabled,
                    }),
                  'WhatsApp alerts toggled'
                )
              }
            >
              Toggle WhatsApp alerts
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
              onClick={() =>
                act(
                  () =>
                    api.put(`/api/admin/users/${selected.id}/verify-channel`, {
                      whatsappVerified: !selected.whatsappVerified,
                    }),
                  'WhatsApp verification updated'
                )
              }
            >
              Toggle WA verified
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
              onClick={() =>
                act(
                  () =>
                    api.put(`/api/admin/users/${selected.id}/verify-channel`, {
                      emailVerified: !selected.emailVerified,
                    }),
                  'Email verification updated'
                )
              }
            >
              Toggle email verified
            </button>
            {selected.role === 'customer' && selected.kycStatus === 'under_review' && (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: 12 }}
                  onClick={() =>
                    act(() => api.put(`/api/admin/customers/${selected.id}/kyc`, { action: 'approve' }), 'KYC approved')
                  }
                >
                  Approve KYC
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 12 }}
                  onClick={() => {
                    const note = window.prompt('Rejection reason') || 'Documents could not be verified';
                    act(() => api.put(`/api/admin/customers/${selected.id}/kyc`, { action: 'reject', note }), 'KYC rejected');
                  }}
                >
                  Reject KYC
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDesk;
