import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RiderNavbar from '../../components/RiderNavbar';
import api from '../../services/api';

const JobHistory = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/jobs/my')
      .then((res) => setJobs(res.data.jobs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RiderNavbar />
      <div className="container" style={{ padding: '20px 16px', maxWidth: 640 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Loading...</p>
        ) : jobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--gray-500)' }}>No jobs yet</p>
            <Link to="/rider/jobs" className="btn btn-primary" style={{ marginTop: 12 }}>View available jobs</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(() => {
              const rows = [];
              const seen = new Set();
              for (const j of jobs) {
                const bid = j.bundleId ? String(j.bundleId) : null;
                if (bid) {
                  if (seen.has(bid)) continue;
                  seen.add(bid);
                  const legs = jobs.filter((x) => String(x.bundleId) === bid);
                  const agreed = legs.reduce(
                    (s, x) =>
                      s +
                      (Number(x.finalGroupedPrice) ||
                        Number(x.agreedPrice) ||
                        Number(x.suggestedPrice) ||
                        0),
                    0
                  );
                  let tripEarn =
                    Number(j.tripRiderEarning) ||
                    legs.reduce((sum, x) => sum + (Number(x.tripRiderEarning) || 0), 0) /
                      Math.max(1, legs.length) ||
                    legs.reduce((sum, x) => sum + (Number(x.riderEarning) || 0), 0);
                  if (!(tripEarn > 0) && agreed > 0) {
                    tripEarn = Math.round(agreed * 0.85);
                  }
                  rows.push({ key: bid, kind: 'grouped', j, legs, tripEarn, agreed });
                } else {
                  const soloAgreed = Number(j.agreedPrice) || Number(j.suggestedPrice) || 0;
                  let soloEarn = Number(j.riderEarning) || 0;
                  if (
                    !(soloEarn > 0) &&
                    soloAgreed > 0 &&
                    (j.status === 'completed' || j.status === 'pending_clearance')
                  ) {
                    const platform =
                      Number(j.platformTake) ||
                      Number(j.commissionAmount) ||
                      Math.round(soloAgreed * 0.15);
                    soloEarn = Math.max(0, soloAgreed - platform);
                  }
                  rows.push({
                    key: String(j._id),
                    kind: 'solo',
                    j,
                    tripEarn: soloEarn,
                    agreed: soloAgreed,
                  });
                }
              }
              return rows.map((row) => (
                <Link
                  key={row.key}
                  to={`/track/${row.j._id}`}
                  className="card"
                  style={{ padding: 14, display: 'block', color: 'inherit' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 14 }}>
                      {row.kind === 'grouped'
                        ? `Grouped · ${row.legs.length} jobs${row.j.tripCode ? ` · ${row.j.tripCode}` : ''}`
                        : row.j.jobId}
                    </strong>
                    <span className="badge badge-info">{String(row.j.status || '').replace('_', ' ')}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 6 }}>
                    {row.kind === 'grouped'
                      ? (row.legs || []).map((leg) => leg.jobId).join(' · ')
                      : `${(row.j.pickup?.description || '').slice(0, 40)} → ${(row.j.dropoff?.description || '').slice(0, 40)}`}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      ₦{(row.agreed || 0).toLocaleString()}
                      <span style={{ color: 'var(--primary)', marginLeft: 8 }}>
                        Earn ₦{(row.tripEarn || 0).toLocaleString()}
                      </span>
                    </span>
                    <span style={{ color: 'var(--gray-500)' }}>
                      {row.j.createdAt ? new Date(row.j.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </Link>
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobHistory;
