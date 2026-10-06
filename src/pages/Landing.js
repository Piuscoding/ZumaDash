import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'rider') return '/rider';
    if (user.role === 'admin') return '/admin';
    return '/dashboard';
  };

  return (
    <div className="landing">
      <PublicNavbar />

      {/* Hero */}
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
              {platformName} – Fast, Trusted Delivery Across{' '}
              <span>Dutse, Kubwa & Bwari</span>
            </h1>
            <p>
              Built for the people who live and work here. Real riders. Real tracking. Fair prices.
            </p>
            <div className="hero-actions">
              <Link to={isAuthenticated ? '/book' : '/book'} className="btn btn-primary btn-lg">
                Send a Package
              </Link>
              <Link
                to={isAuthenticated ? getDashboardLink() : '/become-a-rider'}
                className="btn btn-secondary btn-lg"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Become a Rider'}
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card">
              <div className="hero-card-badge">Local Only</div>
              <h3>Dutse → Kubwa → Bwari</h3>
              <p>Hyper-local. No long city trips. Faster deliveries for Northern Abuja.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section how-it-works">
        <div className="container">
          <h2 className="section-title">How {platformName} Works</h2>
          <p className="section-subtitle">
            Simple steps from booking to delivery — designed for areas where GPS is unreliable.
          </p>
          <div className="how-grid">
            <img src={howWorksImg} alt={`${platformName} rider in the corridor`} className="section-img" />
            <div className="steps">
              {[
                {
                  n: 1,
                  t: 'Book in seconds',
                  d: 'Describe pickup and drop-off with landmarks and optional photos. No complicated forms.',
                },
                {
                  n: 2,
                  t: 'Riders make offers',
                  d: 'Verified local riders send their price. You accept the offer that works for you.',
                },
                {
                  n: 3,
                  t: 'Track with proof',
                  d: 'Status updates with photos via the app and WhatsApp — built for weak GPS zones.',
                },
                {
                  n: 4,
                  t: 'Pay your way',
                  d: 'Cash on delivery or bank transfer. Fair prices, no surprise surge.',
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

      {/* Why */}
      <section className="section why">
        <div className="container">
          <h2 className="section-title">Why {platformName}?</h2>
          <p className="section-subtitle">
            Not another city-wide app. Built only for this corridor.
          </p>
          <div className="why-grid">
            <div className="features">
              {[
                { icon: '📍', t: 'Hyper-local', d: 'Dutse, Kubwa, Bwari and Ushafa only — riders who know every landmark.' },
                { icon: '💬', t: 'WhatsApp tracking', d: 'Photo proof and status updates where maps fail.' },
                { icon: '🤝', t: 'Fair bargaining', d: 'Suggested bands plus room to agree a final price.' },
                { icon: '🛡️', t: 'Verified riders', d: 'Admin-approved partners with documents and trust scores.' },
              ].map((f) => (
                <div key={f.t} className="feature-card">
                  <div className="feature-icon">{f.icon}</div>
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </div>
              ))}
            </div>
            <img src={whyGateImg} alt="Northern Abuja delivery corridor" className="section-img" />
          </div>
        </div>
      </section>

      {/* For riders */}
      <section className="section for-riders-section">
        <div className="container">
          <h2 className="section-title">Ride with {platformName}</h2>
          <p className="section-subtitle">
            Whether you own one bike or a small fleet — more local jobs, less hunting for customers.
          </p>
          <div className="rider-cards">
            <div className="rider-card">
              <img src={individualRiderImg} alt="Individual rider" className="rider-card-img" />
              <div className="rider-card-body">
                <span className="badge badge-info">Individual</span>
                <h3>Already delivering on your own?</h3>
                <ul>
                  <li>More jobs without hunting customers</li>
                  <li>Keep most of the agreed price</li>
                  <li>Clear commission settlement</li>
                  <li>We handle customer support</li>
                </ul>
                <Link to="/become-a-rider" className="btn btn-primary btn-block">
                  Apply as Individual
                </Link>
              </div>
            </div>
            <div className="rider-card">
              <img src={fleetHubImg} alt="Fleet owners" className="rider-card-img" />
              <div className="rider-card-body">
                <span className="badge badge-warning">Fleet / Business</span>
                <h3>Own multiple bikes?</h3>
                <ul>
                  <li>Put your fleet on {platformName}</li>
                  <li>Higher volume of local jobs</li>
                  <li>Track settlements in one place</li>
                  <li>Priority support</li>
                </ul>
                <Link to="/become-a-rider" className="btn btn-primary btn-block">
                  Apply as Fleet Owner
                </Link>
                <Link to="/terms-merchants" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                  Merchant / fleet terms
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="section trust-section">
        <div className="container">
          <div className="trust-grid">
            <img src={trustRiderImg} alt={`Verified ${platformName} rider`} className="section-img" />
            <div>
              <h2 className="section-title">Safety you can see</h2>
              <p className="section-subtitle" style={{ marginBottom: 8 }}>
                Every delivery step can be verified.
              </p>
              <ul className="trust-list">
                <li>Only admin-verified riders receive jobs</li>
                <li>Photo proof at LIVE, PICKED and DELIVERED</li>
                <li>Disputes can freeze earnings until reviewed</li>
                <li>In-app support for customers and riders</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="cta-section"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(13,107,58,0.9) 0%, rgba(6,61,34,0.92) 100%), url(${ctaMountainImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="container">
          <h2>Ready to send something?</h2>
          <p>Book in under a minute. Local riders. Clear prices.</p>
          <Link to="/book" className="btn btn-primary btn-lg">
            Book a Delivery
          </Link>
        </div>
      </section>

      {/* Footer – reshuffled columns */}
      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <div className="footer-brand-top">
                <BrandLogo size={40} />
                <span>{platformName}</span>
              </div>
              <p>
                Hyper-local delivery for Dutse, Kubwa, Bwari and Ushafa. Named after the rock that marks the road home.
              </p>
            </div>
            <div className="footer-col">
              <h4>Explore</h4>
              <Link to="/how-it-works">How it works</Link>
              <Link to="/pricing">Pricing & Areas</Link>
              <Link to="/for-riders">For Riders</Link>
              <Link to="/terms-merchants">For Merchants</Link>
              <Link to="/book">Book a delivery</Link>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              {isAuthenticated ? (
                <Link to={getDashboardLink()}>Dashboard</Link>
              ) : (
                <>
                  <Link to="/login">Login</Link>
                  <Link to="/register">Sign up</Link>
                </>
              )}
              <Link to="/become-a-rider">Become a rider</Link>
              <Link to="/terms-customers">Customer terms</Link>
              <Link to="/terms-riders">Rider terms</Link>
              <Link to="/terms-merchants">Merchant terms</Link>
              <Link to="/support">Support</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} {platformName}. Built for Northern Abuja.</span>
            <span>Dutse · Kubwa · Bwari · Ushafa</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
