import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { ensureCloudinaryUrl } from '../../services/upload';

/**
 * Admin ops desk: create customer, file rider/merchant application for a user, book job for customer.
 */
const AdminOps = () => {
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);

  const [custForm, setCustForm] = useState({ name: '', email: '', phone: '', password: '' });

  const [appForm, setAppForm] = useState({
    userId: '',
    riderType: 'individual',
    nin: '',
    ninPhotoUrl: '',
    applicationSelfieUrl: '',
    guarantorName: '',
    guarantorPhone: '',
    guarantorAddress: '',
    plateNumber: '',
    model: '',
    color: '',
    docUrls: [],
  });

  const [jobForm, setJobForm] = useState({
    customerId: '',
    packageSize: 'medium',
    packageDescription: '',
    suggestedPrice: '',
    paymentMethod: 'cash',
    pickup: '',
    dropoff: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const [c, all] = await Promise.all([
          api.get('/api/admin/customers'),
          api.get('/api/admin/customers').catch(() => ({ data: { customers: [] } })),
        ]);
        setCustomers(c.data.customers || []);
        // For applications, reuse customers list + try riders pending from dashboard if needed
        setUsers(c.data.customers || []);
      } catch (_) {}
    })();
  }, []);

  const createCustomer = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      const res = await api.post('/api/admin/customers', custForm);
      setMsg(res.data.message || 'Customer created');
      setCustForm({ name: '', email: '', phone: '', password: '' });
      const c = await api.get('/api/admin/customers');
      setCustomers(c.data.customers || []);
      setUsers(c.data.customers || []);
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const uploadDoc = async (file) => {
    if (!file) return;
    const url = await ensureCloudinaryUrl(file);
    if (url) setAppForm((f) => ({ ...f, docUrls: [...(f.docUrls || []), url].slice(0, 5) }));
  };

  const submitApp = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      const payload = {
        userId: appForm.userId,
        riderType: appForm.riderType,
        nin: appForm.nin,
        ninPhotoUrl: appForm.ninPhotoUrl,
        applicationSelfieUrl: appForm.applicationSelfieUrl,
        guarantor: {
          name: appForm.guarantorName,
          phone: appForm.guarantorPhone,
          address: appForm.guarantorAddress,
        },
        bikeDetails:
          appForm.riderType === 'individual'
            ? {
                plateNumber: appForm.plateNumber,
                model: appForm.model,
                color: appForm.color,
                documentUrls: appForm.docUrls,
              }
            : undefined,
        fleetApplication:
          appForm.riderType === 'fleet'
            ? {
                numberOfBikes: 1,
                bikes: [
                  {
                    plateNumber: appForm.plateNumber,
                    model: appForm.model,
                    color: appForm.color,
                    documentUrls: appForm.docUrls,
                    photoUrls: [],
                  },
                ],
              }
            : undefined,
      };
      const res = await api.post('/api/admin/applications', payload);
      setMsg(res.data.message || 'Application submitted');
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Application failed');
    } finally {
      setBusy(false);
    }
  };

  const createJob = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      const res = await api.post('/api/admin/jobs', {
        customerId: jobForm.customerId,
        packageSize: jobForm.packageSize,
        packageDescription: jobForm.packageDescription,
        suggestedPrice: Number(jobForm.suggestedPrice) || 0,
        paymentMethod: jobForm.paymentMethod,
        pickup: { description: jobForm.pickup },
        dropoff: { description: jobForm.dropoff },
        locationMode: 'text',
      });
      setMsg(res.data.message || 'Job created');
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Job create failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {msg && (
        <div style={{ background: '#f0fdf4', color: '#166534', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          {msg}
        </div>
      )}
      {err && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          {err}
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Create customer account</h3>
        <form onSubmit={createCustomer}>
          <div className="form-group">
            <label>Name</label>
            <input required value={custForm.name} onChange={(e) => setCustForm({ ...custForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" required value={custForm.email} onChange={(e) => setCustForm({ ...custForm, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input required value={custForm.phone} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" required minLength={6} value={custForm.password} onChange={(e) => setCustForm({ ...custForm, password: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            Create customer
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Rider / merchant application (on behalf of user)</h3>
        <form onSubmit={submitApp}>
          <div className="form-group">
            <label>Customer / user</label>
            <select required value={appForm.userId} onChange={(e) => setAppForm({ ...appForm, userId: e.target.value })}>
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} · {u.email}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={appForm.riderType} onChange={(e) => setAppForm({ ...appForm, riderType: e.target.value })}>
              <option value="individual">Individual rider</option>
              <option value="fleet">Fleet / merchant</option>
            </select>
          </div>
          <div className="form-group">
            <label>NIN</label>
            <input required value={appForm.nin} onChange={(e) => setAppForm({ ...appForm, nin: e.target.value })} />
          </div>
          <div className="form-group">
            <label>NIN photo URL</label>
            <input
              required
              value={appForm.ninPhotoUrl}
              onChange={(e) => setAppForm({ ...appForm, ninPhotoUrl: e.target.value })}
              placeholder="Upload via Cloudinary then paste URL, or use file below"
            />
            <input
              type="file"
              accept="image/*"
              style={{ marginTop: 6 }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const url = await ensureCloudinaryUrl(f);
                if (url) setAppForm((x) => ({ ...x, ninPhotoUrl: url }));
              }}
            />
          </div>
          <div className="form-group">
            <label>Selfie URL</label>
            <input required value={appForm.applicationSelfieUrl} onChange={(e) => setAppForm({ ...appForm, applicationSelfieUrl: e.target.value })} />
            <input
              type="file"
              accept="image/*"
              style={{ marginTop: 6 }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const url = await ensureCloudinaryUrl(f);
                if (url) setAppForm((x) => ({ ...x, applicationSelfieUrl: url }));
              }}
            />
          </div>
          <div className="form-group">
            <label>Guarantor name</label>
            <input required value={appForm.guarantorName} onChange={(e) => setAppForm({ ...appForm, guarantorName: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Guarantor phone</label>
            <input required value={appForm.guarantorPhone} onChange={(e) => setAppForm({ ...appForm, guarantorPhone: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Guarantor address</label>
            <input value={appForm.guarantorAddress} onChange={(e) => setAppForm({ ...appForm, guarantorAddress: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Bike plate</label>
            <input value={appForm.plateNumber} onChange={(e) => setAppForm({ ...appForm, plateNumber: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Bike model</label>
            <input value={appForm.model} onChange={(e) => setAppForm({ ...appForm, model: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Bike color</label>
            <input value={appForm.color} onChange={(e) => setAppForm({ ...appForm, color: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Bike documents (PDF / DOC only)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              onChange={async (e) => {
                const files = [...(e.target.files || [])];
                for (const f of files) await uploadDoc(f);
              }}
            />
            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{(appForm.docUrls || []).length} file(s)</div>
            <ul style={{ fontSize: 12 }}>
              {(appForm.docUrls || []).map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noreferrer">
                    Open document
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            Submit application
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Book delivery for customer</h3>
        <form onSubmit={createJob}>
          <div className="form-group">
            <label>Customer</label>
            <select required value={jobForm.customerId} onChange={(e) => setJobForm({ ...jobForm, customerId: e.target.value })}>
              <option value="">Select</option>
              {customers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} · {u.email}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Package size</label>
            <select value={jobForm.packageSize} onChange={(e) => setJobForm({ ...jobForm, packageSize: e.target.value })}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={jobForm.packageDescription} onChange={(e) => setJobForm({ ...jobForm, packageDescription: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Suggested price (₦)</label>
            <input type="number" value={jobForm.suggestedPrice} onChange={(e) => setJobForm({ ...jobForm, suggestedPrice: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Payment</label>
            <select value={jobForm.paymentMethod} onChange={(e) => setJobForm({ ...jobForm, paymentMethod: e.target.value })}>
              <option value="cash">Cash on delivery</option>
              <option value="bank_transfer">Bank transfer</option>
            </select>
          </div>
          <div className="form-group">
            <label>Pickup</label>
            <textarea required value={jobForm.pickup} onChange={(e) => setJobForm({ ...jobForm, pickup: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Drop-off</label>
            <textarea required value={jobForm.dropoff} onChange={(e) => setJobForm({ ...jobForm, dropoff: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            Create job
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminOps;
