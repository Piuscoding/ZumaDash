import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import RoleNavbar from '../../components/RoleNavbar';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'pending_review', label: 'Under review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'paid', label: 'Paid' },
];

const statusBadge = (status) => {
  const map = {
    unpaid: { bg: '#fee2e2', color: '#991b1b', label: 'Unpaid' },
    pending_review: { bg: '#fef3c7', color: '#92400e', label: 'Under review' },
    approved: { bg: '#dbeafe', color: '#1e40af', label: 'Approved' },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
    paid: { bg: '#d1fae5', color: '#065f46', label: 'Paid' },
  };
  const s = map[status] || { bg: '#f1f5f9', color: '#475569', label: String(status || '—') };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: 999,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
};

const PayCommission = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState(null);
  const [payTarget, setPayTarget] = useState(null); // { amount, jobMongoId?, jobId?, label? }
  const [paymentReference, setPaymentReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/users/me/commission', { params: { status: 'all' } });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openPay = (target) => {
    setPayTarget(target);
    setConfirmed(false);
    setPaymentReference('');
    setMessage('');
  };

  const submitPay = async () => {
    if (!confirmed || !payTarget) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await api.post('/api/users/me/commission/pay', {
        amount: payTarget.amount,
        jobMongoId: payTarget.jobMongoId || undefined,
        paymentReference: paymentReference.trim(),
      });
      setMessage(res.data.message || 'Submitted for review');
      setPayTarget(null);
      setConfirmed(false);
      setPaymentReference('');
      await load();
    } catch (e) {
      setMessage(e.response?.data?.message || 'Could not submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  const owed = Number(data?.commissionOwed || 0);
  const lifetime = Number(data?.totalCommissionPaid || 0);
  const bank = data?.bankDetails || {};
  const lineItems = data?.lineItems || [];
  const requests = data?.requests || [];

  const visibleLines = lineItems.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'unpaid') return item.status === 'unpaid' || item.status === 'rejected';
    return item.status === filter;
  });

  const canPayLine = (item) =>
    (item.status === 'unpaid' || item.status === 'rejected') &&
    Number(item.amount) > 0 &&
    owed > 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RoleNavbar />
      <div className="container" style={{ padding: '24px 16px', maxWidth: 640 }}>
        <Link to="/rider" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}>
          ← Dashboard
        </Link>
        <h1 style={{ fontSize: 22, margin: '12px 0 4px' }}>Pay commission</h1>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
          COD platform commission (and VAT if set). Pay a single delivery line or the full balance by bank
          transfer, then wait for admin review and settlement.
        </p>

        {message && (
          <div
            style={{
              background: '#e0f2fe',
              color: '#075985',
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            {message}
          </div>
        )}
        {error && <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 14 }}>{error}</div>}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={filter === f.key ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--gray-500)' }}>Loading…</p>
        ) : (
          <>
            {/* Summary: total owed + lifetime paid + pay all */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Total commission owed</div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: owed > 0 ? 'var(--danger)' : 'var(--primary)',
                    }}
                  >
                    ₦{owed.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 6 }}>
                    Lifetime paid: <strong>₦{lifetime.toLocaleString()}</strong>
                  </div>
                </div>
                {owed > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '10px 14px', fontSize: 13 }}
                    onClick={() =>
                      openPay({
                        amount: owed,
                        label: 'Full balance',
                      })
                    }
                  >
                    Pay commission
                  </button>
                )}
              </div>
            </div>

            {/* Each owed commission — same card style as payment history */}
            <h2 style={{ fontSize: 15, marginBottom: 10 }}>Commission by delivery</h2>
            {visibleLines.length === 0 ? (
              <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 16 }}>
                No commission lines for this filter.
              </p>
            ) : (
              visibleLines.map((item) => (
                <div
                  key={String(item.jobMongoId || item.jobId)}
                  className="card"
                  style={{ padding: 14, marginBottom: 10 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      flexWrap: 'wrap',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.jobId}</div>
                      <div style={{ fontWeight: 800, fontSize: 18, marginTop: 4 }}>
                        ₦{Number(item.amount || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : ''}
                        {Number(item.vatAmount) > 0
                          ? ` · Comm ₦${Number(item.commissionAmount || 0).toLocaleString()} + VAT ₦${Number(
                              item.vatAmount
                            ).toLocaleString()}`
                          : ''}
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 8,
                      }}
                    >
                      {statusBadge(item.status)}
                      {canPayLine(item) && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '8px 12px', fontSize: 12 }}
                          onClick={() =>
                            openPay({
                              amount: Math.min(Number(item.amount) || 0, owed),
                              jobMongoId: item.jobMongoId,
                              jobId: item.jobId,
                              label: item.jobId,
                            })
                          }
                        >
                          Pay commission
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Payment card (same bank details flow) */}
            {payTarget && (
              <div
                className="card"
                style={{
                  padding: 16,
                  marginTop: 8,
                  marginBottom: 16,
                  border: '2px solid var(--primary)',
                  background: '#f8fafc',
                }}
              >
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>Payment details</h3>
                <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 10 }}>
                  {payTarget.jobId
                    ? `Paying for ${payTarget.jobId}`
                    : payTarget.label || 'Paying full commission balance'}
                </p>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Bank</div>
                  <div style={{ fontWeight: 700 }}>{bank.bankName || '—'}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Account name</div>
                  <div style={{ fontWeight: 700 }}>{bank.accountName || '—'}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Account number</div>
                  <div style={{ fontWeight: 800, letterSpacing: 1 }}>{bank.accountNumber || '—'}</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Amount</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>
                    ₦{Number(payTarget.amount).toLocaleString()}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Payment reference (optional)</label>
                  <input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transfer reference"
                    style={{ width: '100%' }}
                  />
                </div>
                <label
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    marginBottom: 12,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    style={{ marginTop: 3, width: 18, height: 18 }}
                  />
                  <span>
                    I confirm I transferred ₦{Number(payTarget.amount).toLocaleString()} to this account.
                  </span>
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!confirmed || submitting}
                    onClick={submitPay}
                  >
                    {submitting ? 'Submitting…' : 'I have paid'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setPayTarget(null);
                      setConfirmed(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <h2 style={{ fontSize: 15, margin: '20px 0 10px' }}>Payment history</h2>
            {requests.length === 0 ? (
              <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>No payment submissions yet.</p>
            ) : (
              requests.map((r) => (
                <div key={r._id} className="card" style={{ padding: 14, marginBottom: 10 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      flexWrap: 'wrap',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>₦{Number(r.amount || 0).toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                        {r.paymentReference ? ` · Ref: ${r.paymentReference}` : ''}
                        {r.job?.jobId ? ` · ${r.job.jobId}` : ''}
                      </div>
                      {r.reviewNote && r.status === 'rejected' && (
                        <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
                          {r.reviewNote}
                        </div>
                      )}
                    </div>
                    {statusBadge(r.status)}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PayCommission;
