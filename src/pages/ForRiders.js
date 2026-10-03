import React from 'react';
import { Link } from 'react-router-dom';
import individualImg from '../assets/individual-rider.png';
import fleetImg from '../assets/fleet-hub.png';
import PublicNavbar from '../components/PublicNavbar';
import { useBranding, BrandLogo } from '../context/BrandingContext';

const ForRiders = () => (
  <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
    <PublicNavbar />

    <div className="container" style={{ padding: '48px 16px', maxWidth: 960 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Ride with ZumaDash</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: 40, fontSize: 16, maxWidth: 600 }}>
        Whether you own one bike or a small fleet, we connect you to deliveries only in Dutse, Kubwa and Bwari — where you already know the roads.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 48 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <img src={individualImg} alt="Individual rider" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
          <div style={{ padding: 24 }}>
            <span className="badge badge-info" style={{ marginBottom: 12 }}>Individual</span>
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>Already delivering on your own?</h2>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 20 }}>
              {[
                'More jobs without hunting customers',
                'Keep 85–88% of the agreed price',
                'Daily / every 2 days commission settlement',
                'We handle customer complaints',
                'Build reputation with ratings & trust score',
              ].map((t) => (
                <li key={t} style={{ padding: '6px 0 6px 22px', position: 'relative', fontSize: 14, color: 'var(--gray-700)' }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                  {t}
                </li>
              ))}
            </ul>
            <Link to="/become-a-rider" className="btn btn-primary btn-block">Apply as Individual Rider</Link>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <img src={fleetImg} alt="Fleet owners" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
          <div style={{ padding: 24 }}>
            <span className="badge badge-warning" style={{ marginBottom: 12 }}>Fleet / Business</span>
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>Own multiple bikes?</h2>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 20 }}>
              {[
                'Put your fleet on ZumaDash',
                'Higher volume of local jobs',
                'Monitor riders and settlements',
                'Bulk commission options',
                'Priority support',
              ].map((t) => (
                <li key={t} style={{ padding: '6px 0 6px 22px', position: 'relative', fontSize: 14, color: 'var(--gray-700)' }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                  {t}
                </li>
              ))}
            </ul>
            <Link to="/become-a-rider" className="btn btn-primary btn-block">Apply as Fleet Owner</Link>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>How money works</h3>
        <p style={{ fontSize: 14, color: 'var(--gray-700)', lineHeight: 1.7 }}>
          You and the customer agree a price (or accept the suggested band). You collect the <strong>full amount</strong> in cash or confirm bank transfer.
          ZumaDash takes a platform commission (typically 12–15%). You transfer only that commission to us — no physical office needed.
          Clear your commission to keep receiving new jobs.
        </p>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>Requirements</h3>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>Valid NIN and phone number</li>
          <li>Bike details (plate, model) — 1–2 bikes for individuals</li>
          <li>Guarantor information</li>
          <li>Admin verification before you can take jobs</li>
          <li>Local knowledge of Dutse, Kubwa and/or Bwari</li>
        </ul>
        <p style={{ marginTop: 16, fontSize: 13 }}>
          <Link to="/terms-riders" style={{ color: 'var(--primary)', fontWeight: 600 }}>Read Rider Terms →</Link>
        </p>
      </div>
    </div>
  </div>
);

export default ForRiders;
