import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminNavbar from '../../components/AdminNavbar';
import { useI18n } from '../../context/I18nContext';
import { useBranding } from '../../context/BrandingContext';
import api from '../../services/api';

const AdminCreateCustomer = () => {
  const { t } = useI18n();
  const { platformName } = useBranding();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      const res = await api.post('/api/admin/customers', form);
      setMsg(res.data.message || t('admin.customerCreated'));
      setForm({ name: '', email: '', phone: '', password: '' });
    } catch (ex) {
      setErr(ex.response?.data?.message || t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <AdminNavbar />
      <div className="container" style={{ maxWidth: 520, padding: '24px 16px' }}>
        <Link to="/admin" style={{ color: 'var(--primary)', fontWeight: 600 }}>← {t('nav.dashboard')}</Link>
        <div className="card" style={{ marginTop: 16, padding: 20 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>{t('admin.createCustomer')}</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
            {t('admin.createCustomerHelp')}
          </p>
          {msg && <div style={{ background: '#f0fdf4', color: '#166534', padding: 10, borderRadius: 8, marginBottom: 12 }}>{msg}</div>}
          {err && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 10, borderRadius: 8, marginBottom: 12 }}>{err}</div>}
          <form onSubmit={onSubmit}>
            <div className="form-group"><label>{t('auth.name')}</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><label>{t('auth.email')}</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group"><label>{t('auth.phone')}</label>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="form-group"><label>{t('auth.password')}</label>
              <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? t('common.loading') : t('admin.createCustomer')}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminCreateCustomer;
