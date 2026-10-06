import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import MerchantNavbar from '../../components/MerchantNavbar';

const MerchantDashboard = () => {
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [riders, setRiders] = useState([]);
  const [bikes, setBikes] = useState([]);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [period, setPeriod] = useState('month');
  const [filterRider, setFilterRider] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    bikeId: '',
    allowTakeJobs: true,
    suspended: false,
    blockWithdrawals: false,
    allowMerchantWithdraw: false,
  });
  const [bankForm, setBankForm] = useState({ bankName: '', accountName: '', accountNumber: '' });
  const [withdrawForm, setWithdrawForm] = useState({ riderId: '', amount: '' });
  const [digest, setDigest] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('week');
  const [chartData, setChartData] = useState([]);
  const [withdraws, setWithdraws] = useState([]);

  const loadChart = async (period = chartPeriod) => {
    try {
      const [histRes, digRes] = await Promise.all([
        api.get('/api/merchant/history', { params: { period } }),
        api.get(`/api/merchant/digest?period=${period}`).catch(() => ({ data: null })),
      ]);
      const jobs = histRes.data.jobs || [];
      const dig = digRes.data?.digest;

      const completed = jobs.filter((j) => j.status === 'completed').length;
      const notCompleted = jobs.filter((j) => !['completed', 'cancelled'].includes(j.status)).length;
      const cancelled = jobs.filter((j) => j.status === 'cancelled').length;
      const completedValue = jobs
        .filter((j) => j.status === 'completed')
        .reduce((s, j) => s + (j.agreedPrice || 0), 0);

      // Bar chart metrics — all dashboard numbers for selected period
      const metrics = [
        { key: 'riders', label: 'Riders', value: dig?.riders?.total ?? 0, color: '#0f766e' },
        { key: 'completed', label: 'Completed', value: dig?.jobs?.completed ?? completed, color: '#059669' },
        { key: 'active', label: 'In progress', value: dig?.jobs?.active ?? notCompleted, color: '#d97706' },
        { key: 'pendingClear', label: 'Pending clear', value: dig?.jobs?.pendingClearance ?? 0, color: '#b45309' },
        { key: 'cancelled', label: 'Cancelled', value: cancelled, color: '#dc2626' },
        { key: 'owed', label: 'Comm. owed ₦', value: dig?.money?.commissionOwed ?? 0, color: '#e11d48', isMoney: true },
        { key: 'pendingMoney', label: 'Pending ₦', value: dig?.money?.pendingClearance ?? 0, color: '#ca8a04', isMoney: true },
        { key: 'available', label: 'Available ₦', value: dig?.money?.available ?? 0, color: '#2563eb', isMoney: true },
        { key: 'jobValue', label: 'Completed ₦', value: dig?.jobs?.completedValue ?? completedValue, color: '#7c3aed', isMoney: true },
      ];
      setChartData(metrics);
    } catch (_) {
      setChartData([]);
    }
  };

  const load = async () => {
    try {
      const [d, b, r, dig, w] = await Promise.all([
        api.get('/api/merchant/dashboard'),
        api.get('/api/merchant/bikes'),
        api.get('/api/merchant/riders'),
        api.get('/api/merchant/digest?period=today').catch(() => ({ data: null })),
        api.get('/api/merchant/withdraws').catch(() => ({ data: { withdraws: [] } })),
      ]);
      setStats(d.data.stats);
      setRiders(r.data.riders || d.data.riders || []);
      setBikes(b.data.bikes || []);
      setDigest(dig.data?.digest || null);
      setWithdraws(w.data.withdraws || []);
      await loadChart(chartPeriod);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to load');
    }
  };

  const pushDigestNotify = async () => {
    try {
      const res = await api.post('/api/merchant/digest/notify-me');
      setMessage(res.data.message || 'Digest notification sent');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get('/api/merchant/history', {
        params: { period, riderId: filterRider || undefined },
      });
      setHistory(res.data.jobs || []);
    } catch (err) {
      setMessage(err.response?.data?.message || 'History failed');
    }
  };

  useEffect(() => {
    load();
    if (user?.merchantBank) {
      setBankForm({
        bankName: user.merchantBank.bankName || '',
        accountName: user.merchantBank.accountName || '',
        accountNumber: user.merchantBank.accountNumber || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, period, filterRider]);

  useEffect(() => {
    if (tab === 'overview') loadChart(chartPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartPeriod, tab]);

  const createRider = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/api/merchant/riders', {
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone,
        password: createForm.password,
        bikeId: createForm.bikeId,
        fleetFlags: {
          allowTakeJobs: createForm.allowTakeJobs,
          suspended: createForm.suspended,
          blockWithdrawals: createForm.blockWithdrawals,
          allowMerchantWithdraw: createForm.allowMerchantWithdraw,
        },
      });
      setMessage('Rider created');
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        bikeId: '',
        allowTakeJobs: true,
        suspended: false,
        blockWithdrawals: false,
        allowMerchantWithdraw: false,
      });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Create failed');
    }
  };

  const saveFlags = async (rider) => {
    try {
      await api.put(`/api/merchant/riders/${rider._id}`, { fleetFlags: rider.fleetFlags });
      setMessage('Flags saved');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Save failed');
    }
  };

  const deleteRider = async (id) => {
    if (!window.confirm('Deactivate this rider? Blocked if they have an active job.')) return;
    try {
      await api.delete(`/api/merchant/riders/${id}`);
      setMessage('Rider deactivated');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Delete failed');
    }
  };

  const submitBank = async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/merchant/bank', bankForm);
      setMessage('Bank submitted for admin approval');
      if (refreshUser) await refreshUser();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Bank save failed');
    }
  };

  const withdrawFromRider = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/merchant/withdraw-from-rider', {
        riderId: withdrawForm.riderId,
        amount: Number(withdrawForm.amount),
      });
      setMessage('Withdraw request submitted (admin pays to your bank)');
      setWithdrawForm({ riderId: '', amount: '' });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Withdraw failed');
    }
  };

  const updateLocalFlag = (riderId, key, value) => {
    setRiders((list) =>
      list.map((r) =>
        r._id === riderId
          ? { ...r, fleetFlags: { ...(r.fleetFlags || {}), [key]: value } }
          : r
      )
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <MerchantNavbar />

      <div className="container" style={{ padding: '20px 16px', maxWidth: 900 }}>
        {message && (
          <div style={{ background: '#e0f2fe', color: '#075985', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>{message}</div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {['overview', 'riders', 'bikes', 'history', 'money'].map((t) => (
            <button
              key={t}
              type="button"
              className={tab === t ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '8px 12px', fontSize: 13, textTransform: 'capitalize' }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && stats && (
          <div>
          {digest && (
            <div className="card" style={{ marginBottom: 16, background: 'var(--primary-light)', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 15, margin: '0 0 6px' }}>Today&apos;s fleet digest</h3>
                  <p style={{ fontSize: 13, margin: 0, color: 'var(--gray-700)' }}>
                    {digest.jobs?.completed || 0} completed · {digest.jobs?.active || 0} active · {digest.jobs?.pendingClearance || 0} pending clearance
                    {' · '}Owed ₦{(digest.money?.commissionOwed || 0).toLocaleString()}
                    {' · '}Available ₦{(digest.money?.available || 0).toLocaleString()}
                  </p>
                </div>
                <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={pushDigestNotify}>
                  Notify me
                </button>
              </div>
            </div>
          )}

                    <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, margin: 0 }}>Fleet metrics (bar chart)</h3>
              <select value={chartPeriod} onChange={(e) => setChartPeriod(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="year">This year</option>
              </select>
            </div>
            {chartData.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No data for this range</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(() => {
                  const maxVal = Math.max(...chartData.map((m) => Number(m.value) || 0), 1);
                  return chartData.map((m) => {
                    const v = Number(m.value) || 0;
                    const pct = Math.max(v > 0 ? 4 : 0, Math.round((v / maxVal) * 100));
                    const display = m.isMoney ? `₦${v.toLocaleString()}` : v.toLocaleString();
                    return (
                      <div key={m.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{m.label}</span>
                          <span style={{ fontWeight: 700, color: m.color }}>{display}</span>
                        </div>
                        <div style={{ height: 14, background: 'var(--gray-100)', borderRadius: 8, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: m.color,
                              borderRadius: 8,
                              transition: 'width 0.35s ease',
                              minWidth: v > 0 ? 4 : 0,
                            }}
                            title={`${m.label}: ${display}`}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
            <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 12, marginBottom: 0 }}>
              Counts and money for the selected period. Bar length is relative within this chart.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {[
              ['Riders', stats.totalRiders],
              ['Completed', stats.totalDeliveriesCompleted],
              ['Not completed', stats.totalNotCompleted],
              ['Commission owed', `₦${(stats.totalCommissionOwed || 0).toLocaleString()}`],
              ['Pending clear', `₦${(stats.totalPendingClearance || 0).toLocaleString()}`],
              ['Available', `₦${(stats.totalAvailable || 0).toLocaleString()}`],
            ].map(([label, val]) => (
              <div key={label} className="card" style={{ textAlign: 'center', padding: 14 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{val}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{label}</div>
              </div>
            ))}
          </div>
          </div>
        )}

        {tab === 'bikes' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>Approved bikes (from fleet application)</p>
            {bikes.length === 0 ? (
              <p style={{ color: 'var(--gray-500)' }}>No bikes yet</p>
            ) : (
              bikes.map((b) => (
                <div key={b._id} className="card" style={{ marginBottom: 10, padding: 12 }}>
                  <strong>{b.label || b.plateNumber}</strong>
                  <div style={{ fontSize: 13 }}>{b.plateNumber} · {b.model} · {b.color}</div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'riders' && (
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Add rider</h3>
              <form onSubmit={createRider}>
                <div className="form-group"><label>Name</label><input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} /></div>
                <div className="form-group"><label>Email</label><input type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /></div>
                <div className="form-group"><label>Phone</label><input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} /></div>
                <div className="form-group"><label>Password</label><input type="password" required minLength={6} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} /></div>
                <div className="form-group">
                  <label>Bike</label>
                  <select required value={createForm.bikeId} onChange={(e) => setCreateForm({ ...createForm, bikeId: e.target.value })}>
                    <option value="">Select bike</option>
                    {bikes
                      .filter((b) => !riders.some((r) => String(r.bikeId?._id || r.bikeId) === String(b._id) && r.isActive !== false))
                      .map((b) => (
                        <option key={b._id} value={b._id}>{b.plateNumber} ({b.label || b.model})</option>
                      ))}
                  </select>
                  <small style={{ fontSize: 12, color: 'var(--gray-500)' }}>Only bikes not already assigned to a rider</small>
                </div>
                <label style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 6 }}>
                  <input type="checkbox" checked={createForm.allowTakeJobs} onChange={(e) => setCreateForm({ ...createForm, allowTakeJobs: e.target.checked })} /> Allow take jobs
                </label>
                <label style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 6 }}>
                  <input type="checkbox" checked={createForm.suspended} onChange={(e) => setCreateForm({ ...createForm, suspended: e.target.checked })} /> Suspended
                </label>
                <label style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 6 }}>
                  <input type="checkbox" checked={createForm.blockWithdrawals} onChange={(e) => setCreateForm({ ...createForm, blockWithdrawals: e.target.checked })} /> Block rider withdrawals
                </label>
                <label style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 12 }}>
                  <input type="checkbox" checked={createForm.allowMerchantWithdraw} onChange={(e) => setCreateForm({ ...createForm, allowMerchantWithdraw: e.target.checked })} /> Allow merchant withdraw from rider
                </label>
                <button className="btn btn-primary" type="submit">Create rider</button>
              </form>
            </div>

            {riders.map((r) => (
              <div key={r._id} className="card" style={{ marginBottom: 12, padding: 14 }}>
                <strong>{r.name}</strong>
                <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{r.email} · {r.phone}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Available ₦{(r.availableBalance || 0).toLocaleString()} · Pending ₦{(r.pendingClearance || 0).toLocaleString()} · Owed ₦{(r.commissionOwed || 0).toLocaleString()}
                </div>
                <div style={{ marginTop: 10, fontSize: 13 }}>
                  <label style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <input type="checkbox" checked={r.fleetFlags?.allowTakeJobs !== false} onChange={(e) => updateLocalFlag(r._id, 'allowTakeJobs', e.target.checked)} /> Allow take jobs
                  </label>
                  <label style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <input type="checkbox" checked={!!r.fleetFlags?.suspended} onChange={(e) => updateLocalFlag(r._id, 'suspended', e.target.checked)} /> Suspended
                  </label>
                  <label style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <input type="checkbox" checked={!!r.fleetFlags?.blockWithdrawals} onChange={(e) => updateLocalFlag(r._id, 'blockWithdrawals', e.target.checked)} /> Block withdrawals
                  </label>
                  <label style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input type="checkbox" checked={!!r.fleetFlags?.allowMerchantWithdraw} onChange={(e) => updateLocalFlag(r._id, 'allowMerchantWithdraw', e.target.checked)} /> Merchant can withdraw
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => saveFlags(r)}>Save</button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => deleteRider(r._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
                <option value="today">Today</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
              <select value={filterRider} onChange={(e) => setFilterRider(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
                <option value="">All riders</option>
                {riders.map((r) => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>
            </div>
            {history.map((j) => (
              <div key={j._id} className="card" style={{ marginBottom: 8, padding: 12, fontSize: 13 }}>
                <strong>{j.jobId}</strong> · {j.rider?.name} · {String(j.status).replace(/_/g, ' ')}
                {j.locationMode === 'map' && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--primary)' }}>map</span>}
                <div>₦{(j.agreedPrice || 0).toLocaleString()} · {j.createdAt ? new Date(j.createdAt).toLocaleString() : ''}</div>
                <Link to={`/track/${j._id}`} style={{ display: 'inline-block', marginTop: 6, fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                  {j.locationMode === 'map' && ['accepted', 'live', 'picked'].includes(j.status)
                    ? 'Open live map'
                    : 'Open track'}
                </Link>
              </div>
            ))}
            {history.length === 0 && <p style={{ color: 'var(--gray-500)' }}>No jobs in this period</p>}
          </div>
        )}

        {tab === 'money' && (
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Merchant bank KYC</h3>
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Status: {user?.merchantBank?.status || 'none'}</p>
              <form onSubmit={submitBank}>
                <div className="form-group"><label>Bank name</label><input required value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} /></div>
                <div className="form-group"><label>Account name</label><input required value={bankForm.accountName} onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })} /></div>
                <div className="form-group"><label>Account number</label><input required value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} /></div>
                <button className="btn btn-primary" type="submit">Submit bank</button>
              </form>
            </div>
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Withdraw from rider</h3>
              <form onSubmit={withdrawFromRider}>
                <div className="form-group">
                  <label>Rider</label>
                  <select required value={withdrawForm.riderId} onChange={(e) => setWithdrawForm({ ...withdrawForm, riderId: e.target.value })}>
                    <option value="">Select</option>
                    {riders.filter((r) => r.fleetFlags?.allowMerchantWithdraw).map((r) => (
                      <option key={r._id} value={r._id}>{r.name} (₦{(r.availableBalance || 0).toLocaleString()})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group"><label>Amount</label><input type="number" required min={1} value={withdrawForm.amount} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} /></div>
                <button className="btn btn-primary" type="submit">Request withdraw</button>
              </form>
            </div>
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Withdraw history (from riders)</h3>
              {withdraws.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No merchant withdraws yet</p>
              ) : (
                withdraws.map((w) => (
                  <div key={w._id} style={{ fontSize: 13, padding: '10px 0', borderBottom: '1px solid var(--gray-200)' }}>
                    <strong>₦{(w.amount || 0).toLocaleString()}</strong> · {w.status}
                    <div style={{ color: 'var(--gray-500)' }}>
                      Rider: {w.rider?.name || '—'} · {w.createdAt ? new Date(w.createdAt).toLocaleString() : ''}
                    </div>
                    {w.paymentReference && <div style={{ fontSize: 12 }}>Ref: {w.paymentReference}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantDashboard;
