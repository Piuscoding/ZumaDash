import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const isPdfUrl = (url) => {
  const u = String(url || '').toLowerCase();
  if (!u) return false;
  if (u.includes('/image/upload/')) return false; // Cloudinary image
  if (u.includes('/uploads/documents/')) return /\.pdf(\?|$)/.test(u) || !/\.(jpe?g|png|gif|webp|mp4|webm)(\?|$)/.test(u);
  return /\.pdf(\?|$)/.test(u) || u.includes('/raw/upload');
};

const MediaCard = ({ url, label, onDelete }) => {
  const [broken, setBroken] = useState(false);
  if (!url) return null;
  const pdf = isPdfUrl(url);

  return (
    <div style={{ marginBottom: 12, maxWidth: 200 }}>
      {!pdf && !broken ? (
        <a href={url} target="_blank" rel="noreferrer noopener">
          <img
            src={url}
            alt={label || ''}
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            style={{
              width: 160,
              height: 160,
              objectFit: 'cover',
              borderRadius: 12,
              border: '1px solid var(--gray-200)',
              display: 'block',
              background: '#f9fafb',
            }}
          />
        </a>
      ) : (
        <div
          style={{
            width: 160,
            height: 100,
            borderRadius: 12,
            border: '1px solid var(--gray-200)',
            background: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            color: 'var(--gray-500)',
            padding: 8,
            textAlign: 'center',
          }}
        >
          {pdf ? 'Document / PDF' : 'Preview unavailable'}
        </div>
      )}
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        <a href={url} target="_blank" rel="noreferrer noopener" style={{ fontSize: 12, fontWeight: 600 }}>
          Open
        </a>
        <a href={url} download target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
          Download
        </a>
        {onDelete && (
          <button type="button" onClick={() => onDelete(url)} style={{ fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

const KycReview = () => {
  const { user } = useAuth();
  const canAct = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('under_review');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    setErr('');
    try {
      const res = await api.get('/api/admin/customers/kyc', { params: { status: filter || undefined } });
      setList(res.data.customers || []);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to load KYC');
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const act = async (id, action) => {
    setMsg('');
    setErr('');
    const note = action === 'reject' ? window.prompt('Rejection reason') || 'Documents could not be verified' : undefined;
    try {
      await api.put(`/api/admin/customers/${id}/kyc`, { action, note });
      setMsg(`KYC ${action}d`);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Action failed');
    }
  };

  const deleteMedia = async (customerId, field, url) => {
    if (!window.confirm('Delete this document from the user record?')) return;
    try {
      await api.delete('/api/admin/media', { data: { customerId, field, url } });
      setMsg('Document removed');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Customer KYC</h2>
      {msg && <p style={{ color: 'var(--success)' }}>{msg}</p>}
      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
      <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginBottom: 12 }}>
        <option value="under_review">Under review</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="">All submitted</option>
      </select>
      {list.length === 0 && <p style={{ color: 'var(--gray-500)' }}>No submissions.</p>}
      {list.map((c) => {
        const d = c.kycData || {};
        const open = !!expanded[c._id];
        return (
          <div key={c._id} style={{ borderTop: '1px solid var(--gray-200)', padding: '14px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong>{c.name}</strong>
                <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                  {c.email} · {c.phone}
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  Type: <strong>{c.kycType || '—'}</strong> · Status: <span className="badge">{c.kycStatus}</span>
                  {c.kycRejectReason ? <span style={{ color: 'var(--danger)' }}> — {c.kycRejectReason}</span> : null}
                </div>
              </div>
              <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setExpanded((e) => ({ ...e, [c._id]: !open }))}>
                {open ? 'Hide details' : 'View all details'}
              </button>
            </div>

            {open && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--gray-50)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
                  {d.ninNumber && (
                    <div>
                      <strong>NIN number:</strong> {d.ninNumber}
                    </div>
                  )}
                  {d.licenceNumber && (
                    <div>
                      <strong>Licence number:</strong> {d.licenceNumber}
                    </div>
                  )}
                  {d.licenceExpiry && (
                    <div>
                      <strong>Licence expiry:</strong> {String(d.licenceExpiry).slice(0, 10)}
                    </div>
                  )}
                  {d.reviewedAt && (
                    <div>
                      <strong>Reviewed:</strong> {new Date(d.reviewedAt).toLocaleString()}
                    </div>
                  )}
                  <div>
                    <strong>Submitted:</strong> {c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  <MediaCard
                    url={d.ninPhotoUrl}
                    label="NIN photo / document"
                    onDelete={isAdmin ? () => deleteMedia(c._id, 'kycData.ninPhotoUrl', d.ninPhotoUrl) : undefined}
                  />
                  <MediaCard
                    url={d.licenceFrontUrl}
                    label="Licence front"
                    onDelete={isAdmin ? () => deleteMedia(c._id, 'kycData.licenceFrontUrl', d.licenceFrontUrl) : undefined}
                  />
                  <MediaCard
                    url={d.licenceBackUrl}
                    label="Licence back"
                    onDelete={isAdmin ? () => deleteMedia(c._id, 'kycData.licenceBackUrl', d.licenceBackUrl) : undefined}
                  />
                  <MediaCard
                    url={d.selfieUrl}
                    label="Selfie"
                    onDelete={isAdmin ? () => deleteMedia(c._id, 'kycData.selfieUrl', d.selfieUrl) : undefined}
                  />
                </div>
              </div>
            )}

            {c.kycStatus === 'under_review' && canAct && (
              <div style={{ marginTop: 10, gap: 8, display: 'flex' }}>
                <button type="button" className="btn btn-primary" onClick={() => act(c._id, 'approve')}>
                  Approve
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => act(c._id, 'reject')}>
                  Reject
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default KycReview;
