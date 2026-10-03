import React from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import { useBranding, BrandLogo } from '../context/BrandingContext';

const bands = [
  {
    zone: 'Same zone',
    desc: 'Pickup and drop-off in the same area (e.g. both in Kubwa)',
    prices: [
      { size: 'Small', price: '₦1,200+' },
      { size: 'Medium', price: '₦1,800+' },
      { size: 'Large', price: '₦2,500+' },
    ],
  },
  {
    zone: 'Neighbouring',
    desc: 'Adjacent areas (e.g. Kubwa ↔ Bwari, Kubwa ↔ Dutse)',
    prices: [
      { size: 'Small', price: '₦2,000+' },
      { size: 'Medium', price: '₦2,800+' },
      { size: 'Large', price: '₦3,800+' },
    ],
  },
  {
    zone: 'Cross zone',
    desc: 'Across the full corridor (e.g. Dutse ↔ Bwari via Kubwa)',
    prices: [
      { size: 'Small', price: '₦3,000+' },
      { size: 'Medium', price: '₦4,000+' },
      { size: 'Large', price: '₦5,500+' },
    ],
  },
];

const Pricing = () => (
  <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
    <PublicNavbar />

    <div className="container" style={{ padding: '48px 16px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Pricing & Areas</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: 16, fontSize: 16, maxWidth: 600 }}>
        We only operate in <strong>Dutse, Kubwa and Bwari</strong>. Prices below are suggestions — you and the rider can bargain to a final agreed amount.
      </p>

      <div style={{ background: 'var(--primary-light)', borderRadius: 12, padding: 16, marginBottom: 36, fontSize: 14 }}>
        <strong>Service area:</strong> Dutse • Kubwa • Bwari (Abuja). We do not take jobs outside this corridor.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
        {bands.map((b) => (
          <div key={b.zone} className="card">
            <h3 style={{ fontSize: 18, marginBottom: 6 }}>{b.zone}</h3>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>{b.desc}</p>
            {b.prices.map((p) => (
              <div key={p.size} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 14 }}>
                <span>{p.size}</span>
                <strong style={{ color: 'var(--primary)' }}>{p.price}</strong>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 17, marginBottom: 12 }}>How final price is set</h3>
        <ol style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>You enter a suggested price when booking (guided by the bands above).</li>
          <li>Riders can accept or send a counter-offer.</li>
          <li>You accept one offer — that becomes the <strong>agreed price</strong>.</li>
          <li>Platform commission is a % of the agreed price only.</li>
        </ol>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 17, marginBottom: 12 }}>Payment methods</h3>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li><strong>Cash on Delivery</strong> — pay the rider when the package is delivered.</li>
          <li><strong>Bank Transfer</strong> — transfer to ZumaDash account shown in the app, then confirm before booking.</li>
        </ul>
      </div>

      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <Link to="/book" className="btn btn-primary btn-lg">Book a Delivery</Link>
      </div>
    </div>
  </div>
);

export default Pricing;
