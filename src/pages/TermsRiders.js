import React from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import { useBranding } from '../context/BrandingContext';

const TermsRiders = () => {
  const { platformName } = useBranding();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <PublicNavbar />
      <div className="container" style={{ padding: '40px 16px', maxWidth: 720 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Rider terms</h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 28 }}>
          {platformName} — independent and fleet riders
        </p>

        <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>1. Eligibility</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>You must complete identity and document verification before taking jobs.</li>
          <li>Fleet riders remain subject to their merchant job and withdrawal controls.</li>
        </ul>

        <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>2. Jobs</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>Only one active job or grouped trip at a time.</li>
          <li>Outstanding commission must be cleared before accepting new work.</li>
          <li>Grouped trips show stop lists and earnings before you accept or after assignment.</li>
          <li>Service is limited to Dutse, Kubwa, Bwari and Ushafa.</li>
        </ul>

        <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>3. Earnings and withdrawals</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>Completed work settles after clearance according to platform rules.</li>
          <li>Withdrawals require an approved bank account and follow the platform schedule (daily, weekly, or anytime).</li>
          <li>A fixed processing fee may apply on each withdrawal request.</li>
        </ul>

        <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>4. Conduct</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
          Treat customers and packages with care. Fraud, abuse, or repeated failed deliveries may lead to suspension.
        </p>

        <p style={{ marginTop: 32, fontSize: 13, color: 'var(--gray-500)' }}>
          Last updated: November 2026 ·{' '}
          <Link to="/terms-customers" style={{ color: 'var(--primary)' }}>Customer terms</Link>
          {' · '}
          <Link to="/terms-merchants" style={{ color: 'var(--primary)' }}>Merchant terms</Link>
        </p>
      </div>
    </div>
  );
};

export default TermsRiders;
