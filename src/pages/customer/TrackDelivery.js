import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RoleNavbar from '../../components/RoleNavbar';
import api from '../../services/api';
import DeliveryMap from '../../components/map/DeliveryMap';
import { joinJobRoom, leaveJobRoom } from '../../services/socket';
import { uploadImage } from '../../services/upload';

const statusSteps = [
  'pending_payment_approval',
  'pending_offers',
  'accepted',
  'live',
  'picked',
  'pending_clearance',
  'completed',
];

const TrackDelivery = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [liveLoc, setLiveLoc] = useState(null);
  const [liveMeta, setLiveMeta] = useState(null); // remaining km/eta from stream
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapMeta, setMapMeta] = useState({ tileUrl: '', riderMarkerUrl: '' }); // { type: 'image'|'video', url }
  const [counterDraft, setCounterDraft] = useState({}); // offerId -> amount
  const [riderReoffer, setRiderReoffer] = useState({}); // offerId -> amount

  const fetchJob = async () => {
    try {
      const res = await api.get(`/api/jobs/${id}`);
      setJob(res.data.job);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load job');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    api.get('/api/map/config')
      .then((res) => {
        setMapMeta({
          tileUrl: res.data.mapTileUrl || '',
          riderMarkerUrl: res.data.riderMarkerUrl || '',
        });
      })
      .catch(() => {});
  }, []);

  // Subscribe to live rider position (customer, rider, admin, merchant)
  useEffect(() => {
    if (!job) return undefined;
    const hasCoords = job.pickup?.coordinates?.lat && job.dropoff?.coordinates?.lat;
    if (job.locationMode !== 'map' && !hasCoords) return undefined;
    // Stream while on the way; stop after delivered / clearance / done / cancelled
    if (!['accepted', 'live', 'picked'].includes(job.status)) {
      return undefined;
    }
    const jobId = job.jobId;
    if (job.riderLastLocation?.lat != null) {
      setLiveLoc({
        lat: job.riderLastLocation.lat,
        lng: job.riderLastLocation.lng,
        updatedAt: job.riderLastLocation.updatedAt,
      });
    }
    const s = joinJobRoom(jobId);
    const onLoc = (payload) => {
      if (payload?.jobId && payload.jobId !== jobId) return;
      if (payload?.lat == null) return;
      setLiveLoc({ lat: payload.lat, lng: payload.lng, updatedAt: payload.updatedAt });
      setLiveMeta({
        remainingKm: payload.remainingKm ?? payload.remainingKmApprox,
        displayRemainingSec: payload.displayRemainingSec,
        remainingSec: payload.remainingSec,
        leg: payload.leg,
      });
    };
    s.on('rider_location', onLoc);
    return () => {
      s.off('rider_location', onLoc);
      leaveJobRoom(jobId);
    };
  }, [job?.jobId, job?.locationMode, job?.status, job?.pickup?.coordinates?.lat]);

  // Rider device: push GPS every 4s until delivered
  useEffect(() => {
    if (!job || !user) return undefined;
    const riderId = job.rider?._id || job.rider;
    const iAmRider = user.role === 'rider' && String(riderId) === String(user.id || user._id);
    if (!iAmRider) return undefined;
    const hasCoords = job.pickup?.coordinates?.lat && job.dropoff?.coordinates?.lat;
    if (job.locationMode !== 'map' && !hasCoords) return undefined;
    if (!['accepted', 'live', 'picked'].includes(job.status)) return undefined;
    if (!navigator.geolocation) {
      console.warn('Geolocation not available');
      return undefined;
    }
    const push = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await api.post(`/api/jobs/${job._id}/location`, {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          } catch (e) {
            console.warn('location push failed', e?.response?.data || e.message);
          }
        },
        (err) => console.warn('geolocation error', err.message),
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    };
    push();
    const id = setInterval(push, 4000);
    return () => clearInterval(id);
  }, [job?._id, job?.status, job?.locationMode, job?.rider, user]);


  const onProofSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const updateStatus = async (status) => {
    setActionLoading(true);
    setMessage('');
    try {
      let photoUrl = null;
      if (['live', 'picked', 'delivered', 'pending_clearance'].includes(status)) {
        if (!proofFile) {
          setMessage('Please attach a proof photo before updating status.');
          setActionLoading(false);
          return;
        }
        photoUrl = await uploadImage(proofFile, `zumadash/proof/${status}`);
      }
      await api.put(`/api/jobs/${id}/status`, { status, photo: photoUrl });
      setMessage(`Status updated to ${status}`);
      setProofFile(null);
      setProofPreview(null);
      fetchJob();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const acceptOffer = async (offerId) => {
    setActionLoading(true);
    try {
      await api.post(`/api/jobs/${id}/accept-offer`, { offerId });
      setMessage('Offer accepted! Rider assigned.');
      fetchJob();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to accept offer');
    } finally {
      setActionLoading(false);
    }
  };

  const sendCounter = async (offerId) => {
    const amount = Number(counterDraft[offerId]);
    if (!amount) {
      setMessage('Enter a counter amount');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/api/jobs/${id}/counter-offer`, { offerId, amount });
      setMessage('Counter-offer sent');
      setCounterDraft((d) => ({ ...d, [offerId]: '' }));
      fetchJob();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Counter failed');
    } finally {
      setActionLoading(false);
    }
  };

  const respondCounter = async (offerId, action) => {
    setActionLoading(true);
    try {
      const body = { offerId, action };
      if (action === 'counter') {
        body.amount = Number(riderReoffer[offerId]);
        if (!body.amount) {
          setMessage('Enter a new offer amount');
          setActionLoading(false);
          return;
        }
      }
      await api.post(`/api/jobs/${id}/respond-counter`, body);
      setMessage(action === 'accept' ? 'Counter accepted' : action === 'decline' ? 'Declined' : 'New offer sent');
      fetchJob();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;
  if (!job) return null;

  const currentIdx = statusSteps.indexOf(job.status);
  const riderId = job.rider?._id || job.rider;
  const isRider = user?.role === 'rider' && String(riderId) === String(user?.id || user?._id);
  const isCustomer = user?.role === 'customer';
  const isAdmin = user?.role === 'admin';

  const openMedia = (url, type = 'image') => {
    if (!url) return;
    setLightbox({ url, type });
  };

  const collectMedia = () => {
    const items = [];
    (job.pickup?.photos || []).forEach((u) => items.push({ url: u, type: 'image', label: 'Pickup' }));
    (job.dropoff?.photos || []).forEach((u) => items.push({ url: u, type: 'image', label: 'Drop-off' }));
    if (job.bookingVideo) items.push({ url: job.bookingVideo, type: 'video', label: 'Booking video' });
    if (job.proofPhotos?.live) items.push({ url: job.proofPhotos.live, type: 'image', label: 'LIVE proof' });
    if (job.proofPhotos?.picked) items.push({ url: job.proofPhotos.picked, type: 'image', label: 'PICKED proof' });
    if (job.proofPhotos?.delivered) items.push({ url: job.proofPhotos.delivered, type: 'image', label: 'Delivered proof' });
    return items;
  };

  const voiceUrl = job.bookingVoiceNote || job.pickup?.voiceNote || job.dropoff?.voiceNote;

  const avatar = (person) => {
    if (person?.profilePhoto) {
      return (
        <img
          src={person.profilePhoto}
          alt=""
          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
        />
      );
    }
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--gray-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 14,
          color: 'var(--gray-500)',
        }}
      >
        {(person?.name || 'R')[0].toUpperCase()}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <RoleNavbar />
      <div className="container" style={{ padding: '24px 16px', maxWidth: 640 }}>
        <Link to={isRider ? '/rider' : isAdmin ? '/admin' : user?.role === 'merchant' ? '/merchant' : '/my-deliveries'} style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}>
          ← Back
        </Link>

        {message && (
          <div style={{ background: '#e0f2fe', color: '#075985', padding: 12, borderRadius: 8, margin: '12px 0', fontSize: 14 }}>
            {message}
          </div>
        )}

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h1 style={{ fontSize: 18, margin: 0 }}>{job.jobId}</h1>
            <span className="badge badge-info">{String(job.status).replace(/_/g, ' ')}</span>
          </div>

          {/* PART 1 – Map track (map mode only) */}
          {((job.locationMode === 'map') || (job.pickup?.coordinates?.lat && job.dropoff?.coordinates?.lat)) && (
            <div style={{ marginTop: 16, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Live map
                  {job.mapDistanceKm != null ? ` · route ${job.mapDistanceKm} km` : ''}
                  {liveMeta?.remainingKm != null
                    ? ` · remaining ~${liveMeta.remainingKm} km`
                    : job.displayDurationSec != null
                      ? ` · ~${Math.round(job.displayDurationSec / 60)} min`
                      : ''}
                  {liveMeta?.displayRemainingSec != null
                    ? ` · ~${Math.max(1, Math.round(liveMeta.displayRemainingSec / 60))} min left`
                    : ''}
                  {liveMeta?.leg === 'to_pickup' ? ' (to pickup)' : liveMeta?.leg === 'to_dropoff' ? ' (to drop-off)' : ''}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => setMapFullscreen(true)}
                >
                  Fullscreen
                </button>
              </div>
              <DeliveryMap
                pickup={job.pickup?.coordinates}
                dropoff={job.dropoff?.coordinates}
                routeGeometry={job.routeGeometry}
                riderLocation={liveLoc || job.riderLastLocation}
                riderMarkerUrl={mapMeta.riderMarkerUrl}
                tileUrl={mapMeta.tileUrl}
                height={260}
              />
            </div>
          )}
          {job.locationMode !== 'map' && !(job.pickup?.coordinates?.lat && job.dropoff?.coordinates?.lat) && (
            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 12 }}>
              Map not available for this delivery (text / landmark mode). Tracking uses status, photos and WhatsApp.
            </p>
          )}


          {/* Status progress — labeled circles with check marks */}
          <div style={{ marginTop: 20, overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: statusSteps.length * 72 }}>
              {statusSteps.map((s, i) => {
                const done = currentIdx > i;
                const active = currentIdx === i;
                const labels = {
                  pending_payment_approval: 'Payment',
                  pending_offers: 'Offers',
                  accepted: 'Accepted',
                  live: 'Live',
                  picked: 'Picked',
                  pending_clearance: 'Delivered',
                  completed: 'Done',
                };
                const label = labels[s] || String(s).replace(/_/g, ' ');
                return (
                  <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', minWidth: 64 }}>
                    {i < statusSteps.length - 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 14,
                          left: '50%',
                          width: '100%',
                          height: 3,
                          background: currentIdx > i ? 'var(--primary)' : 'var(--gray-200)',
                          zIndex: 0,
                        }}
                      />
                    )}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: done || active ? 'var(--primary)' : '#fff',
                        border: `2px solid ${done || active ? 'var(--primary)' : 'var(--gray-300)'}`,
                        color: done || active ? '#fff' : 'var(--gray-400)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: done ? 14 : 11,
                        fontWeight: 700,
                        zIndex: 1,
                        boxShadow: active ? '0 0 0 4px rgba(15, 118, 110, 0.2)' : 'none',
                      }}
                      title={String(s).replace(/_/g, ' ')}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 10,
                        fontWeight: active ? 700 : 500,
                        color: done || active ? 'var(--primary)' : 'var(--gray-500)',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        maxWidth: 72,
                      }}
                    >
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 16, fontSize: 14 }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Pickup:</strong> {job.pickup?.description}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Drop-off:</strong> {job.dropoff?.description}
            </div>
            <div>
              <strong>Price:</strong> ₦{(job.agreedPrice || job.suggestedPrice || 0).toLocaleString()}
              {job.paymentMethod === 'bank_transfer' ? ' · Bank transfer' : ' · COD'}
            </div>
            {job.rider && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                {avatar(job.rider)}
                <span>
                  Rider:{' '}
                  <Link to={`/riders/${job.rider._id || job.rider}?jobId=${job._id}`} style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    {job.rider.name}
                  </Link>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* NOW-13 / NOW-18 media */}
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Media</h3>
          {voiceUrl && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>Voice note</div>
              <audio controls src={voiceUrl} style={{ width: '100%' }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {collectMedia().map((m, i) =>
              m.type === 'video' ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => openMedia(m.url, 'video')}
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 8,
                    border: '1px solid var(--gray-200)',
                    background: '#111',
                    color: '#fff',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  ▶ Video
                </button>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => openMedia(m.url, 'image')}
                  style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  <img
                    src={m.url}
                    alt={m.label}
                    style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--gray-200)' }}
                  />
                </button>
              )
            )}
            {collectMedia().length === 0 && !voiceUrl && (
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No media yet</p>
            )}
          </div>
        </div>

        {/* NOW-15 customer offers */}
        {isCustomer && job.status === 'pending_offers' && (
          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Rider offers</h3>
            {(job.offers || []).filter((o) => ['pending', 'countered'].includes(o.status)).length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Waiting for rider offers…</p>
            )}
            {(job.offers || [])
              .filter((o) => ['pending', 'countered'].includes(o.status))
              .map((offer) => (
                <div key={offer._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                    {avatar(offer.rider)}
                    <div>
                      <strong>{offer.rider?.name || 'Rider'}</strong>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                        Trust {offer.rider?.trustScore ?? '—'}
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontWeight: 800, color: 'var(--primary)' }}>
                      ₦{(offer.status === 'countered' ? offer.counterAmount || offer.amount : offer.amount)?.toLocaleString()}
                    </div>
                  </div>
                  {offer.message && <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>{offer.message}</p>}
                  {offer.status === 'countered' && (
                    <p style={{ fontSize: 12, color: '#b45309' }}>
                      Your counter ₦{(offer.counterAmount || 0).toLocaleString()} — waiting on rider
                    </p>
                  )}
                  {offer.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '8px 14px', fontSize: 13 }}
                        onClick={() => acceptOffer(offer._id)}
                        disabled={actionLoading}
                      >
                        Accept
                      </button>
                      <input
                        type="number"
                        placeholder="Counter ₦"
                        value={counterDraft[offer._id] || ''}
                        onChange={(e) => setCounterDraft((d) => ({ ...d, [offer._id]: e.target.value }))}
                        style={{ width: 110, padding: 8, borderRadius: 8, border: '1px solid var(--gray-200)' }}
                      />
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '8px 14px', fontSize: 13 }}
                        onClick={() => sendCounter(offer._id)}
                        disabled={actionLoading}
                      >
                        Counter
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* NOW-15 rider: respond to counter on this job */}
        {user?.role === 'rider' && job.status === 'pending_offers' && (
          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Your offers on this job</h3>
            {(job.offers || [])
              .filter((o) => String(o.rider?._id || o.rider) === String(user?._id || user?.id))
              .map((offer) => (
                <div key={offer._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ fontSize: 14 }}>
                    Your offer: <strong>₦{(offer.amount || 0).toLocaleString()}</strong>
                    <span className="badge badge-info" style={{ marginLeft: 8 }}>{offer.status}</span>
                  </div>
                  {offer.status === 'countered' && (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ fontSize: 13 }}>
                        Customer counter: <strong>₦{(offer.counterAmount || 0).toLocaleString()}</strong>
                        {offer.counterMessage ? ` — ${offer.counterMessage}` : ''}
                      </p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 12 }} disabled={actionLoading} onClick={() => respondCounter(offer._id, 'accept')}>
                          Accept counter
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} disabled={actionLoading} onClick={() => respondCounter(offer._id, 'decline')}>
                          Decline
                        </button>
                        <input
                          type="number"
                          placeholder="Re-offer ₦"
                          value={riderReoffer[offer._id] || ''}
                          onChange={(e) => setRiderReoffer((d) => ({ ...d, [offer._id]: e.target.value }))}
                          style={{ width: 100, padding: 8, borderRadius: 8, border: '1px solid var(--gray-200)' }}
                        />
                        <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} disabled={actionLoading} onClick={() => respondCounter(offer._id, 'counter')}>
                          Counter again
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Rider status updates */}
        {isRider && ['accepted', 'live', 'picked'].includes(job.status) && (
          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Update status</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Proof photo (required)</label>
              <input type="file" accept="image/*" onChange={onProofSelect} style={{ display: 'block', marginTop: 6 }} />
              {proofPreview && (
                <img src={proofPreview} alt="preview" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {job.status === 'accepted' && (
                <button className="btn btn-primary" onClick={() => updateStatus('live')} disabled={actionLoading}>
                  {actionLoading ? '…' : 'Start (LIVE)'}
                </button>
              )}
              {job.status === 'live' && (
                <button className="btn btn-primary" onClick={() => updateStatus('picked')} disabled={actionLoading}>
                  {actionLoading ? '…' : 'Mark PICKED'}
                </button>
              )}
              {job.status === 'picked' && (
                <button className="btn btn-primary" onClick={() => updateStatus('pending_clearance')} disabled={actionLoading}>
                  {actionLoading ? '…' : 'Mark DELIVERED'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* NOW-18 lightbox */}
      
      {mapFullscreen && job?.locationMode === 'map' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#000' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ position: 'absolute', top: 12, right: 12, zIndex: 10001 }}
            onClick={() => setMapFullscreen(false)}
          >
            Close map
          </button>
          <DeliveryMap
            pickup={job.pickup?.coordinates}
            dropoff={job.dropoff?.coordinates}
            routeGeometry={job.routeGeometry}
            riderLocation={liveLoc || job.riderLastLocation}
            riderMarkerUrl={mapMeta.riderMarkerUrl}
            tileUrl={mapMeta.tileUrl}
            height="100vh"
          />
        </div>
      )}

      {lightbox && (
        <div
          role="dialog"
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 14px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95vw', maxHeight: '90vh' }}>
            {lightbox.type === 'video' ? (
              <video src={lightbox.url} controls autoPlay style={{ maxWidth: '95vw', maxHeight: '85vh', borderRadius: 8 }} />
            ) : (
              <img src={lightbox.url} alt="" style={{ maxWidth: '95vw', maxHeight: '85vh', borderRadius: 8, objectFit: 'contain' }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackDelivery;
