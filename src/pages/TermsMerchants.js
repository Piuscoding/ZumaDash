import React from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import { useBranding } from '../context/BrandingContext';

const TermsMerchants = () => {
  const { platformName } = useBranding();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <PublicNavbar />
      <div className="container" style={{ padding: '40px 16px', maxWidth: 720 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Merchant terms</h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 28 }}>
          {platformName} — fleet owners and operators
        </p>

        <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>1. Fleet management</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>You are responsible for riders and bikes registered under your fleet.</li>
          <li>You may control job access and withdrawals for fleet riders where the platform allows.</li>
        </ul>

        <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>2. Own-goods bookings</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
          When enabled, you may book deliveries of your own goods with an assigned fleet rider.
          Platform fees apply as configured for merchant own-goods bookings.
        </p>

        <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>3. Settlements</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>Balances follow the same clearance rules as riders.</li>
          <li>Withdrawals follow the platform schedule (daily, weekly, or anytime) and require approved bank details.</li>
        </ul>

        <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>4. Compliance</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
          Fleet activity must comply with Nigerian law and these terms. The platform may suspend fleets for abuse or unpaid obligations.
        </p>

        <p style={{ marginTop: 32, fontSize: 13, color: 'var(--gray-500)' }}>
          Last updated: November 2026 ·{' '}
          <Link to="/terms-customers" style={{ color: 'var(--primary)' }}>Customer terms</Link>
          {' · '}
          <Link to="/terms-riders" style={{ color: 'var(--primary)' }}>Rider terms</Link>
        </p>
      </div>
    </div>
  );
};

export default TermsMerchants;
