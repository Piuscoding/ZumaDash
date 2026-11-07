import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import PublicNavbar from '../components/PublicNavbar';
import { useBranding, BrandLogo } from '../context/BrandingContext';
import '../styles/Landing.css';

import heroImg from '../assets/hero-zuma.png';
import howWorksImg from '../assets/how-works.png';
import whyGateImg from '../assets/why-gate.png';
import individualRiderImg from '../assets/individual-rider.png';
import fleetHubImg from '../assets/fleet-hub.png';
import trustRiderImg from '../assets/trust-rider.png';
import ctaMountainImg from '../assets/cta-mountain.png';

const Landing = () => {
  const { isAuthenticated, user } = useAuth();
  const { platformName } = useBranding();
  const { t } = useI18n();

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'rider') return '/rider';
    if (user.role === 'merchant') return '/merchant';
    if (user.role === 'admin' || user.role === 'manager') return '/admin';
    return '/dashboard';
  };

  return (
    <div className="landing">
      <PublicNavbar />

      <section
        className="hero"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(13,107,58,0.88) 0%, rgba(8,80,44,0.82) 50%, rgba(6,61,34,0.88) 100%), url(${heroImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="container hero-content">
          <div className="hero-text">
            <h1>
              {platformName} — Delivery across{' '}
              <span>Dutse, Kubwa, Bwari & Ushafa</span>
            </h1>
            <p>
              Local riders, clear pricing, and status updates from booking to delivery.
            </p>
            <div className="hero-actions">
              <Link to="/book" className="btn btn-primary btn-lg">
                {t('landing.ctaBook') || 'Book a delivery'}
              </Link>
              <Link
                to={isAuthenticated ? getDashboardLink() : '/become-a-rider'}
                className="btn btn-secondary btn-lg"
              >
                {isAuthenticated ? t('nav.dashboard') || 'Dashboard' : t('landing.ctaRider') || 'Become a rider'}
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card">
              <div className="hero-card-badge">Service area</div>
              <h3>Dutse · Kubwa · Bwari · Ushafa</h3>
              <p>Deliveries stay within this corridor for faster turnaround.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section how-it-works" id="customers">
        <div className="container">
          <h2 className="section-title">For customers</h2>
          <p className="section-subtitle">What happens when you book and track a delivery</p>
          <div className="how-grid">
            <img src={howWorksImg} alt="" className="section-img" />
            <div className="steps">
              {[
                {
                  n: 1,
                  t: 'Book',
                  d: 'Enter pickup and drop-off (text or map). Add extra stops if needed. Choose cash or bank transfer.',
                },
                {
                  n: 2,
                  t: 'Payment',
                  d: 'Cash: verified accounts may pay on delivery. Bank transfer: transfer the shown amount; the job opens after confirmation.',
                },
                {
                  n: 3,
                  t: 'Offers or assignment',
                  d: 'Riders send offers you can accept, or a rider is assigned depending on how the job is handled. You see status on Track.',
                },
                {
                  n: 4,
                  t: 'Delivery',
                  d: 'Follow pickup, in transit, and delivered. Wallet credit from shared-route savings (when available) applies on later bookings automatically.',
                },
              ].map((s) => (
                <div key={s.n} className="step">
                  <div className="step-num">{s.n}</div>
                  <div>
                    <h3>{s.t}</h3>
                    <p>{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section why" id="riders">
        <div className="container">
          <h2 className="section-title">For riders</h2>
          <p className="section-subtitle">Independent and fleet riders</p>
          <div className="why-grid">
            <div className="features">
              {[
                {
                  t: 'Available jobs',
                  d: 'See open jobs and grouped trips in your corridor. Accept when you are free and not locked by outstanding commission.',
                },
                {
                  t: 'Single active job',
                  d: 'One delivery (or one grouped trip) at a time until it is completed.',
                },
                {
                  t: 'Earnings & withdrawals',
                  d: 'Completed jobs settle into your balance after clearance. Withdraw according to the platform payout schedule (daily, weekly, or anytime).',
                },
                {
                  t: 'Fleet riders',
                  d: 'If you ride under a merchant, job and withdrawal controls may be set by your fleet owner.',
                },
              ].map((f, i) => (
                <div key={i} className="feature">
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </div>
              ))}
            </div>
            <img src={individualRiderImg} alt="" className="section-img" />
          </div>
        </div>
      </section>

      <section className="section how-it-works" id="merchants">
        <div className="container">
          <h2 className="section-title">For merchants</h2>
          <p className="section-subtitle">Fleet owners and shop operators</p>
          <div className="how-grid">
            <img src={fleetHubImg} alt="" className="section-img" />
            <div className="steps">
              {[
                {
                  n: 1,
                  t: 'Fleet',
                  d: 'Add bikes and riders, review documents, and control who can take jobs.',
                },
                {
                  n: 2,
                  t: 'Own goods',
                  d: 'Book deliveries of your stock with your fleet rider when enabled.',
                },
                {
                  n: 3,
                  t: 'Balances',
                  d: 'Earnings and platform fees follow the same clearance and withdrawal rules as riders.',
                },
              ].map((s) => (
                <div key={s.n} className="step">
                  <div className="step-num">{s.n}</div>
                  <div>
                    <h3>{s.t}</h3>
                    <p>{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section why">
        <div className="container">
          <h2 className="section-title">Why {platformName}</h2>
          <div className="why-grid">
            <div className="features">
              {[
                { t: 'Corridor focus', d: 'Dutse, Kubwa, Bwari and Ushafa only.' },
                { t: 'Clear status', d: 'Track each job from booking through delivery.' },
                { t: 'Local riders', d: 'Verified riders who know the area.' },
              ].map((f, i) => (
                <div key={i} className="feature">
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </div>
              ))}
            </div>
            <img src={whyGateImg} alt="" className="section-img" />
          </div>
        </div>
      </section>

      <section
        className="section cta"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(13,107,58,0.92), rgba(6,61,34,0.9)), url(${ctaMountainImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="container" style={{ textAlign: 'center', color: '#fff' }}>
          <BrandLogo size={56} />
          <h2 style={{ marginTop: 16 }}>Ready to send or earn?</h2>
          <div className="hero-actions" style={{ justifyContent: 'center', marginTop: 20 }}>
            <Link to="/book" className="btn btn-primary btn-lg">
              Book a delivery
            </Link>
            <Link to="/become-a-rider" className="btn btn-secondary btn-lg">
              Apply as rider
            </Link>
          </div>
          <p style={{ marginTop: 24, fontSize: 13, opacity: 0.85 }}>
            <Link to="/terms-customers" style={{ color: '#fff' }}>Customer terms</Link>
            {' · '}
            <Link to="/terms-riders" style={{ color: '#fff' }}>Rider terms</Link>
            {' · '}
            <Link to="/terms-merchants" style={{ color: '#fff' }}>Merchant terms</Link>
          </p>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span>{platformName}</span>
          <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Dutse · Kubwa · Bwari · Ushafa</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
