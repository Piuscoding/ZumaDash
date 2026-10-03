import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Landing.css';

const Landing = () => {
  const { isAuthenticated, user } = useAuth();

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'rider') return '/rider';
    if (user.role === 'admin') return '/admin';
    return '/dashboard';
  };

  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="navbar">
        <div className="container nav-inner">
          <Link to="/" className="logo">
            <span className="logo-icon">⛰</span> ZumaDash
          </Link>
          <div className="nav-links">
            <Link to="/how-it-works">How it works</Link>
            <Link to="/for-riders">For Riders</Link>
            {isAuthenticated ? (
              <Link to={getDashboardLink()} className="btn btn-primary">Dashboard</Link>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register" className="btn btn-primary">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-text">
            <h1>Fast & Trusted Delivery across <span>Dutse, Kubwa & Bwari</span></h1>
            <p>
              Built for the people who live and work here. Real local riders. 
              WhatsApp tracking that works where GPS fails. Fair negotiated prices.
            </p>
            <div className="hero-actions">
              <Link to={isAuthenticated ? '/book' : '/register'} className="btn btn-primary btn-lg">
                Send a Package
              </Link>
              <Link to="/become-a-rider" className="btn btn-secondary btn-lg">
                Become a Rider
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card">
              <div className="hero-card-badge">Local Only</div>
              <h3>Dutse → Kubwa → Bwari</h3>
              <p>Hyper-local. No long city trips. Faster deliveries.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section how-it-works">
        <div className="container">
          <h2 className="section-title">How ZumaDash Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <h3>Book in seconds</h3>
              <p>Describe pickup & drop-off with text + photos. No complicated forms.</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h3>Riders make offers</h3>
              <p>Local riders see the job and send their price. You choose the best one.</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h3>Track & receive</h3>
              <p>Follow progress on WhatsApp. Photo proof at every stage. Safe delivery.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why ZumaDash */}
      <section className="section why">
        <div className="container">
          <h2 className="section-title">Why ZumaDash?</h2>
          <div className="features">
            <div className="feature-card">
              <div className="feature-icon">📍</div>
              <h3>Hyper-Local Only</h3>
              <p>We only operate in Dutse, Kubwa and Bwari. Better density, faster ETAs, local knowledge.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>WhatsApp Tracking</h3>
              <p>GPS fails in many areas here. We use WhatsApp + photos + landmarks so deliveries actually succeed.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Fair Negotiated Prices</h3>
              <p>Riders and customers agree on the price. No hidden surge. Transparent commission.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3>Verified Riders</h3>
              <p>Every rider is verified by admin. Photo proof at pickup and delivery. Dispute protection.</p>
            </div>
          </div>
        </div>
      </section>

      {/* For Riders dual section */}
      <section className="section for-riders-section">
        <div className="container">
          <h2 className="section-title">Join as a Rider</h2>
          <div className="rider-cards">
            <div className="rider-card">
              <div className="rider-card-header individual">Individual Bike Owners</div>
              <h3>Already delivering on your own?</h3>
              <ul>
                <li>Get more jobs without hunting customers</li>
                <li>Keep 85–88% of the agreed price</li>
                <li>Daily / every 2 days settlement</li>
                <li>We handle customer complaints</li>
                <li>Build your reputation with ratings</li>
              </ul>
              <Link to="/become-a-rider" className="btn btn-primary btn-block">Apply as Individual Rider</Link>
            </div>
            <div className="rider-card">
              <div className="rider-card-header fleet">Fleet / Business Owners</div>
              <h3>Own multiple bikes?</h3>
              <ul>
                <li>Put your entire fleet on ZumaDash</li>
                <li>Higher volume of jobs</li>
                <li>Central monitoring of your riders</li>
                <li>Bulk settlement options</li>
                <li>Priority support</li>
              </ul>
              <Link to="/become-a-rider" className="btn btn-primary btn-block">Apply as Fleet Owner</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section cta-section">
        <div className="container text-center">
          <h2>Ready to experience delivery that actually understands this axis?</h2>
          <p>Dutse • Kubwa • Bwari — no more failed deliveries.</p>
          <Link to={isAuthenticated ? '/book' : '/register'} className="btn btn-primary btn-lg">
            Book Your First Delivery
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <span className="logo-icon">⛰</span> ZumaDash
            <p>Delivery for Dutse, Kubwa & Bwari</p>
          </div>
          <div className="footer-links">
            <Link to="/how-it-works">How it works</Link>
            <Link to="/for-riders">For Riders</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/support">Support</Link>
          </div>
          <p className="copyright">© {new Date().getFullYear()} ZumaDash. Built for Northern Abuja.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
