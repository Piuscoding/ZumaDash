import React, { useEffect, useMemo, useState } from 'react';
import RiderNavbar from '../../components/RiderNavbar';
import api from '../../services/api';
import { ensureLocationForMap } from '../../utils/geo';

const CORRIDORS = ['Dutse', 'Kubwa', 'Bwari', 'Ushafa'];

const textOf = (job) =>
  `${job?.pickup?.description || ''} ${job?.pickup?.zone || ''} ${job?.dropoff?.description || ''} ${job?.dropoff?.zone || ''}`.toLowerCase();

const corridorIn = (text, corridor) => {
  if (!corridor) return true;
  return String(text || '').toLowerCase().includes(String(corridor).toLowerCase());
};

const jobMatchesRoute = (job, fromC, toC) => {
  const pick = `${job?.pickup?.description || ''} ${job?.pickup?.zone || ''}`.toLowerCase();
  const drop = `${job?.dropoff?.description || ''} ${job?.dropoff?.zone || ''}`.toLowerCase();
  if (fromC && !toC) return corridorIn(textOf(job), fromC);
  if (!fromC && toC) return corridorIn(textOf(job), toC);
  return (!fromC || corridorIn(pick, fromC)) && (!toC || corridorIn(drop, toC));
};

const AvailableJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offerAmount, setOfferAmount] = useState({});
  const [offerNote, setOfferNote] = useState({});
  const [riderReoffer, setRiderReoffer] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [message, setMessage] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [fromCorridor, setFromCorridor] = useState('');
  const [toCorridor, setToCorridor] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/api/jobs/available');
      setJobs(Array.isArray(res.data.jobs) ? res.data.jobs : []);
      if (res.data.message && !(res.data.jobs || []).length) {
        setMessage(res.data.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const displayedJobs = useMemo(() => {
    const fromC = fromCorridor.trim();
    const toC = toCorridor.trim();
    const q = searchText.trim().toLowerCase();

    const scored = jobs.map((job, index) => {
      const routeMatch = jobMatchesRoute(job, fromC, toC);
      const textMatch = !q || textOf(job).includes(q);
      const score =
        (fromC || toC ? (routeMatch ? 2 : 0) : 1) + (q ? (textMatch ? 1 : 0) : 0);
      return { job, index, score, routeMatch, textMatch };
    });

    const active = !!(fromC || toC || q);
    const list = active
      ? scored
          .filter((s) => (fromC || toC ? s.routeMatch : true) && (q ? s.textMatch : true))
          .sort((a, b) => b.score - a.score || a.index - b.index)
      : scored.sort((a, b) => a.index - b.index);

    return list.map((s) => s.job);
  }, [jobs, fromCorridor, toCorridor, searchText]);

  const handleOffer = async (jobId, suggested) => {
    setSubmitting(jobId);
    setMessage('');
    try {
      const job = jobs.find((j) => j._id === jobId);
      let coords = null;
      if (job?.locationMode === 'map') {
        coords = await ensureLocationForMap('offering on map jobs');
      }
      const raw = offerAmount[jobId];
      const amount =
        raw !== undefined && raw !== null && String(raw).trim() !== ''
          ? Number(raw)
          : Number(suggested);
      const res = await api.post(`/api/jobs/${jobId}/offer`, {
        amount: Math.round(Number(amount) || 0),
        message: offerNote[jobId] || '',
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      });
      setMessage(res.data.message || 'Offer submitted');
      fetchJobs();
    } catch (err) {
      setMessage(err.response?.data?.message || err.message || 'Failed to submit offer');
    } finally {
      setSubmitting(null);
    }
  };


  const respondCounter = async (jobId, offerId, action) => {
    setSubmitting(jobId);
    setMessage('');
    try {
      const body = { offerId, action };
      if (action === 'counter') {
        body.amount = Number(riderReoffer[offerId]);
        if (!body.amount || body.amount <= 0) {
          setMessage('Enter a valid re-offer amount');
          setSubmitting(null);
          return;
        }
      }
      const res = await api.post(`/api/jobs/${jobId}/respond-counter`, body);
      setMessage(
        res.data.message ||
          (action === 'accept'
            ? 'Counter accepted'
            : action === 'decline'
              ? 'Declined'
              : 'New offer sent')
      );
      setRiderReoffer((d) => ({ ...d, [offerId]: '' }));
      await fetchJobs();
      // If assigned, optional soft note
      if (action === 'accept' && res.data.job?.status === 'accepted') {
        setMessage(res.data.message || 'Counter accepted. Job assigned.');
      }
    } catch (err) {
      setMessage(err.response?.data?.message || err.message || 'Failed');
    } finally {
      setSubmitting(null);
    }
  };

  const handleAccept = async (jobId) => {
    setSubmitting(jobId);
    setMessage('');
    try {
      const job = jobs.find((j) => j._id === jobId);
      let coords = null;
      if (job?.locationMode === 'map') {
        coords = await ensureLocationForMap('accepting map jobs');
      }
      const body = coords ? { lat: coords.lat, lng: coords.lng } : {};
      const res = await api.post(`/api/jobs/${jobId}/accept-price`, body);
      setMessage(res.data.message || 'Job accepted!');
      fetchJobs();
    } catch (err) {
      setMessage(err.response?.data?.message || err.message || 'Failed to accept job');
    } finally {
      setSubmitting(null);
    }
  };

  const openDetail = async (jobId) => {
    setDetailId(jobId);
    try {
      const job = jobs.find((j) => j._id === jobId);
      if (job?.locationMode === 'map') {
        await ensureLocationForMap('viewing map jobs');
      }
      const res = await api.get(`/api/jobs/${jobId}`);
      setDetail(res.data.job || res.data);
    } catch (err) {
      setDetail({ error: err.response?.data?.message || err.message || 'Could not load details' });
    }
  };

  const clearFilters = () => {
    setFromCorridor('');
    setToCorridor('');
    setSearchText('');
  };

  const filterActive = !!(fromCorridor || toCorridor || searchText);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RiderNavbar />

      <div className="container" style={{ padding: '24px 16px', maxWidth: 700 }}>
        {message && (
          <div
            style={{
              background:
                message.toLowerCase().includes('success') || message.toLowerCase().includes('accepted')
                  ? '#dcfce7'
                  : '#fee2e2',
              color:
                message.toLowerCase().includes('success') || message.toLowerCase().includes('accepted')
                  ? '#166534'
                  : '#991b1b',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: filterOpen || filterActive ? '#dbeafe' : undefined,
            }}
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
          >
            <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>
              ☰
            </span>
            <span>Filter job</span>
            {filterActive && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: '#1d4ed8',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '1px 7px',
                }}
              >
                On
              </span>
            )}
          </button>
        </div>

        {filterOpen && (
          <div className="card" style={{ padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Search by corridor</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: 8,
                alignItems: 'end',
                marginBottom: 10,
              }}
            >
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>
                  From (pickup)
                </label>
                <select
                  value={fromCorridor}
                  onChange={(e) => setFromCorridor(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                >
                  <option value="">Any</option>
                  {CORRIDORS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ paddingBottom: 8, fontWeight: 700, color: 'var(--gray-500)' }}>→</div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>
                  To (drop-off)
                </label>
                <select
                  value={toCorridor}
                  onChange={(e) => setToCorridor(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                >
                  <option value="">Any</option>
                  {CORRIDORS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>
                Or type an area / address keyword
              </label>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="e.g. Bwari market, Kubwa…"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {CORRIDORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    background:
                      fromCorridor === c || toCorridor === c || searchText.toLowerCase().includes(c.toLowerCase())
                        ? '#dbeafe'
                        : undefined,
                  }}
                  onClick={() => {
                    if (!fromCorridor) setFromCorridor(c);
                    else if (!toCorridor) setToCorridor(c);
                    else {
                      setFromCorridor(c);
                      setToCorridor('');
                    }
                  }}
                >
                  {c}
                </button>
              ))}
              {filterActive && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={clearFilters}
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && (
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
            Showing <strong>{displayedJobs.length}</strong>
            {jobs.length !== displayedJobs.length ? ` of ${jobs.length}` : ''} open job
            {displayedJobs.length === 1 ? '' : 's'}
          </p>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Loading available jobs...</p>
        ) : displayedJobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--gray-500)' }}>
              {jobs.length === 0
                ? 'No open jobs at the moment. Check back soon.'
                : 'No jobs match this corridor filter. Clear the filter to see all jobs.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {displayedJobs.map((job) => (
              <div key={job._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  {job.locationMode === 'map' && (
                    <span className="badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                      Map job · location required
                    </span>
                  )}
                  <span className="badge badge-warning">{job.packageSize || 'Package'}</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => openDetail(job._id)}
                  >
                    View details
                  </button>
                </div>
                <p style={{ fontSize: 14, marginBottom: 4 }}>
                  <strong>Pickup:</strong> {job.pickup?.description}
                </p>
                <p style={{ fontSize: 14, marginBottom: 8 }}>
                  <strong>Drop-off:</strong> {job.dropoff?.description}
                </p>
                {job.packageDescription && (
                  <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 8 }}>
                    {job.packageDescription}
                  </p>
                )}
                <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--primary)' }}>
                  Suggested: ₦{(job.suggestedPrice || 0).toLocaleString()}
                </p>
                {(job.bookingVoiceNote || job.bookingVideo || (job.pickup?.photos || []).length > 0) && (
                  <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>
                    Has media
                    {job.bookingVoiceNote ? ' · voice' : ''}
                    {job.bookingVideo ? ' · video' : ''}
                    {(job.pickup?.photos || []).length ? ` · ${job.pickup.photos.length} photo(s)` : ''}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAccept(job._id)}
                    disabled={submitting === job._id}
                    style={{ flex: 1, minWidth: 120 }}
                  >
                    {submitting === job._id ? '…' : 'Accept job'}
                  </button>
                </div>

                {(job.offers || []).length > 0 && (
                  <div
                    style={{
                      borderTop: '1px solid var(--gray-200)',
                      paddingTop: 10,
                      marginBottom: 10,
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>Bargaining history</strong>
                    {(job.offers || []).map((o) => (
                      <div
                        key={o._id || `${o.amount}-${o.status}`}
                        style={{
                          fontSize: 13,
                          marginTop: 8,
                          padding: 10,
                          background: 'var(--gray-50)',
                          borderRadius: 8,
                        }}
                      >
                        <div>
                          Your offer: <strong>₦{(o.amount || 0).toLocaleString()}</strong>
                          {' · '}
                          <span className="badge badge-info" style={{ marginLeft: 4 }}>
                            {String(o.status || '').replace(/_/g, ' ')}
                          </span>
                        </div>
                        {o.message ? (
                          <div style={{ color: 'var(--gray-500)', marginTop: 4 }}>{o.message}</div>
                        ) : null}
                        {(o.history || []).length > 0 && (
                          <div style={{ marginTop: 8, fontSize: 12 }}>
                            {(o.history || []).map((h, hi) => (
                              <div key={hi} style={{ marginTop: 3 }}>
                                {h.by === 'customer' ? 'Customer' : 'You'}: ₦
                                {(h.amount || 0).toLocaleString()}
                                {h.message ? ` — ${h.message}` : ''}
                                {h.at ? ` · ${new Date(h.at).toLocaleString()}` : ''}
                              </div>
                            ))}
                          </div>
                        )}
                        {o.status === 'countered' && (
                          <div style={{ marginTop: 10 }}>
                            <p style={{ fontSize: 13, marginBottom: 8 }}>
                              Customer counter:{' '}
                              <strong>₦{(o.counterAmount || 0).toLocaleString()}</strong>
                              {o.counterMessage ? ` — ${o.counterMessage}` : ''}
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '8px 12px', fontSize: 12 }}
                                disabled={submitting === job._id}
                                onClick={() => respondCounter(job._id, o._id, 'accept')}
                              >
                                Accept counter
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '8px 12px', fontSize: 12 }}
                                disabled={submitting === job._id}
                                onClick={() => respondCounter(job._id, o._id, 'decline')}
                              >
                                Decline
                              </button>
                              <input
                                type="number"
                                placeholder="Re-offer ₦"
                                value={riderReoffer[o._id] || ''}
                                onChange={(e) =>
                                  setRiderReoffer((d) => ({ ...d, [o._id]: e.target.value }))
                                }
                                style={{
                                  width: 100,
                                  padding: 8,
                                  borderRadius: 8,
                                  border: '1px solid var(--gray-200)',
                                }}
                              />
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '8px 12px', fontSize: 12 }}
                                disabled={submitting === job._id}
                                onClick={() => respondCounter(job._id, o._id, 'counter')}
                              >
                                Counter again
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(() => {
                  const myOffers = job.offers || [];
                  const hasPending = myOffers.some((o) => String(o.status) === 'pending');
                  const hasCountered = myOffers.some((o) => String(o.status) === 'countered');
                  // Lock new top-level offers while awaiting customer (pending) or while handling a counter on card
                  const offerLocked = hasPending || hasCountered;
                  return (
                    <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 10 }}>
                      <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>
                        {hasCountered
                          ? 'Respond to the customer counter above (accept, decline, or counter again)'
                          : hasPending
                            ? 'Waiting for customer response — offer fields locked'
                            : 'Or make a counter offer'}
                      </p>
                      <input
                        type="number"
                        placeholder="Your offer (₦)"
                        value={offerAmount[job._id] ?? job.suggestedPrice}
                        disabled={offerLocked || submitting === job._id}
                        onChange={(e) => setOfferAmount({ ...offerAmount, [job._id]: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1.5px solid var(--gray-200)',
                          marginBottom: 8,
                          background: offerLocked ? '#f1f5f9' : undefined,
                          opacity: offerLocked ? 0.7 : 1,
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Short note (optional)"
                        value={offerNote[job._id] || ''}
                        disabled={offerLocked || submitting === job._id}
                        onChange={(e) => setOfferNote({ ...offerNote, [job._id]: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1.5px solid var(--gray-200)',
                          marginBottom: 8,
                          background: offerLocked ? '#f1f5f9' : undefined,
                          opacity: offerLocked ? 0.7 : 1,
                        }}
                      />
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          if (offerLocked) return;
                          handleOffer(job._id, job.suggestedPrice);
                        }}
                        disabled={offerLocked || submitting === job._id}
                        style={{
                          width: '100%',
                          opacity: offerLocked ? 0.65 : 1,
                          cursor: offerLocked ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {submitting === job._id
                          ? '...'
                          : offerLocked
                            ? hasCountered
                              ? 'Use buttons above for this counter'
                              : 'Offer pending customer response'
                            : 'Make offer'}
                      </button>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}

        {detailId && (
          <div
            role="dialog"
            onClick={() => {
              setDetailId(null);
              setDetail(null);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              className="card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 420, width: '100%', maxHeight: '85vh', overflow: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Package details</h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => {
                    setDetailId(null);
                    setDetail(null);
                  }}
                >
                  Close
                </button>
              </div>
              {!detail && <p style={{ color: 'var(--gray-500)' }}>Loading…</p>}
              {detail?.error && <p style={{ color: 'var(--danger)' }}>{detail.error}</p>}
              {detail && !detail.error && (
                <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                  <div>
                    <strong>Size:</strong> {detail.packageSize || '—'}
                  </div>
                  <div>
                    <strong>Description:</strong> {detail.packageDescription || '—'}
                  </div>
                  <div>
                    <strong>Suggested:</strong> ₦{(detail.suggestedPrice || 0).toLocaleString()}
                  </div>
                  <div>
                    <strong>Payment:</strong>{' '}
                    {detail.paymentMethod === 'bank_transfer' ? 'Bank transfer' : 'Cash on delivery'}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <strong>Pickup:</strong> {detail.pickup?.description}
                  </div>
                  <div>
                    <strong>Drop-off:</strong> {detail.dropoff?.description}
                  </div>
                  {(detail.pickup?.photos || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {detail.pickup.photos.map((u) => (
                        <img
                          key={u}
                          src={u}
                          alt=""
                          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                        />
                      ))}
                    </div>
                  )}
                  {(detail.dropoff?.photos || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {detail.dropoff.photos.map((u) => (
                        <img
                          key={u}
                          src={u}
                          alt=""
                          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                        />
                      ))}
                    </div>
                  )}
                  {detail.bookingVoiceNote && (
                    <audio controls src={detail.bookingVoiceNote} style={{ width: '100%', marginTop: 10 }} />
                  )}
                  {detail.bookingVideo && (
                    <video
                      controls
                      src={detail.bookingVideo}
                      style={{ width: '100%', marginTop: 10, borderRadius: 8 }}
                    />
                  )}
                  {(detail.offers || []).length > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--gray-200)' }}>
                      <strong style={{ fontSize: 13 }}>Your negotiation history</strong>
                      {(detail.offers || []).map((o) => (
                        <div
                          key={o._id || String(o.amount)}
                          style={{
                            fontSize: 13,
                            marginTop: 8,
                            padding: 10,
                            background: 'var(--gray-50)',
                            borderRadius: 8,
                          }}
                        >
                          <div>
                            Your offer: <strong>₦{(o.amount || 0).toLocaleString()}</strong> ·{' '}
                            {String(o.status || '').replace(/_/g, ' ')}
                          </div>
                          {o.counterAmount != null && Number(o.counterAmount) > 0 && (
                            <div style={{ marginTop: 4, color: '#b45309' }}>
                              Customer counter: <strong>₦{Number(o.counterAmount).toLocaleString()}</strong>
                              {o.counterMessage ? ` — ${o.counterMessage}` : ''}
                            </div>
                          )}
                          {o.message && (
                            <div style={{ color: 'var(--gray-500)', marginTop: 4 }}>{o.message}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 12 }}>
                    Tracking ID and delivery status unlock after you accept the job.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableJobs;
