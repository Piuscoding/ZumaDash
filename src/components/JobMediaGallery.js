import React, { useMemo, useState } from 'react';

/**
 * Step 17 – collect every media URL on a job for details view
 */
export function collectJobMedia(job) {
  if (!job) return [];
  const items = [];
  const push = (url, type, label, at) => {
    if (!url) return;
    items.push({ url, type: type || 'image', label: label || 'Media', at: at || null });
  };

  (job.pickup?.photos || []).forEach((u, i) => push(u, 'image', `Pickup photo ${i + 1}`, job.createdAt));
  if (job.pickup?.voiceNote) push(job.pickup.voiceNote, 'audio', 'Pickup voice note', job.createdAt);

  (job.dropoff?.photos || []).forEach((u, i) => push(u, 'image', `Drop-off photo ${i + 1}`, job.createdAt));
  if (job.dropoff?.voiceNote) push(job.dropoff.voiceNote, 'audio', 'Drop-off voice note', job.createdAt);

  if (job.bookingVideo) push(job.bookingVideo, 'video', 'Booking video', job.createdAt);
  if (job.bookingVoiceNote) push(job.bookingVoiceNote, 'audio', 'Booking voice note', job.createdAt);

  if (job.proofPhotos?.live) push(job.proofPhotos.live, 'image', 'LIVE proof', null);
  if (job.proofPhotos?.picked) push(job.proofPhotos.picked, 'image', 'PICKED proof', null);
  if (job.proofPhotos?.delivered) push(job.proofPhotos.delivered, 'image', 'Delivered proof', null);

  (job.statusHistory || []).forEach((h) => {
    if (h.photo) {
      const st = h.status || 'update';
      push(h.photo, 'image', `Status: ${String(st).replace(/_/g, ' ')}`, h.at || h.createdAt);
    }
  });

  // de-dupe by url
  const seen = new Set();
  return items.filter((m) => {
    if (seen.has(m.url)) return false;
    seen.add(m.url);
    return true;
  });
}

const JobMediaGallery = ({ job, title = 'All media' }) => {
  const items = useMemo(() => collectJobMedia(job), [job]);
  const [lightbox, setLightbox] = useState(null);

  return (
    <div className="card" style={{ marginTop: 12, padding: 16 }}>
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>{title}</h3>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No media on this job yet</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
          {items.map((m, i) => (
            <div key={`${m.url}-${i}`} style={{ textAlign: 'center' }}>
              {m.type === 'video' ? (
                <button
                  type="button"
                  onClick={() => setLightbox(m)}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
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
              ) : m.type === 'audio' ? (
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: 8,
                    border: '1px solid var(--gray-200)',
                    background: 'var(--gray-50, #f9fafb)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 6,
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 20 }}>🎤</span>
                  <audio src={m.url} controls style={{ width: '100%', height: 28 }} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLightbox(m)}
                  style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', width: '100%' }}
                >
                  <img
                    src={m.url}
                    alt={m.label}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '1px solid var(--gray-200)',
                    }}
                  />
                </button>
              )}
              <div style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: 4, lineHeight: 1.2 }}>
                {m.label}
              </div>
              {m.at && (
                <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>
                  {new Date(m.at).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          role="dialog"
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
          onClick={() => setLightbox(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95vw', maxHeight: '90vh' }}>
            <div style={{ color: '#fff', marginBottom: 8, fontSize: 14 }}>
              {lightbox.label}
              <button
                type="button"
                onClick={() => setLightbox(null)}
                style={{ float: 'right', background: 'transparent', color: '#fff', border: 'none', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            {lightbox.type === 'video' ? (
              <video src={lightbox.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '80vh' }} />
            ) : (
              <img src={lightbox.url} alt={lightbox.label} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8 }} />
            )}
            <div style={{ marginTop: 8 }}>
              <a href={lightbox.url} target="_blank" rel="noreferrer" style={{ color: '#93c5fd', fontSize: 13 }}>
                Open original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobMediaGallery;
