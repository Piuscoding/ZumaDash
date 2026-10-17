import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import MerchantNavbar from '../../components/MerchantNavbar';

const CORRIDORS = ['dutse', 'kubwa', 'bwari', 'ushafa'];

const Toggle = ({ on, onChange, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--gray-100)' }}>
    <span style={{ fontSize: 14 }}>{label}</span>
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        width: 52,
        height: 30,
        borderRadius: 16,
        border: 'none',
        background: on ? 'var(--primary)' : '#d1d5db',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 24 : 3,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.15s',
        }}
      />
    </button>
  </label>
);

const RiderControls = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rider, setRider] = useState(null);
  const [flags, setFlags] = useState({
    allowTakeJobs: true,
    suspended: false,
    blockWithdrawals: false,
    allowMerchantWithdraw: false,
  });
  const [blocks, setBlocks] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/merchant/riders');
        const list = res.data.riders || [];
        const r = list.find((x) => String(x._id) === String(id));
        if (!r) {
          setErr('Rider not found');
          return;
        }
        setRider(r);
        setFlags({
          allowTakeJobs: r.fleetFlags?.allowTakeJobs !== false,
          suspended: !!r.fleetFlags?.suspended,
          blockWithdrawals: !!r.fleetFlags?.blockWithdrawals,
          allowMerchantWithdraw: !!r.fleetFlags?.allowMerchantWithdraw,
        });
        setBlocks(
          CORRIDORS.map((c) => {
            const existing = (r.corridorJobBlocks || []).find((b) => b.corridor === c);
            return {
              corridor: c,
              blocked: existing ? !!existing.blocked : false,
              blockFromTime: existing?.blockFromTime || '',
            };
          })
        );
      } catch (e) {
        setErr(e.response?.data?.message || 'Failed to load');
      }
    })();
  }, [id]);

  const save = async () => {
    setMsg('');
    setErr('');
    try {
      await api.put(`/api/merchant/riders/${id}/controls`, {
        fleetFlags: flags,
        corridorJobBlocks: blocks.map((b) => ({
          corridor: b.corridor,
          blocked: b.blocked,
          blockFromTime: b.blockFromTime || null,
        })),
      });
      setMsg('Controls saved');
    } catch (e) {
      setErr(e.response?.data?.message || 'Save failed');
    }
  };

  if (err && !rider) {
    return (
      <div style={{ padding: 40 }}>
        <p style={{ color: 'var(--danger)' }}>{err}</p>
        <Link to="/merchant">Back</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <MerchantNavbar />
      <div className="container" style={{ maxWidth: 560, padding: '20px 16px' }}>
        <button type="button" className="btn btn-secondary" style={{ marginBottom: 12 }} onClick={() => navigate('/merchant')}>
          ← Fleet
        </button>
        <div className="card" style={{ padding: 16 }}>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>{rider?.name || 'Rider'}</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>{rider?.email} · {rider?.phone}</p>
          {msg && <p style={{ color: 'var(--success)' }}>{msg}</p>}
          {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}

          <h3 style={{ fontSize: 15, marginTop: 8 }}>Account controls</h3>
          <Toggle label="Allow take jobs" on={flags.allowTakeJobs} onChange={(v) => setFlags({ ...flags, allowTakeJobs: v })} />
          <Toggle label="Suspended" on={flags.suspended} onChange={(v) => setFlags({ ...flags, suspended: v })} />
          <Toggle label="Block withdrawals" on={flags.blockWithdrawals} onChange={(v) => setFlags({ ...flags, blockWithdrawals: v })} />
          <Toggle label="Allow merchant withdraw from rider" on={flags.allowMerchantWithdraw} onChange={(v) => setFlags({ ...flags, allowMerchantWithdraw: v })} />

          <h3 style={{ fontSize: 15, marginTop: 20 }}>Corridor job alerts</h3>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>
            When blocked, this rider will not receive job alerts from that corridor. Optional time: block only from that hour until midnight (e.g. 20:00).
          </p>
          {blocks.map((b, i) => (
            <div key={b.corridor} style={{ marginBottom: 12, padding: 12, background: 'var(--gray-50)', borderRadius: 10 }}>
              <Toggle
                label={`Block ${b.corridor.charAt(0).toUpperCase() + b.corridor.slice(1)} jobs`}
                on={b.blocked}
                onChange={(v) => {
                  const next = [...blocks];
                  next[i] = { ...next[i], blocked: v };
                  setBlocks(next);
                }}
              />
              {b.blocked && (
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 12 }}>Block from time (optional)</label>
                  <input
                    type="time"
                    value={b.blockFromTime || ''}
                    onChange={(e) => {
                      const next = [...blocks];
                      next[i] = { ...next[i], blockFromTime: e.target.value };
                      setBlocks(next);
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          <button type="button" className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} onClick={save}>
            Save controls
          </button>
        </div>
      </div>
    </div>
  );
};

export default RiderControls;
