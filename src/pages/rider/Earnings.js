import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import RoleNavbar from '../../components/RoleNavbar';

const WITHDRAW_FEE = 50;

const Earnings = () => {
  const { user, loadUser } = useAuth();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stmtBusy, setStmtBusy] = useState(false);
  const [stmtMsg, setStmtMsg] = useState('');

  const [bankForm, setBankForm] = useState({ bankName: '', accountName: '', accountNumber: '' });
  const [bankMsg, setBankMsg] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [withdraws, setWithdraws] = useState([]);
  const [withdrawsLoading, setWithdrawsLoading] = useState(true);

  useEffect(() => {
    if (user?.riderBank) {
      setBankForm({
        bankName: user.riderBank.bankName || '',
        accountName: user.riderBank.accountName || '',
        accountNumber: user.riderBank.accountNumber || '',
      });
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setJobsLoading(true);
      try {
        const res = await api.get('/api/jobs/my');
        if (!cancelled) setJobs(res.data.jobs || []);
      } catch (_) {
        if (!cancelled) setJobs([]);
      } finally {
        if (!cancelled) setJobsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setWithdrawsLoading(true);
      try {
        const res = await api.get('/api/users/withdraws');
        if (!cancelled) setWithdraws(res.data.withdraws || res.data.list || []);
      } catch (_) {
        if (!cancelled) setWithdraws([]);
      } finally {
        if (!cancelled) setWithdrawsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const lockUntil = user?.riderBank?.bankDetailsLockedUntil
    ? new Date(user.riderBank.bankDetailsLockedUntil)
    : null;
  const docsBlocked = !!user?.documentsReuploadRequired;
  const bankLocked =
    user?.riderBank?.status === 'approved' &&
    lockUntil &&
    !Number.isNaN(lockUntil.getTime()) &&
    lockUntil.getTime() > Date.now();

  const downloadStatement = async (format, emailPdf = false) => {
    setStmtBusy(true);
    setStmtMsg('');
    try {
      const params = { format };
      if (from) params.from = from;
      if (to) params.to = to;
      if (emailPdf) params.email = '1';
      const res = await api.get('/api/users/earnings/statement', {
        params,
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: format === 'csv' ? 'text/csv' : 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zumadash-earnings-${Date.now()}.${format === 'csv' ? 'csv' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStmtMsg(
        emailPdf
          ? 'PDF downloaded and emailed to your verified email (if configured).'
          : `${format.toUpperCase()} downloaded.`
      );
    } catch (err) {
      let msg = 'Could not download statement';
      try {
        if (err.response?.data instanceof Blob) {
          const text = await err.response.data.text();
          const j = JSON.parse(text);
          msg = j.message || msg;
        } else {
          msg = err.response?.data?.message || err.message || msg;
        }
      } catch (_) {}
      setStmtMsg(msg);
    } finally {
      setStmtBusy(false);
    }
  };

  const saveBank = async (e) => {
    e.preventDefault();
    if (bankLocked) return;
    setBusy(true);
    setBankMsg('');
    try {
      await api.put('/api/users/rider-bank', bankForm);
      setBankMsg('Bank details submitted for admin review');
      if (loadUser) await loadUser();
    } catch (err) {
      setBankMsg(err.response?.data?.message || 'Failed to save bank');
    } finally {
      setBusy(false);
    }
  };

  const requestWithdraw = async (e) => {
    if (user?.documentsReuploadRequired) {
      setWithdrawMsg('Re-upload and approval required before withdrawals.');
      return;
    }

    e.preventDefault();
    setBusy(true);
    setWithdrawMsg('');
    try {
      const amount = Number(withdrawAmount);
      const res = await api.post('/api/users/withdraw', { amount });
      setWithdrawMsg(res.data.message || 'Withdraw submitted');
      setWithdrawAmount('');
      if (loadUser) await loadUser();
    } catch (err) {
      setWithdrawMsg(err.response?.data?.message || 'Withdraw failed');
    } finally {
      setBusy(false);
    }
  };

  const totalWithdrawn = withdraws
    .filter((w) => ['paid', 'approved', 'completed'].includes(String(w.status || '').toLowerCase()) || w.status === 'paid')
    .reduce((s, w) => s + (Number(w.amount) || 0), 0);
  // Prefer sum of all non-rejected if paid statuses sparse
  const totalWithdrawnAll = withdraws
    .filter((w) => String(w.status || '').toLowerCase() !== 'rejected')
    .reduce((s, w) => s + (Number(w.amount) || 0), 0);

  const available = Number(user?.availableBalance || 0);
  const amountNum = Number(withdrawAmount) || 0;
  const totalDebit = amountNum > 0 ? amountNum + WITHDRAW_FEE : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RoleNavbar />
      <div className="container" style={{ padding: '24px 16px', maxWidth: 560 }}>
        <Link to="/rider" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}>
          ← Dashboard
        </Link>
        <h1 style={{ fontSize: 22, margin: '12px 0 16px' }}>Earnings</h1>

        {/* Earnings statement PDF / CSV */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>Earnings statement</h3>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12 }}>
            Download a PDF or CSV for a period. Optionally email the PDF to your verified email.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <div className="form-group" style={{ flex: '1 1 120px', margin: 0 }}>
              <label style={{ fontSize: 12 }}>From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div className="form-group" style={{ flex: '1 1 120px', margin: 0 }}>
              <label style={{ fontSize: 12 }}>To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={stmtBusy}
              onClick={() => downloadStatement('pdf', false)}
            >
              Download PDF
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={stmtBusy}
              onClick={() => downloadStatement('csv', false)}
            >
              Download CSV
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={stmtBusy}
              onClick={() => downloadStatement('pdf', true)}
            >
              PDF + email me
            </button>
          </div>
          {stmtMsg && (
            <p style={{ fontSize: 13, marginTop: 10, color: 'var(--primary)' }}>{stmtMsg}</p>
          )}
        </div>

        {/* Balance cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div className="card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Pending clearance</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#b45309' }}>
              ₦{(user?.pendingClearance || 0).toLocaleString()}
            </div>
          </div>
          <div className="card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Available</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
              ₦{available.toLocaleString()}
            </div>
          </div>
          <div className="card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Commission owed</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: (user?.commissionOwed || 0) > 0 ? 'var(--danger)' : 'var(--primary)',
              }}
            >
              ₦{(user?.commissionOwed || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: 'var(--gray-500)' }}>COD only</div>
          </div>
          <div className="card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Total earned</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              ₦{(user?.totalEarnings || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 14,
            marginBottom: 16,
            background: '#ecfdf5',
            border: '1px solid #6ee7b7',
          }}
        >
          <h3 style={{ fontSize: 14, marginBottom: 6 }}>How balances work</h3>
          <p style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.5, margin: 0 }}>
            After you mark delivered, earnings sit in pending clearance until admin approves. Then
            they move to available for withdraw. COD commission is owed and blocks withdraw until
            settled. A ₦{WITHDRAW_FEE} fee is charged on every withdraw.
          </p>
        </div>

        {/* Payout bank — 30-day lock after approve */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Payout bank account</h3>
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            Status: <strong>{user?.riderBank?.status || 'Not submitted'}</strong>
            {bankLocked && (
              <span style={{ display: 'block', fontSize: 12, color: '#b45309', marginTop: 4 }}>
                Locked until {lockUntil.toLocaleDateString()} (30 days after approval)
              </span>
            )}
          </div>
          <form onSubmit={saveBank}>
            <div className="form-group">
              <label>Bank name</label>
              <input
                required
                value={bankForm.bankName}
                disabled={bankLocked}
                readOnly={bankLocked}
                onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                style={{ width: '100%', background: bankLocked ? '#f1f5f9' : undefined }}
              />
            </div>
            <div className="form-group">
              <label>Account name</label>
              <input
                required
                value={bankForm.accountName}
                disabled={bankLocked}
                readOnly={bankLocked}
                onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                style={{ width: '100%', background: bankLocked ? '#f1f5f9' : undefined }}
              />
            </div>
            <div className="form-group">
              <label>Account number</label>
              <input
                required
                value={bankForm.accountNumber}
                disabled={bankLocked}
                readOnly={bankLocked}
                onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                style={{ width: '100%', background: bankLocked ? '#f1f5f9' : undefined }}
              />
            </div>
            {!bankLocked && (
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {user?.riderBank?.status === 'approved'
                  ? 'Update bank details'
                  : 'Submit bank for approval'}
              </button>
            )}
          </form>
          {bankMsg && (
            <p style={{ fontSize: 13, marginTop: 8, color: 'var(--primary)' }}>{bankMsg}</p>
          )}
        </div>

        {/* Withdraw + ₦50 fee */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Withdraw</h3>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 10 }}>
            Fee ₦{WITHDRAW_FEE} is added on every withdrawal (any amount including ₦10,000+). You
            need amount + fee available.
          </p>
          <form onSubmit={requestWithdraw}>
            <div className="form-group">
              <label>Amount to receive (₦)</label>
              <input
                type="number"
                min={1}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>
            {amountNum > 0 && (
              <p style={{ fontSize: 13, marginBottom: 10 }}>
                Fee ₦{WITHDRAW_FEE} · Total debit <strong>₦{totalDebit.toLocaleString()}</strong>{' '}
                (available ₦{available.toLocaleString()})
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy || amountNum <= 0}>
              docsBlocked ? 'Re-upload docs first' : 'Request withdraw'
            </button>
          </form>
          {withdrawMsg && <p style={{ fontSize: 13, marginTop: 8 }}>{withdrawMsg}</p>}
        </div>


        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Withdrawal history</h3>
          <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 10 }}>
            Total withdrawn:{' '}
            <strong style={{ color: 'var(--gray-900)' }}>
              ₦{(totalWithdrawn > 0 ? totalWithdrawn : totalWithdrawnAll).toLocaleString()}
            </strong>
          </div>
          {withdrawsLoading ? (
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Loading…</p>
          ) : withdraws.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No withdrawals yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {withdraws.map((w) => (
                <div
                  key={w._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: 13,
                    padding: '8px 0',
                    borderBottom: '1px solid var(--gray-100)',
                  }}
                >
                  <div>
                    <strong>₦{Number(w.amount || 0).toLocaleString()}</strong>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      {w.createdAt ? new Date(w.createdAt).toLocaleString() : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{String(w.status || 'pending').replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Job / earnings history */}
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Job history</h2>
        {jobsLoading ? (
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>Loading history…</p>
        ) : jobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 28 }}>
            <p style={{ color: 'var(--gray-500)', margin: 0 }}>No jobs yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {jobs.map((job) => (
              <Link
                key={job._id}
                to={`/track/${job._id}`}
                className="card"
                style={{ display: 'block', padding: 16, textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <strong style={{ fontSize: 14 }}>{job.jobId}</strong>
                  <span className="badge badge-info">{String(job.status || '').replace(/_/g, ' ')}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 6 }}>
                  {job.createdAt ? new Date(job.createdAt).toLocaleString() : ''}
                  {job.paymentMethod ? ` · ${job.paymentMethod === 'bank_transfer' ? 'Bank' : 'COD'}` : ''}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 14,
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span>
                    Agreed: ₦{(job.agreedPrice || job.suggestedPrice || 0).toLocaleString()}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    You: ₦{(job.riderEarning || 0).toLocaleString()}
                  </span>
                </div>
                {Number(job.commissionAmount) > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                    Commission: ₦{Number(job.commissionAmount).toLocaleString()}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Earnings;
