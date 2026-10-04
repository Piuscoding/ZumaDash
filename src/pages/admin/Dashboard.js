import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { uploadImage } from '../../services/upload';
import AdminNavbar from '../../components/AdminNavbar';
import { useBranding } from '../../context/BrandingContext';

const TABS = ['overview', 'payment', 'riders', 'merchants', 'customers', 'jobs', 'disputes', 'finance', 'notify', 'email', 'reports', 'settings'];

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
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [pendingClearances, setPendingClearances] = useState([]);
  const [pendingWithdraws, setPendingWithdraws] = useState([]);
  const [bankKycList, setBankKycList] = useState([]);
  const [commissionSettlements, setCommissionSettlements] = useState([]);
  const [paymentSubTab, setPaymentSubTab] = useState('transfers'); // transfers | clearances | withdraws | bank | settlements
  const [timelineJob, setTimelineJob] = useState(null);
  const [riderDetail, setRiderDetail] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [merchantDetail, setMerchantDetail] = useState(null);
  const [trustEdit, setTrustEdit] = useState('');

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
      try {
        const mres = await api.get('/api/admin/merchants');
        setMerchants(mres.data.merchants || []);
      } catch (_) {
        setMerchants([]);
      }
      try {
        const pt = await api.get('/api/admin/payment-desk/pending-transfers');
        setPendingTransfers(pt.data.jobs || []);
      } catch (_) {
        setPendingTransfers([]);
      }
      try {
        const pc = await api.get('/api/admin/payment-desk/pending-clearances');
        setPendingClearances(pc.data.jobs || []);
      } catch (_) {
        setPendingClearances([]);
      }
      try {
        const pw = await api.get('/api/admin/payment-desk/withdraws?status=pending');
        setPendingWithdraws(pw.data.withdraws || []);
      } catch (_) {
        setPendingWithdraws([]);
      }
      try {
        const bk = await api.get('/api/admin/riders/bank-kyc?status=submitted');
        setBankKycList(bk.data.riders || []);
      } catch (_) {
        setBankKycList([]);
      }
      try {
        const cs = await api.get('/api/admin/payment-desk/commission-settlements');
        setCommissionSettlements(cs.data.settlements || []);
      } catch (_) {
        setCommissionSettlements([]);
      }
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
  const verifyMerchant = async (id, action) => {
    try {
      await api.put(`/api/admin/merchants/${id}/verify`, { action });
      setMessage(`Merchant ${action}d`);
      setMerchantDetail(null);
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const openMerchantDetail = async (id) => {
    try {
      const res = await api.get(`/api/admin/merchants/${id}`);
      setMerchantDetail(res.data);
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
    const sendMerchantDigests = async () => {
    try {
      const res = await api.post('/api/admin/merchant-digests/send');
      setMessage(res.data.message || 'Digests sent');
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const approveMerchantBank = async (id, action) => {
    const reason = action === 'reject' ? (window.prompt('Reason:') || 'Rejected') : '';
    try {
      await api.put(`/api/admin/merchants/${id}/bank-kyc`, { action, reason });
      setMessage(`Merchant bank ${action}d`);
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

  // NOW-4: settle all commission for a rider
  const settleAllCommission = async (riderId, riderName) => {
    if (!window.confirm(`Settle ALL commission owed for ${riderName || 'this rider'}?`)) return;
    try {
      const res = await api.put(`/api/admin/riders/${riderId}/commission`, { settleAll: true, note: 'Settle all from admin finance' });
      setMessage(res.data.message || 'All commission settled');
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };

  // NOW-1: approve / reject bank transfer
  const approvePayment = async (jobId) => {
    try {
      const res = await api.put(`/api/admin/jobs/${jobId}/approve-payment`, { note: 'Approved from Payment desk' });
      setMessage(res.data.message || 'Payment approved');
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const rejectPayment = async (jobId) => {
    const reason = window.prompt('Rejection reason (shown to customer):') || 'Bank transfer not verified';
    try {
      const res = await api.put(`/api/admin/jobs/${jobId}/reject-payment`, { note: reason });
      setMessage(res.data.message || 'Payment rejected');
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };

  const approveClearance = async (jobId) => {
    try {
      const res = await api.put(`/api/admin/jobs/${jobId}/approve-clearance`, {});
      setMessage(res.data.message || 'Clearance approved');
      setTimelineJob(null);
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const rejectClearance = async (jobId) => {
    const reason = window.prompt('Reason (optional):') || 'Clearance rejected';
    const openDispute = window.confirm('Also open dispute?');
    try {
      const res = await api.put(`/api/admin/jobs/${jobId}/reject-clearance`, { note: reason, openDispute });
      setMessage(res.data.message || 'Clearance rejected');
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const markWithdrawPaid = async (id) => {
    const ref = window.prompt('Payment reference (optional):') || '';
    try {
      const res = await api.put(`/api/admin/withdraws/${id}/mark-paid`, { paymentReference: ref });
      setMessage(res.data.message || 'Marked paid');
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const rejectWithdraw = async (id) => {
    const reason = window.prompt('Rejection reason:') || 'Rejected';
    try {
      const res = await api.put(`/api/admin/withdraws/${id}/reject`, { reason });
      setMessage(res.data.message || 'Withdraw rejected');
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const reviewBankKyc = async (riderId, action) => {
    let reason = '';
    if (action === 'reject') reason = window.prompt('Rejection reason:') || 'Rejected';
    try {
      const res = await api.put(`/api/admin/riders/${riderId}/bank-kyc`, { action, reason });
      setMessage(res.data.message || 'Bank KYC updated');
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const openRiderDetail = async (riderId) => {
    try {
      const res = await api.get(`/api/admin/riders/${riderId}`);
      const r = { ...res.data.rider, _stats: res.data.stats };
      setRiderDetail(r);
      setTrustEdit(String(r.trustScore ?? 100));
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to load rider');
    }
  };
  const saveTrustScore = async (id) => {
    try {
      const res = await api.put(`/api/admin/riders/${id}/trust-score`, { trustScore: Number(trustEdit) });
      setMessage(res.data.message || 'Trust score updated');
      setRiderDetail((d) => d ? { ...d, trustScore: res.data.trustScore } : d);
      fetchData();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const deleteRiderData = async (id, fields) => {
    if (!window.confirm(`Delete ${fields.join(', ')}?`)) return;
    try {
      await api.delete(`/api/admin/riders/${id}/data`, { data: { fields } });
      setMessage('Data deleted');
      openRiderDetail(id);
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };
  const requestReupload = async (id) => {
    const note = window.prompt('Note for rider:') || 'Please re-upload documents / bike media';
    try {
      await api.put(`/api/admin/riders/${id}/verify`, { action: 'reupload', note });
      setMessage('Re-upload requested');
      setRiderDetail(null);
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    }
  };
  const openJobTimeline = async (jobId) => {
    try {
      const res = await api.get(`/api/admin/jobs/${jobId}`);
      setTimelineJob(res.data.job);
    } catch (err) { setMessage(err.response?.data?.message || 'Failed to load timeline'); }
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
                      <div>
                        <strong>{r.name}</strong>
                        <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{r.email} · {r.phone}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>NIN: {r.nin || '—'} · {r.riderType || 'individual'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => openRiderDetail(r._id)}>View docs</button>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => verifyRider(r._id, 'approve')}>Approve</button>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => verifyRider(r._id, 'reject')}>Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
                <h2 style={{ fontSize: 16, margin: '20px 0 12px' }}>All riders</h2>
                {riders.map((r) => (
                  <div key={r._id} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <strong style={{ fontSize: 14 }}>{r.name}</strong> <span className="badge badge-info">{r.verificationStatus}</span>
                      {r.isFrozen && <span className="badge badge-danger" style={{ marginLeft: 4 }}>Frozen</span>}
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Owed ₦{(r.commissionOwed || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => openRiderDetail(r._id)}>Docs</button>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => freezeRider(r._id, !r.isFrozen)}>{r.isFrozen ? 'Unfreeze' : 'Freeze'}</button>
                    </div>
                  </div>
                ))}

                {riderDetail && (
                  <div className="card" style={{ marginTop: 20, border: '2px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ fontSize: 16, margin: 0 }}>Rider review · {riderDetail.name}</h3>
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setRiderDetail(null)}>Close</button>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
                      <div><strong>Contact:</strong> {riderDetail.email} · {riderDetail.phone}</div>
                      <div><strong>NIN:</strong> {riderDetail.nin || '—'}</div>
                      <div><strong>Status:</strong> {riderDetail.verificationStatus} {riderDetail.isFrozen ? '· Frozen' : ''}</div>
                      <div><strong>Guarantor:</strong> {riderDetail.guarantor?.name || '—'} · {riderDetail.guarantor?.phone || ''} · {riderDetail.guarantor?.address || ''}</div>
                      {riderDetail.verificationNote && <div style={{ color: 'var(--danger)' }}><strong>Note:</strong> {riderDetail.verificationNote}</div>}
                      <div><strong>Completed jobs:</strong> {riderDetail._stats?.completedJobs ?? '—'}</div>
                      <div style={{ marginTop: 10 }}>
                        <strong>Trust score:</strong> {riderDetail.trustScore ?? 100}
                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                          {[1,2,3,4,5].map((i) => (
                            <span key={i} style={{ color: i <= Math.round((riderDetail.trustScore || 0) / 20) ? '#f5a623' : '#e5e7eb', fontSize: 20 }}>★</span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input type="number" min={0} max={100} value={trustEdit} onChange={(e) => setTrustEdit(e.target.value)} style={{ width: 80, padding: 6 }} />
                          <button type="button" className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => saveTrustScore(riderDetail._id)}>Save score</button>
                        </div>
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => deleteRiderData(riderDetail._id, ['bikePhotos'])}>Delete photos</button>
                        <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => deleteRiderData(riderDetail._id, ['documents'])}>Delete docs</button>
                        <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => deleteRiderData(riderDetail._id, ['video'])}>Delete video</button>
                        <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => deleteRiderData(riderDetail._id, ['profilePhoto'])}>Delete profile photo</button>
                      </div>
                    </div>
                    {(riderDetail.bikeDetails || []).map((b, i) => (
                      <div key={i} style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid var(--gray-200)' }}>
                        <strong>Bike {i + 1}:</strong> {b.plateNumber} · {b.model} · {b.color}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          {(b.photoUrls || (b.photoUrl ? [b.photoUrl] : [])).map((u) => (
                            <a key={u} href={u} target="_blank" rel="noreferrer">
                              <img src={u} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                            </a>
                          ))}
                        </div>
                        {b.videoUrl && (
                          <video src={b.videoUrl} controls style={{ width: '100%', maxHeight: 220, marginTop: 8, borderRadius: 8 }} />
                        )}
                        <div style={{ marginTop: 8, fontSize: 12 }}>
                          {(b.documentUrls || (b.papersUrl ? [b.papersUrl] : [])).map((u) => (
                            <div key={u}><a href={u} target="_blank" rel="noreferrer">Document</a></div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => { verifyRider(riderDetail._id, 'approve'); setRiderDetail(null); }}>Approve</button>
                      <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => { verifyRider(riderDetail._id, 'reject'); setRiderDetail(null); }}>Reject</button>
                      <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => requestReupload(riderDetail._id)}>Request re-upload</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'merchants' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <h2 style={{ fontSize: 16, margin: 0 }}>Fleet merchants</h2>
                  <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={sendMerchantDigests}>
                    Send daily digests
                  </button>
                </div>
                {merchants.map((m) => (
                  <div key={m._id} className="card" style={{ marginBottom: 10, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <strong>{m.name}</strong> <span className="badge badge-info">{m.verificationStatus}</span>
                        <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{m.email} · {m.phone}</div>
                        <div style={{ fontSize: 12 }}>Bikes applied: {m.fleetApplication?.numberOfBikes || m.bikeDetails?.length || 0}</div>
                        {m.merchantBank?.status && m.merchantBank.status !== 'none' && (
                          <div style={{ fontSize: 12 }}>Bank: {m.merchantBank.status}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => openMerchantDetail(m._id)}>View</button>
                        {m.verificationStatus === 'under_review' && (
                          <>
                            <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => verifyMerchant(m._id, 'approve')}>Approve</button>
                            <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => verifyMerchant(m._id, 'reject')}>Reject</button>
                          </>
                        )}
                        {m.merchantBank?.status === 'submitted' && (
                          <>
                            <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => approveMerchantBank(m._id, 'approve')}>Approve bank</button>
                            <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => approveMerchantBank(m._id, 'reject')}>Reject bank</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {merchants.length === 0 && <p style={{ color: 'var(--gray-500)' }}>No merchants yet</p>}
                {merchantDetail && (
                  <div className="card" style={{ marginTop: 16, border: '2px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <h3 style={{ fontSize: 16 }}>{merchantDetail.merchant?.name}</h3>
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setMerchantDetail(null)}>Close</button>
                    </div>
                    <p style={{ fontSize: 13 }}>NIN: {merchantDetail.merchant?.nin} · Guarantor: {merchantDetail.merchant?.guarantor?.name}</p>
                    <h4 style={{ fontSize: 14 }}>Applied bikes</h4>
                    {(merchantDetail.merchant?.fleetApplication?.bikes || merchantDetail.merchant?.bikeDetails || []).map((b, i) => (
                      <div key={i} style={{ fontSize: 13, marginBottom: 8 }}>
                        {b.label || b.plateNumber} · {b.plateNumber}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          {(b.photoUrls || []).map((u) => (
                            <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }} /></a>
                          ))}
                        </div>
                      </div>
                    ))}
                    <h4 style={{ fontSize: 14 }}>Live bikes / riders</h4>
                    <p style={{ fontSize: 13 }}>{(merchantDetail.bikes || []).length} bike(s) · {(merchantDetail.riders || []).length} rider(s)</p>
                  </div>
                )}
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
                    <div style={{ fontSize: 12 }}>₦{(j.agreedPrice || j.suggestedPrice || 0).toLocaleString()} · {j.paymentMethod || '—'}</div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openJobTimeline(j._id)}>View details</button>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => freezeJob(j._id, !j.isFrozen)}>{j.isFrozen ? 'Unfreeze' : 'Freeze'}</button>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--danger)' }} onClick={() => disputeAction(j._id, 'open')}>Dispute</button>
                    </div>
                  </div>
                ))}
                {timelineJob && tab === 'jobs' && (
                  <div className="card" style={{ marginTop: 16, border: '2px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <h3 style={{ fontSize: 16, margin: 0 }}>Job {timelineJob.jobId}</h3>
                      <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setTimelineJob(null)}>Close</button>
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 8 }}>
                      Status: <strong>{String(timelineJob.status).replace(/_/g, ' ')}</strong>
                      {' · '}₦{(timelineJob.agreedPrice || timelineJob.suggestedPrice || 0).toLocaleString()}
                      {' · '}{timelineJob.paymentMethod === 'bank_transfer' ? 'Bank' : 'COD'}
                    </div>
                    <div style={{ fontSize: 13 }}>Pickup: {timelineJob.pickup?.description}</div>
                    <div style={{ fontSize: 13, marginBottom: 8 }}>Drop-off: {timelineJob.dropoff?.description}</div>
                    {(timelineJob.statusHistory || []).slice().sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0)).map((h, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-200)', fontSize: 13 }}>
                        <strong>{String(h.status || '').replace(/_/g, ' ')}</strong>
                        <div style={{ color: 'var(--gray-500)' }}>{h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}{h.updatedBy?.name ? ` · ${h.updatedBy.name}` : ''}</div>
                        {h.note && <div>{h.note}</div>}
                        {h.photo && <a href={h.photo} target="_blank" rel="noreferrer">Media</a>}
                      </div>
                    ))}
                  </div>
                )}
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


            {tab === 'payment' && (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    ['transfers', `Transfers (${pendingTransfers.length})`],
                    ['clearances', `Clearances (${pendingClearances.length})`],
                    ['withdraws', `Withdraws (${pendingWithdraws.length})`],
                    ['bank', `Bank KYC (${bankKycList.length})`],
                    ['settlements', 'Settlements'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={paymentSubTab === key ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{ padding: '8px 12px', fontSize: 12 }}
                      onClick={() => setPaymentSubTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {paymentSubTab === 'transfers' && (
                  <div>
                    <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
                      Bank-transfer bookings wait here until you approve. Riders are notified only after approval.
                    </p>
                    {pendingTransfers.length === 0 ? (
                      <p style={{ color: 'var(--gray-500)' }}>No pending bank transfers</p>
                    ) : (
                      pendingTransfers.map((j) => (
                        <div key={j._id} className="card" style={{ marginBottom: 12, padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <strong>{j.jobId}</strong>
                              <span className="badge badge-warning" style={{ marginLeft: 8 }}>pending payment</span>
                              <div style={{ fontSize: 13, marginTop: 6 }}>
                                <strong>₦{(j.suggestedPrice || 0).toLocaleString()}</strong>
                                {' · '}
                                {j.customer?.name || 'Customer'} ({j.customer?.phone || '—'})
                              </div>
                              {j.paymentReference && (
                                <div style={{ fontSize: 12, marginTop: 4, color: 'var(--primary-dark)' }}>Ref: {j.paymentReference}</div>
                              )}
                              <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>
                                {j.createdAt ? new Date(j.createdAt).toLocaleString() : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => approvePayment(j._id)}>Approve</button>
                              <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => rejectPayment(j._id)}>Reject</button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {paymentSubTab === 'clearances' && (
                  <div>
                    <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
                      Delivered jobs awaiting completion clearance. Approve moves rider earning to available balance.
                    </p>
                    {pendingClearances.length === 0 ? (
                      <p style={{ color: 'var(--gray-500)' }}>No pending clearances</p>
                    ) : (
                      pendingClearances.map((j) => (
                        <div key={j._id} className="card" style={{ marginBottom: 12, padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <strong>{j.jobId}</strong>
                              <span className="badge badge-warning" style={{ marginLeft: 8 }}>pending clearance</span>
                              <div style={{ fontSize: 13, marginTop: 6 }}>
                                Rider: {j.rider?.name || '—'} · Customer: {j.customer?.name || '—'}
                              </div>
                              <div style={{ fontSize: 13 }}>
                                Earning ₦{(j.riderEarning || 0).toLocaleString()} · Commission ₦{(j.commissionAmount || 0).toLocaleString()}
                                {' · '}{j.paymentMethod === 'bank_transfer' ? 'Bank' : 'COD'}
                              </div>
                              {j.proofPhotos?.delivered && (
                                <a href={j.proofPhotos.delivered} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>View delivery proof</a>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                              <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => openJobTimeline(j._id)}>Timeline</button>
                              <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => approveClearance(j._id)}>Approve clearance</button>
                              <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => rejectClearance(j._id)}>Reject</button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {paymentSubTab === 'withdraws' && (
                  <div>
                    {pendingWithdraws.length === 0 ? (
                      <p style={{ color: 'var(--gray-500)' }}>No pending withdraws</p>
                    ) : (
                      pendingWithdraws.map((w) => (
                        <div key={w._id} className="card" style={{ marginBottom: 12, padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <strong>{w.rider?.name || 'Rider'}</strong>
                              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>₦{(w.amount || 0).toLocaleString()}</div>
                              <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                                {w.bankSnapshot?.bankName} · {w.bankSnapshot?.accountName} · {w.bankSnapshot?.accountNumber}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                                {w.createdAt ? new Date(w.createdAt).toLocaleString() : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => markWithdrawPaid(w._id)}>Mark paid</button>
                              <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => rejectWithdraw(w._id)}>Reject</button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {paymentSubTab === 'bank' && (
                  <div>
                    {bankKycList.length === 0 ? (
                      <p style={{ color: 'var(--gray-500)' }}>No bank KYC submissions</p>
                    ) : (
                      bankKycList.map((r) => (
                        <div key={r._id} className="card" style={{ marginBottom: 12, padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <strong>{r.name}</strong>
                              <div style={{ fontSize: 13 }}>{r.phone} · {r.email}</div>
                              <div style={{ fontSize: 13, marginTop: 4 }}>
                                {r.riderBank?.bankName} · {r.riderBank?.accountName} · {r.riderBank?.accountNumber}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => reviewBankKyc(r._id, 'approve')}>Approve</button>
                              <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => reviewBankKyc(r._id, 'reject')}>Reject</button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {paymentSubTab === 'settlements' && (
                  <div>
                    {commissionSettlements.length === 0 ? (
                      <p style={{ color: 'var(--gray-500)' }}>No settlements yet</p>
                    ) : (
                      commissionSettlements.map((s) => (
                        <div key={s._id} className="card" style={{ marginBottom: 8, padding: 12, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <strong>{s.rider?.name || 'Rider'}</strong>
                            <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700 }}>₦{(s.amount || 0).toLocaleString()}</div>
                            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.note || '—'}{s.job?.jobId ? ` · Job ${s.job.jobId}` : ''}</div>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--gray-500)', textAlign: 'right' }}>
                            {s.createdAt ? new Date(s.createdAt).toLocaleString() : ''}
                            <div>by {s.settledBy?.name || 'admin'}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* NOW-5 timeline modal-ish panel */}
                {timelineJob && (
                  <div className="card" style={{ marginTop: 20, border: '2px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ fontSize: 16, margin: 0 }}>Timeline · {timelineJob.jobId}</h3>
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setTimelineJob(null)}>Close</button>
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 8 }}>
                      Status: <strong>{String(timelineJob.status).replace(/_/g, ' ')}</strong>
                      {' · '}{timelineJob.paymentMethod === 'bank_transfer' ? 'Bank transfer' : 'COD'}
                    </div>
                    {(timelineJob.statusHistory || []).slice().sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0)).map((h, i) => (
                      <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--gray-200)', fontSize: 13 }}>
                        <div style={{ fontWeight: 600 }}>{String(h.status || '').replace(/_/g, ' ')}</div>
                        <div style={{ color: 'var(--gray-500)' }}>
                          {h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}
                          {h.updatedBy?.name ? ` · ${h.updatedBy.name}` : ''}
                          {h.updatedBy?.role ? ` (${h.updatedBy.role})` : ''}
                        </div>
                        {h.note && <div style={{ marginTop: 4 }}>{h.note}</div>}
                        {h.photo && (
                          <a href={h.photo} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>View media</a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                    <div>
                      <strong>{r.name}</strong>
                      <div style={{ color: 'var(--danger)', fontWeight: 700 }}>₦{(r.commissionOwed || 0).toLocaleString()} owed</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{r.phone || r.email || ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input type="number" placeholder="Amount" value={payAmount[r._id] || ''} onChange={(e) => setPayAmount({ ...payAmount, [r._id]: e.target.value })} style={{ width: 100, padding: 8, borderRadius: 8, border: '1px solid var(--gray-200)' }} />
                      <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => markCommission(r._id)}>Settle amount</button>
                      <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => settleAllCommission(r._id, r.name)} disabled={!r.commissionOwed}>
                        Settle all
                      </button>
                    </div>
                  </div>
                ))}
                {finance.riders.length === 0 && <p style={{ color: 'var(--gray-500)' }}>No riders with commission owed</p>}
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
                        <option value="all_merchants">All merchants</option>
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
                        <option value="all_merchants">All merchants</option>
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
