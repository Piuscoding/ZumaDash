import React from 'react';
import { Link } from 'react-router-dom';
import howWorksImg from '../assets/how-works.png';
import PublicNavbar from '../components/PublicNavbar';
import { useBranding, BrandLogo } from '../context/BrandingContext';

const steps = [
  {
    num: 1,
    title: 'Book in seconds',
    desc: 'Describe pickup and drop-off with text and optional photos. Landmarks work best in Dutse, Kubwa and Bwari — no formal street address required.',
  },
  {
    num: 2,
    title: 'Riders make offers',
    desc: 'Verified local riders see your job and send their price. You accept the offer that works for you. Fair bargaining, no hidden surge.',
  },
  {
    num: 3,
    title: 'Track with WhatsApp + photos',
    desc: 'GPS fails in large parts of these areas. Riders update status with photo proof (LIVE, PICKED, DELIVERED). You get updates in the app and via WhatsApp.',
  },
  {
    num: 4,
    title: 'Pay your way',
    desc: 'Cash on delivery or bank transfer. For bank transfer, you see ZumaDash account details and confirm before booking. Rider collects the full agreed amount; platform commission is settled between rider and ZumaDash.',
  },
];

const HowItWorks = () => (
  <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
    <PublicNavbar />

    <div className="container" style={{ padding: '48px 16px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>How ZumaDash Works</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: 32, fontSize: 16, maxWidth: 560 }}>
        Built only for Dutse, Kubwa and Bwari — so deliveries are faster, more reliable, and priced fairly.
      </p>

      <img
        src={howWorksImg}
        alt="ZumaDash rider in the area"
        style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 16, marginBottom: 40 }}
      />

      {steps.map((s) => (
        <div key={s.num} style={{ display: 'flex', gap: 20, marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0,
          }}>
            {s.num}
          </div>
          <div>
            <h3 style={{ fontSize: 18, marginBottom: 6 }}>{s.title}</h3>
            <p style={{ color: 'var(--gray-700)', fontSize: 15, lineHeight: 1.65 }}>{s.desc}</p>
          </div>
        </div>
      ))}

      <div style={{ background: 'white', borderRadius: 16, padding: 28, marginTop: 16, boxShadow: 'var(--shadow)' }}>
        <h3 style={{ fontSize: 17, marginBottom: 12 }}>Safety at every step</h3>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, color: 'var(--gray-700)', fontSize: 14 }}>
          <li>Only admin-verified riders receive jobs</li>
          <li>Photo proof required at LIVE, PICKED and DELIVERED</li>
          <li>Disputes can freeze earnings until evidence is reviewed</li>
          <li>Both customers and riders can open support tickets</li>
        </ul>
      </div>

      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <Link to="/book" className="btn btn-primary btn-lg">Book a Delivery</Link>
        <p style={{ marginTop: 16, fontSize: 14 }}>
          <Link to="/become-a-rider" style={{ color: 'var(--primary)', fontWeight: 600 }}>Become a rider instead →</Link>
        </p>
      </div>
    </div>
  </div>
);

export default HowItWorks;
