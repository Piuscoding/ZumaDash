import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import RoleNavbar from '../../components/RoleNavbar';
import api from '../../services/api';
import { ensureLocationForMap } from '../../utils/geo';
import DeliveryMap from '../../components/map/DeliveryMap';
import JobMediaGallery from '../../components/JobMediaGallery';
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
  const { t } = useI18n();
  const formatStatus = (s) => {
    if (!s) return '';
    const key = `status.${s}`;
    const translated = t(key);
    return translated === key ? String(s).replace(/_/g, ' ') : translated;
  };
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [activeLegGeometry, setActiveLegGeometry] = useState(null); // Step 8 leg A
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapMeta, setMapMeta] = useState({ tileUrl: '', riderMarkerUrl: '' }); // { type: 'image'|'video', url }
  const [counterDraft, setCounterDraft] = useState({}); // offerId -> amount
  const [riderReoffer, setRiderReoffer] = useState({}); // offerId -> amount
  const [remainingRef, setRemainingRef] = useState('');
  const [remainingBusy, setRemainingBusy] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  const [bankDetails, setBankDetails] = useState({ bankName: '', accountName: '', accountNumber: '' });


  const fetchJob = async () => {
    try {
      const res = await api.get(`/api/jobs/${id}`);
      setJob(res.data.job);
      setError('');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Could not load job';
      if (status === 403) {
        setError(
          msg === 'Not authorized'
            ? 'You no longer have access to this delivery (it may have been declined or reassigned).'
            : msg
        );
      } else {
        setError(msg);
      }
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api.get('/api/settings').then((r) => {
      const bd = r.data.settings?.bankDetails || r.data.bankDetails;
      if (bd) setBankDetails({
        bankName: bd.bankName || '',
        accountName: bd.accountName || '',
        accountNumber: bd.accountNumber || '',
      });
    }).catch(() => {});
  }, []);

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
    // Stream rider marker/route from LIVE until delivered (picked still in progress)
    if (!['live', 'picked'].includes(job.status)) {
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
    if (job.activeLegGeometry) {
      setActiveLegGeometry(job.activeLegGeometry);
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
      if (payload.activeLegGeometry) {
        setActiveLegGeometry(payload.activeLegGeometry);
      }
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
    if (!['live', 'picked'].includes(job.status)) return undefined;
    if (!navigator.geolocation) {
      console.warn('Geolocation not available');
      setMessage((m) => m || 'Enable location to share your position on the map.');
      return undefined;
    }
    let watchId = null;
    const pushCoords = async (lat, lng) => {
      try {
        await api.post(`/api/jobs/${job._id}/location`, { lat, lng });
      } catch (e) {
        console.warn('location push failed', e?.response?.data || e.message);
      }
    };
    // Continuous watch for smoother marker movement + 4s backup interval
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        pushCoords(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => console.warn('geolocation error', err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
    const id = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => pushCoords(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    }, 4000);
    return () => {
      clearInterval(id);
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
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
      // Map jobs: must have GPS on before LIVE (and keep sharing while live/picked)
      if (
        status === 'live' &&
        (job.locationMode === 'map' || (job.pickup?.coordinates?.lat && job.dropoff?.coordinates?.lat))
      ) {
        try {
          await ensureLocationForMap('going LIVE on a map job');
        } catch (geoErr) {
          setMessage(geoErr.message || 'Enable device location to go LIVE on map jobs.');
          setActionLoading(false);
          return;
        }
      }
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
  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
        <RoleNavbar />
        <div style={{ padding: 40, textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
          <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</p>
          <Link
            to={user?.role === 'rider' ? '/rider' : user?.role === 'admin' || user?.role === 'manager' ? '/admin' : '/my-deliveries'}
            style={{ color: 'var(--primary)', fontWeight: 700 }}
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }
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


  const remainingBal = Number(job.remainingBalance) || 0;
  const hasRemaining = remainingBal > 0 && job.status === 'pending_payment_approval';
  const deadlineMs = job.remainingPaymentDeadline ? new Date(job.remainingPaymentDeadline).getTime() : 0;
  const secsLeft = deadlineMs ? Math.max(0, Math.floor((deadlineMs - nowTs) / 1000)) : 0;
  const mm = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const ss = String(secsLeft % 60).padStart(2, '0');
  const canDecline = hasRemaining && secsLeft === 0 && user?.role === 'rider';
  const isCustomerUser = user && job.customer && String(job.customer._id || job.customer) === String(user._id || user.id);

  const submitRemaining = async () => {
    setRemainingBusy(true);
    setMessage('');
    try {
      const res = await api.post(`/api/jobs/${job._id}/submit-remaining-payment`, {
        paymentReference: remainingRef,
      });
      setJob(res.data.job);
      setMessage('Remaining payment submitted — waiting for admin approval.');
    } catch (e) {
      setMessage(e.response?.data?.message || 'Could not submit remaining payment');
    } finally {
      setRemainingBusy(false);
    }
  };

  const declineRemaining = async () => {
    setRemainingBusy(true);
    try {
      const res = await api.post(`/api/jobs/${job._id}/decline-remaining`);
      const msg = res.data?.message || 'You declined this job. You may accept another delivery.';
      // Rider is no longer assigned — leave track page (avoids "Not authorized" empty screen)
      navigate('/rider', { replace: true, state: { flash: msg } });
    } catch (e) {
      setMessage(e.response?.data?.message || 'Could not decline');
      setRemainingBusy(false);
    }
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

        {hasRemaining && (
          <div
            style={{
              position: 'relative',
              zIndex: 50,
              marginTop: 16,
              marginBottom: 16,
              background: '#fff7ed',
              border: '2px solid #f59e0b',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            }}
          >
            <h2 style={{ fontSize: 17, margin: '0 0 8px', color: '#9a3412' }}>
              {isCustomerUser ? 'Remaining payment required' : 'Waiting for remaining payment'}
            </h2>
            <p style={{ fontSize: 14, margin: '0 0 12px', color: '#7c2d12' }}>
              Agreed price ₦{(job.agreedPrice || 0).toLocaleString()} · Already paid ₦{(job.amountPaid || 0).toLocaleString()}
              {job.remainingVatAmount ? ` · Extra VAT ₦${Number(job.remainingVatAmount).toLocaleString()}` : ''}
            </p>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#9a3412' }}>
              Remaining: ₦{remainingBal.toLocaleString()}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
              Time left: {mm}:{ss}
            </div>

            {isCustomerUser && (
              <>
                <div style={{ background: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #fed7aa' }}>
                  <div style={{ fontSize: 12, color: '#78716c' }}>Bank</div>
                  <div style={{ fontWeight: 700 }}>{bankDetails.bankName || '—'}</div>
                  <div style={{ fontSize: 12, color: '#78716c', marginTop: 6 }}>Account name</div>
                  <div style={{ fontWeight: 700 }}>{bankDetails.accountName || '—'}</div>
                  <div style={{ fontSize: 12, color: '#78716c', marginTop: 6 }}>Account number</div>
                  <div style={{ fontWeight: 800, letterSpacing: 1 }}>{bankDetails.accountNumber || '—'}</div>
                </div>
                {!job.remainingPaymentSubmitted ? (
                  <>
                    <input
                      placeholder="Payment reference (optional)"
                      value={remainingRef}
                      onChange={(e) => setRemainingRef(e.target.value)}
                      style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid #e7e5e4' }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={remainingBusy}
                      onClick={submitRemaining}
                      style={{ width: '100%' }}
                    >
                      {remainingBusy ? 'Submitting…' : 'I have paid the remaining balance'}
                    </button>
                  </>
                ) : (
                  <p style={{ fontSize: 14, color: '#166534', fontWeight: 600 }}>
                    Payment submitted — waiting for admin approval.
                  </p>
                )}
              </>
            )}

            {user?.role === 'rider' && (
              <>
                <p style={{ fontSize: 14, marginBottom: 12 }}>
                  {job.remainingPaymentSubmitted
                    ? 'Customer submitted the remaining payment. Waiting for admin confirmation. Do not start the delivery yet.'
                    : 'Customer must pay the remaining balance. Delivery is paused until admin approves.'}
                </p>
                {canDecline && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={remainingBusy}
                    onClick={declineRemaining}
                    style={{ width: '100%', borderColor: '#b91c1c', color: '#b91c1c' }}
                  >
                    Decline delivery
                  </button>
                )}
              </>
            )}
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
                routeGeometry={job.locationMode === 'map' ? job.routeGeometry : null}
                activeLegGeometry={job.locationMode === 'map' ? activeLegGeometry : null}
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
            {job.merchantSelfBooking ? (
              <div>
                <strong>Price:</strong> ₦{(
                  Number(job.amountPaid) || Number(job.platformTake) || Number(job.agreedPrice) || 0
                ).toLocaleString()}
                {' · Bank transfer'}
              </div>
            ) : (
              <div
                style={{
                  marginTop: 4,
                  padding: 12,
                  borderRadius: 10,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>
                  {job.paymentMethod === 'bank_transfer' ? 'Bank transfer' : 'Cash on delivery'}
                  {job.agreedPrice ? ' · Agreed' : ' · Listed'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                  <span>Amount</span>
                  <strong>
                    ₦{(Number(job.agreedPrice) || Number(job.suggestedPrice) || 0).toLocaleString()}
                  </strong>
                </div>
                {Number(job.vatAmount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                    <span>VAT ({job.vatPercentUsed || 0}%)</span>
                    <strong>₦{Number(job.vatAmount).toLocaleString()}</strong>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 15,
                    fontWeight: 800,
                    marginTop: 6,
                    paddingTop: 8,
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  <span>Total to pay</span>
                  <span style={{ color: 'var(--primary)' }}>
                    ₦{(
                      Number(job.totalPayable) ||
                      (Number(job.agreedPrice) || Number(job.suggestedPrice) || 0) +
                        (Number(job.vatAmount) || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
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

                <JobMediaGallery job={job} title="All media" />

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
              .filter((o) => {
                const rid = String(o.rider?._id || o.rider || '');
                const uid = String(user?._id || user?.id || '');
                // Backend may already return only this rider's offers (bargaining payload)
                if (!rid || rid === 'undefined') return true;
                return rid === uid;
              })
              .map((offer) => (
                <div key={offer._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ fontSize: 14 }}>
                    Your offer: <strong>₦{(offer.amount || 0).toLocaleString()}</strong>
                    <span className="badge badge-info" style={{ marginLeft: 8 }}>{String(offer.status || '').replace(/_/g, ' ')}</span>
                  </div>
                  {(offer.history || []).length > 0 && (
                    <div style={{ marginTop: 8, padding: 8, background: 'var(--gray-50)', borderRadius: 8, fontSize: 12 }}>
                      <strong>Negotiation history</strong>
                      {(offer.history || []).map((h, hi) => (
                        <div key={hi} style={{ marginTop: 4 }}>
                          {h.by === 'customer' ? 'Customer' : 'You'}: ₦{(h.amount || 0).toLocaleString()}
                          {h.message ? ` — ${h.message}` : ''}
                          {h.at ? ` · ${new Date(h.at).toLocaleString()}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
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
            routeGeometry={job.locationMode === 'map' ? job.routeGeometry : null}
            activeLegGeometry={job.locationMode === 'map' ? activeLegGeometry : null}
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
