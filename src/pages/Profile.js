import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { registerPush } from '../services/push';
import RoleNavbar from '../components/RoleNavbar';
import { uploadFile } from '../services/upload';

const Profile = () => {
  const { user, logout, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '' });
  const [addresses, setAddresses] = useState([]);
  const [newAddr, setNewAddr] = useState({ label: '', description: '', zone: '' });
  const [bikeForm, setBikeForm] = useState({ plate: '', model: '', color: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState('profile');

  const back = user?.role === 'rider' ? '/rider' : user?.role === 'admin' ? '/admin' : '/dashboard';

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', phone: user.phone || '' });
      if (user.bikeDetails?.[0]) {
        setBikeForm({
          plate: user.bikeDetails[0].plate || '',
          model: user.bikeDetails[0].model || '',
          color: user.bikeDetails[0].color || '',
        });
      }
    }
    if (user?.role === 'customer' || user?.role === 'rider') {
      api.get('/api/users/addresses')
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
      await api.put('/api/users/me', form);
      if (refreshUser) await refreshUser();
      setMessage('Profile updated');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const addAddress = async (e) => {
    e.preventDefault();
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

  const saveBike = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/api/users/rider-documents', {
        bikeDetails: [{ ...bikeForm }],
        nin: user?.nin,
        guarantor: user?.guarantor,
      });
      setMessage('Bike details updated');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RoleNavbar />

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
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Bike details</h3>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
              Status: <strong>{user?.verificationStatus}</strong>
              {user?.nin && <> · NIN: {user.nin}</>}
            </p>
            <form onSubmit={saveBike}>
              <div className="form-group">
                <label>Plate number</label>
                <input value={bikeForm.plate} onChange={(e) => setBikeForm({ ...bikeForm, plate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input value={bikeForm.model} onChange={(e) => setBikeForm({ ...bikeForm, model: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Color</label>
                <input value={bikeForm.color} onChange={(e) => setBikeForm({ ...bikeForm, color: e.target.value })} />
              </div>
              {user?.guarantor?.name && (
                <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 12 }}>
                  Guarantor: {user.guarantor.name} ({user.guarantor.phone})
                </p>
              )}
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Saving...' : 'Update bike details'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
