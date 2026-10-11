import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const PERM_KEYS = [
  { key: 'payment', label: 'Payment desk' },
  { key: 'riders', label: 'Riders' },
  { key: 'merchants', label: 'Merchants' },
  { key: 'customers', label: 'Customers' },
  { key: 'kyc', label: 'KYC' },
  { key: 'security', label: 'Security' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'disputes', label: 'Disputes' },
  { key: 'finance', label: 'Finance' },
  { key: 'notify', label: 'Notify' },
  { key: 'email', label: 'Email' },
  { key: 'reports', label: 'Reports' },
];

const ManagersDesk = () => {
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [selected, setSelected] = useState(null);
  const [perms, setPerms] = useState({});

  const load = async () => {
    try {
      const res = await api.get('/api/admin/managers');
      setList(res.data.managers || []);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to load managers');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      await api.post('/api/admin/managers', form);
      setMsg('Manager created / promoted');
      setForm({ name: '', email: '', phone: '', password: '' });
      load();
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Create failed');
    }
  };

  const open = (m) => {
    setSelected(m);
    const mp = m.managerPermissions || {};
    const next = {};
    PERM_KEYS.forEach(({ key }) => {
      next[key] = mp[key] !== false;
    });
    setPerms(next);
  };

  const savePerms = async () => {
    if (!selected) return;
    setMsg('');
    setErr('');
    try {
      const res = await api.put(`/api/admin/managers/${selected._id || selected.id}/permissions`, {
        permissions: {
          ...perms,
          settings: false,
          documentDelete: false,
          documentDownload: false,
        },
      });
      setMsg('Permissions saved');
      setSelected({ ...selected, managerPermissions: res.data.managerPermissions });
      load();
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Save failed');
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>Managers</h2>
      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
        Managers use the admin desk without Settings, and cannot delete or download identity documents.
        Toggle tab access below. Settings / document delete / download stay locked off.
      </p>
      {msg && <div style={{ background: '#f0fdf4', color: '#166534', padding: 10, borderRadius: 8, marginBottom: 10 }}>{msg}</div>}
      {err && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 10, borderRadius: 8, marginBottom: 10 }}>{err}</div>}

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>Add / promote manager</h3>
        <form onSubmit={create} style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Password (required for new accounts)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button type="submit" className="btn btn-primary">Save manager</button>
        </form>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {list.map((m) => (
          <div
            key={m._id}
            className="card"
            style={{ padding: 12, cursor: 'pointer', border: selected?._id === m._id ? '2px solid var(--primary)' : undefined }}
            onClick={() => open(m)}
          >
            <strong>{m.name}</strong> · {m.email}
            {m.isFrozen && <span className="badge badge-danger" style={{ marginLeft: 8 }}>Frozen</span>}
          </div>
        ))}
        {list.length === 0 && <p style={{ color: 'var(--gray-500)' }}>No managers yet.</p>}
      </div>

      {selected && (
        <div className="card" style={{ marginTop: 16, padding: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Permissions · {selected.name}</h3>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12 }}>
            Locked off: Settings · Document delete · Document download
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {PERM_KEYS.map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={!!perms[key]}
                  onChange={(e) => setPerms({ ...perms, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={savePerms}>
            Save permissions
          </button>
        </div>
      )}
    </div>
  );
};

export default ManagersDesk;
