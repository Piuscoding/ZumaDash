import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import RoleNavbar from '../components/RoleNavbar';
import api from '../services/api';

const StarRow = ({ score }) => {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  const filled = Math.round(s / 20); // 0–5 stars
  return (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }} aria-label={`Trust ${s}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            fontSize: 28,
            color: i <= filled ? '#f5a623' : '#e5e7eb',
            lineHeight: 1,
            filter: i <= filled ? 'drop-shadow(0 1px 1px rgba(0,0,0,0.15))' : 'none',
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const RiderPublic = () => {
  const { id } = useParams();
  const [search] = useSearchParams();
  const jobId = search.get('jobId');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!jobId) {
        setError('Missing job context');
        setLoading(false);
        return;
      }
      try {
        const res = await api.get(`/api/users/riders/${id}/public?jobId=${jobId}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load rider');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, jobId]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;

  const r = data?.rider;
  const score = r?.trustScore ?? r?.rating ?? 0;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0f766e 0%, #0f766e 120px, #f3f4f6 120px)' }}>
      <RoleNavbar />
      <div className="container" style={{ padding: '24px 16px', maxWidth: 420 }}>
        <Link
          to={jobId ? `/track/${jobId}` : '/my-deliveries'}
          style={{ color: 'white', fontWeight: 600, fontSize: 14 }}
        >
          ← Back to job
        </Link>

        {error && (
          <div style={{ marginTop: 16, background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8 }}>{error}</div>
        )}

        {r && (
          <div
            style={{
              marginTop: 20,
              background: 'white',
              borderRadius: 20,
              boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
              padding: '28px 20px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 104,
                height: 104,
                borderRadius: '50%',
                overflow: 'hidden',
                margin: '0 auto 12px',
                background: '#e5e7eb',
                border: '4px solid white',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                fontWeight: 800,
                color: '#6b7280',
              }}
            >
              {r.profilePhoto ? (
                <img src={r.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (r.name || '?')[0].toUpperCase()
              )}
            </div>
            <h1 style={{ fontSize: 22, margin: '0 0 4px', fontWeight: 800 }}>{r.name}</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{r.type}</p>
            <StarRow score={score} />
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Trust score {score}/100</p>

            <div
              style={{
                marginTop: 20,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                textAlign: 'left',
              }}
            >
              <div style={{ background: '#f9fafb', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 }}>Mobile</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>
                  {r.phone}
                  {!r.phoneRevealed && (
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', marginTop: 2 }}>
                      Full number after accept
                    </div>
                  )}
                </div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 }}>Completed</div>
                <div style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>{r.completedJobs ?? 0}</div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 12, padding: 12, gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 }}>Joined</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>
                  {r.joinedAt ? new Date(r.joinedAt).toLocaleDateString() : '—'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderPublic;
