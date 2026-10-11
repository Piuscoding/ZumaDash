import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/** Step 4 – Admin customer KYC review desk */
const KycReview = () => {
  const { user } = useAuth();
  const canDownload = user?.role === 'admin';
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('under_review');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/api/admin/customers/kyc', { params: { status: filter || undefined } });
      setList(res.data.customers || []);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to load KYC');
    }
  };

  useEffect(() => { load(); }, [filter]);

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
      {list.map((c) => (
        <div key={c._id} style={{ borderTop: '1px solid var(--gray-200)', padding: '12px 0' }}>
          <strong>{c.name}</strong> · {c.email} · {c.phone}
          <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>
            {c.kycType} · {c.kycStatus}
            {c.kycRejectReason ? ` — ${c.kycRejectReason}` : ''}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {c.kycData?.ninPhotoUrl && (canDownload ? <a href={c.kycData.ninPhotoUrl} target="_blank" rel="noreferrer">NIN photo</a> : <img src={c.kycData.ninPhotoUrl} alt="NIN" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />)}
            {c.kycData?.licenceFrontUrl && (canDownload ? <a href={c.kycData.licenceFrontUrl} target="_blank" rel="noreferrer">Licence front</a> : <img src={c.kycData.licenceFrontUrl} alt="Front" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />)}
            {c.kycData?.licenceBackUrl && (canDownload ? <a href={c.kycData.licenceBackUrl} target="_blank" rel="noreferrer">Licence back</a> : <img src={c.kycData.licenceBackUrl} alt="Back" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />)}
            {c.kycData?.selfieUrl && (canDownload ? <a href={c.kycData.selfieUrl} target="_blank" rel="noreferrer">Selfie</a> : <img src={c.kycData.selfieUrl} alt="Selfie" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />)}
          </div>
          {c.kycStatus === 'under_review' && (
            <div style={{ marginTop: 8, display: 8 }}>
              <button type="button" className="btn btn-primary" onClick={() => act(c._id, 'approve')}>Approve</button>
              <button type="button" className="btn btn-secondary" onClick={() => act(c._id, 'reject')}>Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default KycReview;
