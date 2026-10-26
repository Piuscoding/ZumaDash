import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { registerPush } from '../services/push';
import RoleNavbar from '../components/RoleNavbar';
import { uploadFile } from '../services/upload';

const CORRIDOR_HINT = 'Must include one of: Dutse, Kubwa, Bwari, Ushafa';

function hasCorridor(text) {
  const t = String(text || '').toLowerCase();
  return ['dutse', 'kubwa', 'bwari', 'ushafa'].some((c) => t.includes(c));
}

const Profile = () => {
  const { user, logout, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [addresses, setAddresses] = useState([]);
  const [newAddr, setNewAddr] = useState({ label: '', description: '', zone: '' });
  const [bikeForm, setBikeForm] = useState({
    plate: '',
    model: '',
    color: '',
    photoUrls: [],
    documentUrls: [],
    videoUrl: '',
  });
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState('profile');

  const back =
    user?.role === 'rider'
      ? '/rider'
      : user?.role === 'admin' || user?.role === 'manager'
        ? '/admin'
        : user?.role === 'merchant'
          ? '/merchant'
          : '/dashboard';

  const addressLocked =
    user?.addressLockedUntil && new Date(user.addressLockedUntil).getTime() > Date.now();

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
      });
      if (user.bikeDetails?.[0]) {
        const b = user.bikeDetails[0];
        setBikeForm({
          plate: b.plateNumber || b.plate || '',
          model: b.model || '',
          color: b.color || '',
          photoUrls: b.photoUrls || (b.photoUrl ? [b.photoUrl] : []),
          documentUrls: b.documentUrls || (b.papersUrl ? [b.papersUrl] : []),
          videoUrl: b.videoUrl || '',
        });
      }
    }
    if (user?.role === 'customer' || user?.role === 'rider' || user?.role === 'merchant') {
      api
        .get('/api/users/addresses')
        .then((res) => setAddresses(res.data.addresses || []))
        .catch(() => {});
    }
  }, [user]);

  const [photoUploading, setPhotoUploading] = useState(false);

  const uploadPhoto = async (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    setPhotoUploading(true);
    setMessage('');
    try {
      const url = await uploadFile(file, 'zumadash/profiles');
      await api.put('/api/users/me', { profilePhoto: url });
      if (refreshUser) await refreshUser();
      setMessage('Profile photo updated');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const payload = { name: form.name, phone: form.phone };
      if (!addressLocked) {
        const addr = String(form.address || '').trim();
        if (addr && !hasCorridor(addr)) {
          setMessage(`Invalid address — ${CORRIDOR_HINT}`);
          setLoading(false);
          return;
        }
        payload.address = addr;
      }
      await api.put('/api/users/me', payload);
      if (refreshUser) await refreshUser();
      setMessage(
        addressLocked
          ? 'Profile updated (address is locked)'
          : 'Profile updated. Address locked for 30 days.'
      );
    } catch (err) {
      setMessage(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const addAddress = async (e) => {
    e.preventDefault();
    if (!hasCorridor(newAddr.description)) {
      setMessage(`Invalid address — ${CORRIDOR_HINT}`);
      return;
    }
    try {
      const res = await api.post('/api/users/addresses', newAddr);
      setAddresses(res.data.addresses || []);
      setNewAddr({ label: '', description: '', zone: '' });
      setMessage('Address saved');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save address');
    }
  };

  const deleteAddress = async (id) => {
    try {
      const res = await api.delete(`/api/users/addresses/${id}`);
      setAddresses(res.data.addresses || []);
      setMessage('Address removed');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to delete');
    }
  };

  const canEditDocs = !!user?.documentsReuploadRequired;
  const docsUnderReview =
    user?.verificationStatus === 'under_review' && !user?.documentsReuploadRequired;

  const onBikePhotos = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    if (!files.length || !canEditDocs) return;
    setUploading(true);
    setMessage('');
    try {
      const urls = [];
      for (const file of files) {
        const url = await uploadFile(file, 'zumadash/rider/bike');
        if (url) urls.push(url);
      }
      setBikeForm((f) => ({ ...f, photoUrls: [...(f.photoUrls || []), ...urls].slice(0, 10) }));
    } catch (err) {
      setMessage(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onBikeDocs = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    if (!files.length || !canEditDocs) return;
    setUploading(true);
    setMessage('');
    try {
      const urls = [];
      for (const file of files) {
        const url = await uploadFile(file, 'zumadash/rider/docs');
        if (url) urls.push(url);
      }
      setBikeForm((f) => ({
        ...f,
        documentUrls: [...(f.documentUrls || []), ...urls].slice(0, 10),
      }));
    } catch (err) {
      setMessage(err.response?.data?.message || 'Document upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onBikeVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !canEditDocs) return;
    setUploading(true);
    setMessage('');
    try {
      const url = await uploadFile(file, 'zumadash/rider/bike-video');
      if (url) setBikeForm((f) => ({ ...f, videoUrl: url }));
    } catch (err) {
      setMessage(err.response?.data?.message || 'Video upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const saveBike = async (e) => {
    e.preventDefault();
    if (!canEditDocs) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await api.put('/api/users/rider-documents', {
        bikeDetails: [
          {
            plateNumber: bikeForm.plate,
            model: bikeForm.model,
            color: bikeForm.color,
            photoUrls: bikeForm.photoUrls || [],
            documentUrls: bikeForm.documentUrls || [],
            videoUrl: bikeForm.videoUrl || '',
            photoUrl: (bikeForm.photoUrls || [])[0] || '',
            papersUrl: (bikeForm.documentUrls || [])[0] || '',
          },
        ],
        nin: user?.nin,
        guarantor: user?.guarantor,
      });
      setMessage(res.data.message || 'Documents submitted for admin review');
      if (refreshUser) await refreshUser();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RoleNavbar />
      {uploading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          Uploading… please wait
        </div>
      )}

      <div className="container" style={{ padding: '24px 16px', maxWidth: 600 }}>
        {message && (
          <div style={{ background: '#e0f2fe', color: '#075985', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <button className={`btn ${section === 'profile' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => setSection('profile')}>Profile</button>
          {(user?.role === 'customer' || user?.role === 'rider') && (
            <button className={`btn ${section === 'addresses' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => setSection('addresses')}>Saved addresses</button>
          )}
          {user?.role === 'rider' && (
            <button className={`btn ${section === 'docs' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => setSection('docs')}>Bike & documents</button>
          )}
        </div>

        {section === 'profile' && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                background: 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 700, color: 'var(--gray-500)', flexShrink: 0,
              }}>
                {user?.profilePhoto ? (
                  <img src={user.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (user?.name || '?')[0].toUpperCase()
                )}
              </div>
              <div>
                <label className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', display: 'inline-block' }}>
                  {photoUploading ? 'Uploading…' : 'Change photo'}
                  <input type="file" accept="image/*" hidden disabled={photoUploading} onChange={uploadPhoto} />
                </label>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>Shown on offers and track</div>
              </div>
            </div>
            <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--gray-500)' }}>
              Role: <strong style={{ textTransform: 'capitalize' }}>{user?.role}</strong>
              {user?.role === 'rider' && (
                <span className="badge badge-info" style={{ marginLeft: 8 }}>{user?.verificationStatus}</span>
              )}
            </div>
            <form onSubmit={saveProfile}>
              <div className="form-group">
                <label>Full name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input value={user?.email || ''} disabled style={{ opacity: 0.7 }} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Primary address (pickup / business)</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  readOnly={!!addressLocked}
                  disabled={!!addressLocked}
                  placeholder="e.g. Kubwa Phase 2, opposite NNPC…"
                  style={{
                    opacity: addressLocked ? 0.75 : 1,
                    background: addressLocked ? '#f1f5f9' : undefined,
                    cursor: addressLocked ? 'not-allowed' : undefined,
                  }}
                />
                <small style={{ fontSize: 12, color: addressLocked ? '#b45309' : '#64748b' }}>
                  {addressLocked
                    ? `Locked until ${new Date(user.addressLockedUntil).toLocaleDateString()}. Cannot change for 30 days after last update.`
                    : CORRIDOR_HINT}
                </small>
                {form.address && !hasCorridor(form.address) && !addressLocked && (
                  <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>
                    Invalid — must include Dutse, Kubwa, Bwari or Ushafa
                  </div>
                )}
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Saving...' : 'Save profile'}
              </button>
              <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 10 }} onClick={async () => {
                const sub = await registerPush();
                setMessage(sub ? 'Push notifications enabled' : 'Could not enable push (browser or VAPID keys)');
              }}>
                Enable push notifications
              </button>
            </form>
          </div>
        )}

        {section === 'addresses' && (
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Add address</h3>
              <form onSubmit={addAddress}>
                <div className="form-group">
                  <label>Label</label>
                  <input placeholder="e.g. Home, Shop" value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description (landmarks)</label>
                  <textarea rows={3} required placeholder="Kubwa Phase 2, blue gate..." value={newAddr.description} onChange={(e) => setNewAddr({ ...newAddr, description: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Zone</label>
                  <select value={newAddr.zone} onChange={(e) => setNewAddr({ ...newAddr, zone: e.target.value })}>
                    <option value="">—</option>
                    <option value="dutse">Dutse</option>
                    <option value="kubwa">Kubwa</option>
                    <option value="bwari">Bwari</option>
                    <option value="ushafa">Ushafa</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary btn-block">Save address</button>
              </form>
            </div>
            {addresses.map((a) => (
              <div key={a._id} className="card" style={{ padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong style={{ fontSize: 14 }}>{a.label || 'Saved'}</strong>
                  {a.zone && <span className="badge badge-info" style={{ marginLeft: 8 }}>{a.zone}</span>}
                  <p style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 4 }}>{a.description}</p>
                </div>
                <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12, flexShrink: 0 }} onClick={() => deleteAddress(a._id)}>Delete</button>
              </div>
            ))}
            {addresses.length === 0 && <p style={{ color: 'var(--gray-500)', textAlign: 'center' }}>No saved addresses yet</p>}
          </div>
        )}

        {section === 'docs' && user?.role === 'rider' && (
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Bike & documents</h3>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
              Status: <strong>{user?.verificationStatus}</strong>
              {user?.nin && <> · NIN: {user.nin}</>}
            </p>
            {canEditDocs && (
              <div style={{ background: '#fef3c7', color: '#92400e', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                Admin requested a re-upload. Update photos, video and documents below, then submit for review.
                You cannot take jobs until approved.
                {user?.verificationNote ? ` — ${user.verificationNote}` : ''}
                <div style={{ marginTop: 8 }}>
                  You can also re-apply using the full form on{' '}
                  <Link to="/become-a-rider" style={{ fontWeight: 700, color: '#92400e' }}>
                    Become a rider
                  </Link>
                  .
                </div>
              </div>
            )}
            {docsUnderReview && (
              <div style={{ background: '#dbeafe', color: '#1e40af', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                Documents submitted and under review. Fields are locked until admin approves, rejects, or requests another re-upload.
              </div>
            )}
            {!canEditDocs && !docsUnderReview && (
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12 }}>
                Fields are read-only. They unlock only when admin requests a re-upload.
              </p>
            )}

            <div style={{ marginBottom: 16 }}>
              <strong style={{ fontSize: 14 }}>Photos</strong>
              {(bikeForm.photoUrls || []).length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No photos</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {bikeForm.photoUrls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                    </a>
                  ))}
                </div>
              )}
              {canEditDocs && (
                <label className="btn btn-secondary" style={{ fontSize: 13, marginTop: 8, cursor: uploading ? 'wait' : 'pointer' }}>
                  {uploading ? 'Uploading…' : 'Add photos'}
                  <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={onBikePhotos} />
                </label>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <strong style={{ fontSize: 14 }}>Video</strong>
              {!bikeForm.videoUrl ? (
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No video</p>
              ) : (
                <video controls src={bikeForm.videoUrl} style={{ width: '100%', maxWidth: 320, marginTop: 8, borderRadius: 8 }} />
              )}
              {canEditDocs && (
                <label className="btn btn-secondary" style={{ fontSize: 13, marginTop: 8, cursor: uploading ? 'wait' : 'pointer', display: 'inline-block' }}>
                  {uploading ? 'Uploading…' : 'Replace video'}
                  <input type="file" accept="video/*" hidden disabled={uploading} onChange={onBikeVideo} />
                </label>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <strong style={{ fontSize: 14 }}>Documents (PDF / files)</strong>
              {(bikeForm.documentUrls || []).length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No documents</p>
              ) : (
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13 }}>
                  {bikeForm.documentUrls.map((u, i) => (
                    <li key={u}>
                      <a href={u} target="_blank" rel="noreferrer">
                        Document {i + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {canEditDocs && (
                <label className="btn btn-secondary" style={{ fontSize: 13, marginTop: 8, cursor: uploading ? 'wait' : 'pointer', display: 'inline-block' }}>
                  {uploading ? 'Uploading…' : 'Add documents'}
                  <input type="file" accept="image/*,application/pdf,.pdf" multiple hidden disabled={uploading} onChange={onBikeDocs} />
                </label>
              )}
            </div>

            <form onSubmit={saveBike}>
              <div className="form-group">
                <label>Plate number</label>
                <input
                  value={bikeForm.plate}
                  disabled={!canEditDocs}
                  readOnly={!canEditDocs}
                  onChange={(e) => setBikeForm({ ...bikeForm, plate: e.target.value })}
                  style={{ background: !canEditDocs ? '#f1f5f9' : undefined }}
                />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input
                  value={bikeForm.model}
                  disabled={!canEditDocs}
                  readOnly={!canEditDocs}
                  onChange={(e) => setBikeForm({ ...bikeForm, model: e.target.value })}
                  style={{ background: !canEditDocs ? '#f1f5f9' : undefined }}
                />
              </div>
              <div className="form-group">
                <label>Color</label>
                <input
                  value={bikeForm.color}
                  disabled={!canEditDocs}
                  readOnly={!canEditDocs}
                  onChange={(e) => setBikeForm({ ...bikeForm, color: e.target.value })}
                  style={{ background: !canEditDocs ? '#f1f5f9' : undefined }}
                />
              </div>
              {user?.guarantor?.name && (
                <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 12 }}>
                  Guarantor: {user.guarantor.name} ({user.guarantor.phone})
                </p>
              )}
              {canEditDocs && (
                <button type="submit" className="btn btn-primary btn-block" disabled={loading || uploading}>
                  {loading ? 'Submitting…' : 'Submit re-upload for admin review'}
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
