import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { uploadImage } from '../../services/upload';
import AdminNavbar from '../../components/AdminNavbar';
import { useBranding } from '../../context/BrandingContext';

const TABS = ['overview', 'riders', 'customers', 'jobs', 'disputes', 'finance', 'notify', 'email', 'reports', 'settings'];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { refreshBranding } = useBranding();
  const [stats, setStats] = useState(null);
  const [riders, setRiders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [finance, setFinance] = useState({ riders: [], totals: {} });
  const [templates, setTemplates] = useState([]);
  const [report, setReport] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [bankForm, setBankForm] = useState({ accountName: '', accountNumber: '', bankName: '' });
  const [commissionPct, setCommissionPct] = useState(15);
  const [platformName, setPlatformName] = useState('ZumaDash');
  const [logoUrl, setLogoUrl] = useState('');
  const [priceBands, setPriceBands] = useState(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [notifyForm, setNotifyForm] = useState({ audience: 'all_customers', title: '', message: '' });
  const [emailForm, setEmailForm] = useState({ audience: 'all_customers', subject: '', html: '', templateId: '' });
  const [tplForm, setTplForm] = useState({ name: '', subject: '', body: '', signature: '', category: 'general' });
  const [notifySending, setNotifySending] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [payAmount, setPayAmount] = useState({});
  const [reportDays, setReportDays] = useState(30);

  const fetchData = async () => {
    try {
      const [statsRes, ridersRes, jobsRes, settingsRes, customersRes, disputesRes, financeRes, tplRes] =
        await Promise.all([
          api.get('/api/admin/dashboard'),
          api.get('/api/admin/riders'),
          api.get('/api/admin/jobs'),
          api.get('/api/settings'),
          api.get('/api/admin/customers'),
          api.get('/api/admin/disputes'),
          api.get('/api/admin/finance'),
          api.get('/api/admin/email-templates').catch(() => ({ data: { templates: [] } })),
        ]);
      setStats(statsRes.data.stats);
      setRiders(ridersRes.data.riders || []);
      setJobs(jobsRes.data.jobs || []);
      setCustomers(customersRes.data.customers || []);
      setDisputes(disputesRes.data.jobs || []);
      setFinance({ riders: financeRes.data.riders || [], totals: financeRes.data.totals || {} });
      setTemplates(tplRes.data.templates || []);
      const s = settingsRes.data.settings;
      if (s) {
        if (s.bankDetails) setBankForm({ accountName: s.bankDetails.accountName || '', accountNumber: s.bankDetails.accountNumber || '', bankName: s.bankDetails.bankName || '' });
        if (s.commissionPercentage) setCommissionPct(s.commissionPercentage);
        if (s.platformName) setPlatformName(s.platformName);
        if (s.logoUrl || s.platformLogo) setLogoUrl(s.logoUrl || s.platformLogo || '');
        if (s.priceBands) setPriceBands(JSON.parse(JSON.stringify(s.priceBands)));
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async (days = reportDays) => {
    try {
      const res = await api.get(`/api/admin/reports?days=${days}`);
      setReport(res.data);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Report failed');
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (tab === 'reports') loadReport(); }, [tab]);

  const verifyRider = async (id, action) => {
    try {
      await api.put(`/api/admin/riders/${id}/verify`, { action });
      setMessage(`Rider ${action}d`);
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const freezeRider = async (id, freeze) => {
    try {
      await api.put(`/api/admin/riders/${id}/freeze`, { freeze });
      setMessage(freeze ? 'Rider frozen' : 'Rider unfrozen');
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const freezeCustomer = async (id, freeze) => {
    try {
      await api.put(`/api/admin/customers/${id}/freeze`, { freeze });
      setMessage(freeze ? 'Customer frozen' : 'Customer unfrozen');
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const freezeJob = async (id, freeze) => {
    try {
      await api.put(`/api/admin/jobs/${id}/freeze`, { freeze, reason: freeze ? 'Frozen by admin' : '' });
      setMessage(freeze ? 'Job frozen' : 'Job unfrozen');
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const disputeAction = async (id, action) => {
    const note = window.prompt('Note (optional):') || '';
    try {
      await api.put(`/api/admin/jobs/${id}/dispute`, { action, note });
      setMessage('Dispute updated');
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const markCommission = async (riderId) => {
    const amount = Number(payAmount[riderId] || 0);
    if (!amount) return setMessage('Enter amount');
    try {
      await api.put(`/api/admin/riders/${riderId}/commission`, { amountPaid: amount });
      setMessage('Commission recorded');
      setPayAmount((p) => ({ ...p, [riderId]: '' }));
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const sendNotify = async (e) => {
    e.preventDefault();
    setNotifySending(true);
    try {
      const res = await api.post('/api/admin/notify', notifyForm);
      setMessage(res.data.message);
      setNotifyForm({ audience: 'all_customers', title: '', message: '' });
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
    finally { setNotifySending(false); }
  };
  const saveTemplate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/email-templates', tplForm);
      setMessage('Template saved');
      setTplForm({ name: '', subject: '', body: '', signature: '', category: 'general' });
      const res = await api.get('/api/admin/email-templates');
      setTemplates(res.data.templates || []);
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const deleteTemplate = async (id) => {
    try {
      await api.delete(`/api/admin/email-templates/${id}`);
      setTemplates((t) => t.filter((x) => x._id !== id));
      setMessage('Template deleted');
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const sendEmail = async (e) => {
    e.preventDefault();
    setEmailSending(true);
    try {
      const res = await api.post('/api/admin/email-send', emailForm);
      setMessage(res.data.message);
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
    finally { setEmailSending(false); }
  };
  const onLogoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, 'zumadash/branding');
      setLogoUrl(url);
      setMessage('Logo uploaded — click Save Settings to apply');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Logo upload failed');
    }
  };
  const saveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      await api.put('/api/settings', {
        bankDetails: bankForm,
        commissionPercentage: Number(commissionPct),
        platformName,
        logoUrl,
        platformLogo: logoUrl,
        priceBands,
      });
      setMessage('Settings saved');
      await refreshBranding();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
    finally { setSettingsSaving(false); }
  };
  const setBand = (zone, size, value) => {
    setPriceBands((prev) => ({
      ...prev,
      [zone]: { ...prev[zone], [size]: Number(value) },
    }));
  };

  const pendingRiders = riders.filter((r) => r.verificationStatus === 'under_review');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <AdminNavbar />

      <div className="container" style={{ padding: '24px 16px', maxWidth: 1000 }}>
        {message && (
          <div style={{ background: '#e0f2fe', color: '#075985', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {message}
            <button onClick={() => setMessage('')} style={{ float: 'right', background: 'none', color: '#075985' }}>✕</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '7px 12px', fontSize: 12, textTransform: 'capitalize' }}>
              {t}
              {t === 'riders' && pendingRiders.length > 0 && <span style={{ background: 'var(--danger)', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: 11, marginLeft: 4 }}>{pendingRiders.length}</span>}
              {t === 'disputes' && disputes.length > 0 && <span style={{ background: 'var(--danger)', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: 11, marginLeft: 4 }}>{disputes.length}</span>}
            </button>
          ))}
        </div>

        {loading ? <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Loading...</p> : (
          <>
            {tab === 'overview' && stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                {[
                  ['Total Jobs', stats.totalJobs], ['Active', stats.activeJobs], ["Today", stats.todaysJobs],
                  ['Riders', stats.totalRiders], ['Pending', stats.pendingRiders], ['Customers', stats.totalCustomers],
                  ['Disputes', stats.openDisputes],
                ].map(([label, value]) => (
                  <div key={label} className="card" style={{ textAlign: 'center', padding: 14 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{value}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'riders' && (
              <div>
                <h2 style={{ fontSize: 16, marginBottom: 12 }}>Pending ({pendingRiders.length})</h2>
                {pendingRiders.map((r) => (
                  <div key={r._id} className="card" style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div><strong>{r.name}</strong><div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{r.email} · {r.phone}</div></div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => verifyRider(r._id, 'approve')}>Approve</button>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => verifyRider(r._id, 'reject')}>Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
                <h2 style={{ fontSize: 16, margin: '20px 0 12px' }}>All riders</h2>
                {riders.map((r) => (
                  <div key={r._id} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><strong style={{ fontSize: 14 }}>{r.name}</strong> <span className="badge badge-info">{r.verificationStatus}</span>
                      {r.isFrozen && <span className="badge badge-danger" style={{ marginLeft: 4 }}>Frozen</span>}
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Owed ₦{(r.commissionOwed || 0).toLocaleString()}</div>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => freezeRider(r._id, !r.isFrozen)}>{r.isFrozen ? 'Unfreeze' : 'Freeze'}</button>
                  </div>
                ))}
              </div>
            )}

            {tab === 'customers' && (
              <div>
                {customers.map((c) => (
                  <div key={c._id} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <div><strong>{c.name}</strong>{c.isFrozen && <span className="badge badge-danger" style={{ marginLeft: 8 }}>Frozen</span>}
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{c.email} · {c.phone}</div></div>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => freezeCustomer(c._id, !c.isFrozen)}>{c.isFrozen ? 'Unfreeze' : 'Freeze'}</button>
                  </div>
                ))}
              </div>
            )}

            {tab === 'jobs' && (
              <div>
                {jobs.slice(0, 40).map((j) => (
                  <div key={j._id} className="card" style={{ padding: 12, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{j.jobId}</strong><span className="badge badge-info">{j.status}</span></div>
                    <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{j.customer?.name} → {j.rider?.name || '—'}</div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => freezeJob(j._id, !j.isFrozen)}>{j.isFrozen ? 'Unfreeze' : 'Freeze'}</button>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--danger)' }} onClick={() => disputeAction(j._id, 'open')}>Dispute</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'disputes' && (
              <div>
                {disputes.length === 0 ? <p style={{ color: 'var(--gray-500)' }}>No disputes</p> : disputes.map((j) => (
                  <div key={j._id} className="card" style={{ marginBottom: 12 }}>
                    <strong>{j.jobId}</strong> <span className="badge badge-danger">{j.status}</span>
                    <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>{j.customer?.name} → {j.rider?.name || '—'}</p>
                    {j.freezeReason && <p style={{ fontSize: 12, color: 'var(--danger)' }}>{j.freezeReason}</p>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => disputeAction(j._id, 'resolve_pay_rider')}>Pay rider</button>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => disputeAction(j._id, 'resolve_refund_customer')}>Customer side</button>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => disputeAction(j._id, 'resolve_partial')}>Partial</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'finance' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  <div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Owed</div><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)' }}>₦{(finance.totals.owed || 0).toLocaleString()}</div></div>
                  <div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Collected</div><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>₦{(finance.totals.collected || 0).toLocaleString()}</div></div>
                  <div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Rider net</div><div style={{ fontSize: 20, fontWeight: 800 }}>₦{(finance.totals.earned || 0).toLocaleString()}</div></div>
                </div>
                {finance.riders.map((r) => (
                  <div key={r._id} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div><strong>{r.name}</strong><div style={{ color: 'var(--danger)', fontWeight: 700 }}>₦{(r.commissionOwed || 0).toLocaleString()}</div></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="number" placeholder="Paid" value={payAmount[r._id] || ''} onChange={(e) => setPayAmount({ ...payAmount, [r._id]: e.target.value })} style={{ width: 100, padding: 8, borderRadius: 8, border: '1px solid var(--gray-200)' }} />
                      <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => markCommission(r._id)}>Mark paid</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'notify' && (
              <div className="card" style={{ maxWidth: 520 }}>
                <h2 style={{ fontSize: 18, marginBottom: 12 }}>In-app notification</h2>
                <form onSubmit={sendNotify}>
                  <div className="form-group"><label>Audience</label>
                    <select value={notifyForm.audience} onChange={(e) => setNotifyForm({ ...notifyForm, audience: e.target.value })}>
                      <option value="all_customers">All customers</option>
                      <option value="all_riders">All riders</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Title</label><input required value={notifyForm.title} onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })} /></div>
                  <div className="form-group"><label>Message</label><textarea required rows={4} value={notifyForm.message} onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })} /></div>
                  <button className="btn btn-primary btn-block" disabled={notifySending}>{notifySending ? 'Sending...' : 'Send'}</button>
                </form>
              </div>
            )}

            {tab === 'email' && (
              <div>
                <div className="card" style={{ marginBottom: 20, maxWidth: 560 }}>
                  <h2 style={{ fontSize: 18, marginBottom: 12 }}>Send email</h2>
                  <form onSubmit={sendEmail}>
                    <div className="form-group"><label>Audience</label>
                      <select value={emailForm.audience} onChange={(e) => setEmailForm({ ...emailForm, audience: e.target.value })}>
                        <option value="all_customers">All customers</option>
                        <option value="all_riders">All riders</option>
                      </select>
                    </div>
                    <div className="form-group"><label>Use template (optional)</label>
                      <select value={emailForm.templateId} onChange={(e) => setEmailForm({ ...emailForm, templateId: e.target.value })}>
                        <option value="">— Custom —</option>
                        {templates.map((tpl) => <option key={tpl._id} value={tpl._id}>{tpl.name}</option>)}
                      </select>
                    </div>
                    {!emailForm.templateId && (
                      <>
                        <div className="form-group"><label>Subject</label><input value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} /></div>
                        <div className="form-group"><label>HTML body</label><textarea rows={5} value={emailForm.html} onChange={(e) => setEmailForm({ ...emailForm, html: e.target.value })} placeholder="<p>Hello...</p>" /></div>
                      </>
                    )}
                    <button className="btn btn-primary btn-block" disabled={emailSending}>{emailSending ? 'Sending...' : 'Send email'}</button>
                  </form>
                </div>
                <div className="card" style={{ maxWidth: 560 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 12 }}>Save template</h3>
                  <form onSubmit={saveTemplate}>
                    <div className="form-group"><label>Name</label><input required value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} /></div>
                    <div className="form-group"><label>Subject</label><input required value={tplForm.subject} onChange={(e) => setTplForm({ ...tplForm, subject: e.target.value })} /></div>
                    <div className="form-group"><label>Body (HTML)</label><textarea required rows={4} value={tplForm.body} onChange={(e) => setTplForm({ ...tplForm, body: e.target.value })} /></div>
                    <div className="form-group"><label>Signature</label><textarea rows={2} value={tplForm.signature} onChange={(e) => setTplForm({ ...tplForm, signature: e.target.value })} /></div>
                    <button className="btn btn-primary btn-block">Save template</button>
                  </form>
                  <div style={{ marginTop: 20 }}>
                    {templates.map((tpl) => (
                      <div key={tpl._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 13 }}>
                        <span><strong>{tpl.name}</strong> — {tpl.subject}</span>
                        <button type="button" style={{ background: 'none', color: 'var(--danger)', fontSize: 12 }} onClick={() => deleteTemplate(tpl._id)}>Delete</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'reports' && (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                  <select value={reportDays} onChange={(e) => { setReportDays(Number(e.target.value)); loadReport(Number(e.target.value)); }}>
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                  <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 13 }} onClick={() => loadReport()}>Refresh</button>
                </div>
                {!report ? <p>Loading report...</p> : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                      <div className="card" style={{ textAlign: 'center', padding: 14 }}><div style={{ fontSize: 22, fontWeight: 800 }}>{report.jobs?.total}</div><div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Jobs</div></div>
                      <div className="card" style={{ textAlign: 'center', padding: 14 }}><div style={{ fontSize: 18, fontWeight: 800 }}>₦{(report.jobs?.revenueAgreed || 0).toLocaleString()}</div><div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Agreed revenue</div></div>
                      <div className="card" style={{ textAlign: 'center', padding: 14 }}><div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>₦{Math.round(report.jobs?.commissionEst || 0).toLocaleString()}</div><div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Est. commission</div></div>
                      <div className="card" style={{ textAlign: 'center', padding: 14 }}><div style={{ fontSize: 22, fontWeight: 800 }}>{report.users?.newCustomers}</div><div style={{ fontSize: 12, color: 'var(--gray-500)' }}>New customers</div></div>
                      <div className="card" style={{ textAlign: 'center', padding: 14 }}><div style={{ fontSize: 22, fontWeight: 800 }}>{report.users?.newRiders}</div><div style={{ fontSize: 12, color: 'var(--gray-500)' }}>New riders</div></div>
                      <div className="card" style={{ textAlign: 'center', padding: 14 }}><div style={{ fontSize: 18, fontWeight: 800, color: 'var(--danger)' }}>₦{(report.finance?.commissionOwed || 0).toLocaleString()}</div><div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Still owed</div></div>
                    </div>
                    <div className="card">
                      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Jobs by status</h3>
                      {Object.entries(report.jobs?.byStatus || {}).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, borderBottom: '1px solid var(--gray-100)' }}>
                          <span style={{ textTransform: 'capitalize' }}>{k.replace('_', ' ')}</span><strong>{v}</strong>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'settings' && (
              <div className="card" style={{ maxWidth: 560 }}>
                <h2 style={{ fontSize: 18, marginBottom: 16 }}>Platform settings</h2>
                <form onSubmit={saveSettings}>
                  <div className="form-group"><label>Platform name</label>
                    <input value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
                  </div>
                  <div className="form-group"><label>Logo</label>
                    {logoUrl && <img src={logoUrl} alt="logo" style={{ height: 48, marginBottom: 8, borderRadius: 8 }} />}
                    <input type="file" accept="image/*" onChange={onLogoFile} />
                    <input style={{ marginTop: 8 }} placeholder="Or paste logo URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
                  </div>
                  <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--gray-200)' }} />
                  <h3 style={{ fontSize: 15, marginBottom: 12 }}>Bank transfer</h3>
                  <div className="form-group"><label>Bank name</label><input value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} required /></div>
                  <div className="form-group"><label>Account name</label><input value={bankForm.accountName} onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })} required /></div>
                  <div className="form-group"><label>Account number</label><input value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} required /></div>
                  <div className="form-group"><label>Commission %</label><input type="number" min={1} max={40} value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} /></div>
                  {priceBands && (
                    <>
                      <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--gray-200)' }} />
                      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Suggested price bands (₦)</h3>
                      {['same_zone', 'neighbouring', 'cross_zone'].map((zone) => (
                        <div key={zone} style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, textTransform: 'capitalize' }}>{zone.replace('_', ' ')}</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {['small', 'medium', 'large'].map((size) => (
                              <div key={size} style={{ flex: 1 }}>
                                <label style={{ fontSize: 11 }}>{size}</label>
                                <input type="number" value={priceBands[zone]?.[size] || 0} onChange={(e) => setBand(zone, size, e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--gray-200)' }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  <button type="submit" className="btn btn-primary btn-block" disabled={settingsSaving}>{settingsSaving ? 'Saving...' : 'Save settings'}</button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
