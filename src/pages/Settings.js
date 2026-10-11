import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RoleNavbar from '../components/RoleNavbar';
import { useI18n } from '../context/I18nContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ensureCloudinaryUrl } from '../services/upload';

const Settings = () => {
  const { t, lang } = useI18n();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [emailOn, setEmailOn] = useState(true);
  const [waOn, setWaOn] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const [kycType, setKycType] = useState('nin');
  const [ninNumber, setNinNumber] = useState('');
  const [ninPhoto, setNinPhoto] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [licenceExpiry, setLicenceExpiry] = useState('');
  const [licenceFront, setLicenceFront] = useState('');
  const [licenceBack, setLicenceBack] = useState('');
  const [selfie, setSelfie] = useState('');
  const [kycBusy, setKycBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setEmailOn(user.emailAlertsEnabled !== false);
      setWaOn(user.whatsappAlertsEnabled !== false);
    }
  }, [user]);

  const uploadFile = async (file) => {
    if (!file) return '';
    return (await ensureCloudinaryUrl(file)) || '';
  };

  const saveToggles = async () => {
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const res = await api.put('/api/users/me', {
        emailAlertsEnabled: emailOn,
        whatsappAlertsEnabled: waOn,
      });
      setUser(res.data.user);
      setMsg('Notification preferences saved.');
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const goVerifyWa = () => navigate('/verify-whatsapp');
  const goVerifyEmail = async () => {
    try {
      await api.post('/api/auth/otp/send', { channel: 'email' });
      navigate('/verify-whatsapp', { state: { preferEmail: true } });
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not send email OTP');
    }
  };

  const submitKyc = async (e) => {
    e.preventDefault();
    setKycBusy(true);
    setErr('');
    setMsg('');
    try {
      const payload = { type: kycType, selfieUrl: selfie };
      if (kycType === 'nin') {
        payload.ninNumber = ninNumber.trim();
        payload.ninPhotoUrl = ninPhoto;
      } else {
        payload.licenceNumber = licenceNumber.trim();
        payload.licenceExpiry = licenceExpiry;
        payload.licenceFrontUrl = licenceFront;
        payload.licenceBackUrl = licenceBack;
      }
      const res = await api.post('/api/users/kyc/submit', payload);
      setUser((u) => ({ ...u, ...res.data.user }));
      setMsg(res.data.message || 'KYC submitted for review');
    } catch (ex) {
      setErr(ex.response?.data?.message || 'KYC submit failed');
    } finally {
      setKycBusy(false);
    }
  };

  const kyc = user?.kycStatus || 'none';
  const kycLabel = {
    none: 'Not submitted',
    under_review: 'Under review',
    approved: 'Approved',
    rejected: 'Rejected',
  }[kyc] || kyc;

  const canApply = user?.role === 'customer' && (kyc === 'none' || kyc === 'rejected');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RoleNavbar />
      <div className="container" style={{ maxWidth: 560, padding: '24px 16px 48px' }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Settings</h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 20 }}>
          Notifications, verification, KYC, and account preferences.
        </p>

        {msg && (
          <div style={{ background: '#f0fdf4', color: '#166534', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
            {msg}
          </div>
        )}
        {err && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
            {err}
          </div>
        )}

        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>{t('nav.language')}</h3>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
            Choose English, Hausa, Yoruba, or Pidgin. Your choice is saved on this device.
          </p>
          <LanguageSwitcher floating={false} />
        </div>

        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Notifications</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
            In-app alerts always stay on. Email and WhatsApp delivery alerts require a verified channel and the toggle below.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={emailOn} disabled={user?.emailVerified === false} onChange={(e) => setEmailOn(e.target.checked)} />
            <span>
              Email delivery alerts
              {user?.emailVerified === false && <span style={{ color: 'var(--danger)', fontSize: 12 }}> — verify email first</span>}
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={waOn} disabled={user?.whatsappVerified === false} onChange={(e) => setWaOn(e.target.checked)} />
            <span>
              WhatsApp delivery alerts
              {user?.whatsappVerified === false && <span style={{ color: 'var(--danger)', fontSize: 12 }}> — verify WhatsApp first</span>}
            </span>
          </label>
          <button type="button" className="btn btn-primary" onClick={saveToggles} disabled={saving}>
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>

        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Verify channels</h2>
          <div style={{ fontSize: 14, marginBottom: 10 }}>
            WhatsApp:{' '}
            <strong style={{ color: user?.whatsappVerified === true ? 'var(--success)' : 'var(--danger)' }}>
              {user?.whatsappVerified === true ? 'Verified' : 'Not verified'}
            </strong>
            {user?.whatsappVerified === false && (
              <button type="button" className="btn btn-secondary" style={{ marginLeft: 10, padding: '4px 10px', fontSize: 12 }} onClick={goVerifyWa}>
                Verify now
              </button>
            )}
          </div>
          <div style={{ fontSize: 14 }}>
            Email:{' '}
            <strong style={{ color: user?.emailVerified === true ? 'var(--success)' : 'var(--danger)' }}>
              {user?.emailVerified === true ? 'Verified' : 'Not verified'}
            </strong>
            {user?.emailVerified === false && (
              <button type="button" className="btn btn-secondary" style={{ marginLeft: 10, padding: '4px 10px', fontSize: 12 }} onClick={goVerifyEmail}>
                Send email OTP
              </button>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>KYC (identity)</h2>
          <p style={{ fontSize: 14, marginBottom: 8 }}>
            Status: <strong>{kycLabel}</strong>
            {user?.kycRejectReason ? ` — ${user.kycRejectReason}` : ''}
          </p>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12 }}>
            Cash on Delivery is only available after KYC is <strong>approved</strong>. Bank transfer is always available.
          </p>

          {canApply && (
            <form onSubmit={submitKyc}>
              <div className="form-group">
                <label>Document type</label>
                <select value={kycType} onChange={(e) => setKycType(e.target.value)}>
                  <option value="nin">NIN</option>
                  <option value="drivers_licence">Driver&apos;s licence</option>
                </select>
              </div>

              {kycType === 'nin' ? (
                <>
                  <div className="form-group">
                    <label>NIN number</label>
                    <input value={ninNumber} onChange={(e) => setNinNumber(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Photo of NIN</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => setNinPhoto(await uploadFile(e.target.files?.[0]))}
                      required={!ninPhoto}
                    />
                    {ninPhoto && <p style={{ fontSize: 12, color: 'var(--success)' }}>Uploaded</p>}
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Licence number</label>
                    <input value={licenceNumber} onChange={(e) => setLicenceNumber(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Expiry date</label>
                    <input type="date" value={licenceExpiry} onChange={(e) => setLicenceExpiry(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Front photo</label>
                    <input type="file" accept="image/*" onChange={async (e) => setLicenceFront(await uploadFile(e.target.files?.[0]))} required={!licenceFront} />
                    {licenceFront && <p style={{ fontSize: 12, color: 'var(--success)' }}>Uploaded</p>}
                  </div>
                  <div className="form-group">
                    <label>Back photo</label>
                    <input type="file" accept="image/*" onChange={async (e) => setLicenceBack(await uploadFile(e.target.files?.[0]))} required={!licenceBack} />
                    {licenceBack && <p style={{ fontSize: 12, color: 'var(--success)' }}>Uploaded</p>}
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Selfie of person submitting</label>
                <input type="file" accept="image/*" capture="user" onChange={async (e) => setSelfie(await uploadFile(e.target.files?.[0]))} required={!selfie} />
                {selfie && <p style={{ fontSize: 12, color: 'var(--success)' }}>Uploaded</p>}
              </div>

              <button type="submit" className="btn btn-primary" disabled={kycBusy}>
                {kycBusy ? 'Submitting…' : 'Submit KYC'}
              </button>
            </form>
          )}

          {kyc === 'under_review' && (
            <p style={{ fontSize: 14, color: 'var(--gray-600)' }}>Your documents are with admin. You will get an in-app notice when reviewed.</p>
          )}
          {kyc === 'approved' && (
            <p style={{ fontSize: 14, color: 'var(--success)' }}>You can use Cash on Delivery when booking.</p>
          )}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Profile</h2>
          <p style={{ fontSize: 14, marginBottom: 8 }}>
            {user?.name} · {user?.email} · {user?.phone}
          </p>
          <Link to="/profile" style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 14 }}>
            Edit profile & addresses →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Settings;
