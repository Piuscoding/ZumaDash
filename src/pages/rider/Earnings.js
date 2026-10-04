import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import RiderNavbar from '../../components/RiderNavbar';
import api from '../../services/api';

const RiderEarnings = () => {
  const { user, refreshUser } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [withdraws, setWithdraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [bankForm, setBankForm] = useState({ bankName: '', accountName: '', accountNumber: '' });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = async () => {
    try {
      const [jobsRes, wRes] = await Promise.all([
        api.get('/api/jobs/my'),
        api.get('/api/users/withdraws').catch(() => ({ data: { withdraws: [] } })),
      ]);
      const relevant = (jobsRes.data.jobs || []).filter((j) =>
        ['completed', 'pending_clearance', 'delivered', 'picked', 'live', 'accepted'].includes(j.status)
      );
      setJobs(relevant);
      setWithdraws(wRes.data.withdraws || []);
      if (refreshUser) await refreshUser();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.riderBank) {
      setBankForm({
        bankName: user.riderBank.bankName || '',
        accountName: user.riderBank.accountName || '',
        accountNumber: user.riderBank.accountNumber || '',
      });
    }
  }, [user]);

  const commissionOwed = user?.commissionOwed || 0;
  const pendingClearance = user?.pendingClearance || 0;
  const availableBalance = user?.availableBalance || 0;
  const bankStatus = user?.riderBank?.status || 'none';

  const submitBank = async (e) => {
    e.preventDefault();
    setSavingBank(true);
    setMessage('');
    try {
      await api.put('/api/users/rider-bank', bankForm);
      setMessage('Bank details submitted for admin verification');
      if (refreshUser) await refreshUser();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save bank details');
    } finally {
      setSavingBank(false);
    }
  };

  const requestWithdraw = async (e) => {
    e.preventDefault();
    setWithdrawing(true);
    setMessage('');
    try {
      const res = await api.post('/api/users/withdraw', { amount: Number(withdrawAmount) });
      setMessage(res.data.message || 'Withdraw requested');
      setWithdrawAmount('');
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Withdraw failed');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RiderNavbar />

      <div className="container" style={{ padding: '24px 16px', maxWidth: 700 }}>
        {message && (
          <div style={{ background: '#e0f2fe', color: '#075985', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {message}
          </div>
        )}

        {/* NOW-2: three balances */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div className="card" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>Pending clearance</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#b45309' }}>
              ₦{pendingClearance.toLocaleString()}
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>Available</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
              ₦{availableBalance.toLocaleString()}
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>Commission owed</div>
            <div style={{
              fontSize: 20,
              fontWeight: 800,
              color: commissionOwed > 0 ? 'var(--danger)' : 'var(--success)',
            }}>
              ₦{commissionOwed.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>COD only</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24, background: 'var(--primary-light)', border: '1px solid #bbf7d0' }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>How balances work</h3>
          <p style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 6 }}>
            After you mark delivered, earnings sit in <strong>pending clearance</strong> until admin approves.
            Then they move to <strong>available</strong> for withdraw.
          </p>
          <p style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.6 }}>
            <strong>COD:</strong> commission is owed and blocks withdraw until settled.
            <strong> Bank transfer:</strong> commission is already with the platform (not owed).
          </p>
        </div>

        {/* NOW-3: Bank KYC */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Payout bank account</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
            Status:{' '}
            <strong>
              {bankStatus === 'none' && 'Not submitted'}
              {bankStatus === 'submitted' && 'Under review'}
              {bankStatus === 'approved' && 'Approved'}
              {bankStatus === 'rejected' && `Rejected${user?.riderBank?.rejectionReason ? `: ${user.riderBank.rejectionReason}` : ''}`}
            </strong>
          </p>
          <form onSubmit={submitBank}>
            <div className="form-group">
              <label>Bank name</label>
              <input required value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Account name</label>
              <input required value={bankForm.accountName} onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Account number</label>
              <input required value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={savingBank}>
              {savingBank ? 'Saving…' : bankStatus === 'rejected' ? 'Resubmit bank details' : 'Submit bank details'}
            </button>
          </form>
        </div>

        {/* NOW-3: Withdraw */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Request withdraw</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
            Only from available balance. Blocked if commission owed or bank not approved.
          </p>
          <form onSubmit={requestWithdraw} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 140 }}>
              <label>Amount (₦)</label>
              <input
                type="number"
                min={1}
                max={availableBalance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                required
              />
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={withdrawing || bankStatus !== 'approved' || commissionOwed > 0 || availableBalance <= 0}
            >
              {withdrawing ? 'Submitting…' : 'Request withdraw'}
            </button>
          </form>
          {withdraws.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Recent withdraws</h3>
              {withdraws.map((w) => (
                <div key={w._id} style={{ fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--gray-200)' }}>
                  ₦{(w.amount || 0).toLocaleString()} · {w.status}
                  {w.paymentReference ? ` · Ref ${w.paymentReference}` : ''}
                  <span style={{ color: 'var(--gray-400)', marginLeft: 8 }}>
                    {w.createdAt ? new Date(w.createdAt).toLocaleString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Job History</h2>
        {loading ? (
          <p style={{ color: 'var(--gray-500)' }}>Loading...</p>
        ) : jobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: 'var(--gray-500)' }}>No jobs yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {jobs.map((job) => {
              const isBank = job.paymentMethod === 'bank_transfer';
              const isCleared = job.status === 'completed';
              const isPendingClear = job.status === 'pending_clearance';
              return (
                <div key={job._id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                    <strong style={{ fontSize: 14 }}>{job.jobId}</strong>
                    <span className="badge badge-info">{String(job.status).replace(/_/g, ' ')}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 6 }}>
                    {new Date(job.createdAt).toLocaleDateString()}
                    {' · '}
                    {isBank ? 'Bank transfer' : 'Cash on Delivery'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span>Agreed: ₦{(job.agreedPrice || job.suggestedPrice || 0).toLocaleString()}</span>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      You: ₦{(job.riderEarning || 0).toLocaleString()}
                    </span>
                  </div>
                  {isPendingClear && (
                    <div style={{ fontSize: 12, marginTop: 6, color: '#b45309' }}>
                      Earning held in pending clearance until admin approves
                    </div>
                  )}
                  {job.commissionAmount > 0 && (
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      {isBank ? (
                        <span style={{ color: 'var(--success)' }}>
                          Commission ₦{job.commissionAmount.toLocaleString()} — with platform (not owed)
                        </span>
                      ) : (
                        <span style={{ color: isCleared ? 'var(--danger)' : 'var(--gray-500)' }}>
                          Commission ₦{job.commissionAmount.toLocaleString()}
                          {isCleared ? ' — owed (COD)' : isPendingClear ? ' — owed after clearance (COD)' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderEarnings;
