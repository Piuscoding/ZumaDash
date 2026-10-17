import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import MerchantNavbar from '../../components/MerchantNavbar';

const CORRIDORS = [
  { key: 'dutse', label: 'Dutse' },
  { key: 'kubwa', label: 'Kubwa' },
  { key: 'bwari', label: 'Bwari' },
  { key: 'ushafa', label: 'Ushafa' },
];

const Toggle = ({ checked, onChange, disabled, label, description }) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '14px 0',
      borderBottom: '1px solid #f1f5f9',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
    }}
  >
    <div>
      <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{label}</div>
      {description && (
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{description}</div>
      )}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 48,
        height: 28,
        borderRadius: 999,
        border: 'none',
        background: checked ? '#0f766e' : '#cbd5e1',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 24 : 3,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }}
      />
    </button>
  </label>
);

const RiderControls = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rider, setRider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [flags, setFlags] = useState({
    allowTakeJobs: true,
    suspended: false,
    blockWithdrawals: false,
    allowMerchantWithdraw: false,
  });
  const [blocks, setBlocks] = useState(
    CORRIDORS.map((c) => ({ corridor: c.key, blocked: false, blockFromTime: '' }))
  );
  const [applyAll, setApplyAll] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await api.get('/api/merchant/riders');
        const list = res.data.riders || [];
        const found = list.find((r) => String(r._id) === String(id));
        if (!found) {
          setErr('Rider not found under your fleet');
          setLoading(false);
          return;
        }
        setRider(found);
        setFlags({
          allowTakeJobs: found.fleetFlags?.allowTakeJobs !== false,
          suspended: !!found.fleetFlags?.suspended,
          blockWithdrawals: !!found.fleetFlags?.blockWithdrawals,
          allowMerchantWithdraw: !!found.fleetFlags?.allowMerchantWithdraw,
        });
        const existing = Array.isArray(found.corridorJobBlocks) ? found.corridorJobBlocks : [];
        setBlocks(
          CORRIDORS.map((c) => {
            const hit = existing.find((b) => String(b.corridor).toLowerCase() === c.key);
            return {
              corridor: c.key,
              blocked: hit ? !!hit.blocked : false,
              blockFromTime: hit?.blockFromTime || '',
            };
          })
        );
      } catch (e) {
        setErr(e.response?.data?.message || e.message || 'Failed to load rider');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const save = async () => {
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      if (applyAll) {
        await api.put('/api/merchant/riders/corridor-blocks-all', {
          corridorJobBlocks: blocks,
        });
      }
      const res = await api.put(`/api/merchant/riders/${id}/controls`, {
        fleetFlags: flags,
        corridorJobBlocks: blocks,
      });
      setRider((prev) =>
        prev
          ? {
              ...prev,
              fleetFlags: res.data.rider?.fleetFlags || flags,
              corridorJobBlocks: res.data.rider?.corridorJobBlocks || blocks,
            }
          : prev
      );
      setMsg(
        applyAll
          ? 'Controls saved for this rider and corridor blocks applied to all fleet riders.'
          : 'Controls saved.'
      );
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <MerchantNavbar />
        <div style={{ maxWidth: 640, margin: '40px auto', padding: 20, textAlign: 'center' }}>
          Loading rider controls…
        </div>
      </div>
    );
  }

  if (!rider) {
    return (
      <div>
        <MerchantNavbar />
        <div style={{ maxWidth: 640, margin: '40px auto', padding: 20 }}>
          <p style={{ color: '#b91c1c' }}>{err || 'Rider not found'}</p>
          <Link to="/merchant" style={{ color: '#0f766e', fontWeight: 600 }}>
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <MerchantNavbar />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px' }}>
        <div style={{ marginBottom: 16 }}>
          <Link to="/merchant" style={{ color: '#0f766e', fontWeight: 600, fontSize: 14 }}>
            ← Back to dashboard
          </Link>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            padding: '20px 24px',
            marginBottom: 20,
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Rider controls
          </h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
            {rider.name} · {rider.email}
            {rider.phone ? ` · ${rider.phone}` : ''}
          </p>
        </div>

        {msg && (
          <div
            style={{
              background: '#ecfdf5',
              color: '#065f46',
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {msg}
          </div>
        )}
        {err && (
          <div
            style={{
              background: '#fef2f2',
              color: '#b91c1c',
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {err}
          </div>
        )}

        {/* Account flags */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            padding: '8px 24px 16px',
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '12px 0 4px' }}>
            Account controls
          </h2>
          <Toggle
            checked={flags.allowTakeJobs}
            onChange={(v) => setFlags((f) => ({ ...f, allowTakeJobs: v }))}
            label="Allow take jobs"
            description="When off, this rider will not receive or accept new jobs"
          />
          <Toggle
            checked={flags.suspended}
            onChange={(v) => setFlags((f) => ({ ...f, suspended: v }))}
            label="Suspended"
            description="Suspends the rider account from platform activity"
          />
          <Toggle
            checked={flags.blockWithdrawals}
            onChange={(v) => setFlags((f) => ({ ...f, blockWithdrawals: v }))}
            label="Block withdrawals"
            description="Prevents this rider from requesting withdrawals"
          />
          <Toggle
            checked={flags.allowMerchantWithdraw}
            onChange={(v) => setFlags((f) => ({ ...f, allowMerchantWithdraw: v }))}
            label="Allow merchant withdraw"
            description="Lets you withdraw available balance from this rider on their behalf"
          />
        </div>

        {/* Corridor blocks */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            padding: '8px 24px 20px',
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '12px 0 4px' }}>
            Corridor job blocks
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>
            Toggle off jobs originating from a corridor. Optional time (HH:mm) means the block
            starts from that local time until midnight; leave empty to block at all times.
          </p>

          {CORRIDORS.map((c, idx) => {
            const b = blocks[idx];
            return (
              <div
                key={c.key}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div style={{ flex: '1 1 120px', fontWeight: 600, fontSize: 14 }}>{c.label}</div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={b.blocked}
                  onClick={() =>
                    setBlocks((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, blocked: !x.blocked } : x))
                    )
                  }
                  style={{
                    width: 48,
                    height: 28,
                    borderRadius: 999,
                    border: 'none',
                    background: b.blocked ? '#0f766e' : '#cbd5e1',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: b.blocked ? 24 : 3,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s',
                    }}
                  />
                </button>
                <span style={{ fontSize: 12, color: '#64748b', width: 70 }}>
                  {b.blocked ? 'Blocked' : 'Open'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#64748b' }}>From</label>
                  <input
                    type="time"
                    value={b.blockFromTime || ''}
                    disabled={!b.blocked}
                    onChange={(e) =>
                      setBlocks((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, blockFromTime: e.target.value } : x
                        )
                      )
                    }
                    style={{
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      fontSize: 13,
                      opacity: b.blocked ? 1 : 0.5,
                    }}
                  />
                </div>
              </div>
            );
          })}

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 16,
              fontSize: 13,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={applyAll}
              onChange={(e) => setApplyAll(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Apply these corridor blocks to <strong>all</strong> my fleet riders
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn btn-primary"
            style={{
              background: '#0f766e',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontWeight: 600,
              fontSize: 14,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save controls'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/merchant')}
            style={{
              background: '#fff',
              color: '#334155',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '12px 24px',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RiderControls;
