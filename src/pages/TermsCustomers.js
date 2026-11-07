import React from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import { useBranding } from '../context/BrandingContext';

const TermsCustomers = () => {
  const { platformName } = useBranding();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <PublicNavbar />
      <div className="container" style={{ padding: '40px 16px', maxWidth: 720 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Customer terms</h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 28 }}>
          {platformName} — Dutse, Kubwa, Bwari and Ushafa
        </p>

        <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>1. Service area</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
          Deliveries are limited to Dutse, Kubwa, Bwari and Ushafa. Requests outside this corridor are not accepted.
        </p>

        <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>2. Booking</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>Provide accurate pickup and drop-off details. You may add additional stops within platform limits.</li>
          <li>All pickups on a multi-stop booking must be in the same corridor area.</li>
          <li>Prices shown at checkout include any stop fees and applicable taxes.</li>
          <li>Wallet credit (when available) is applied automatically before any amount you still need to pay.</li>
        </ul>

        <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>3. Payment</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>Cash on delivery is available only for accounts with approved identity verification.</li>
          <li>Bank transfer jobs open to riders after the platform confirms payment.</li>
          <li>False payment claims may result in cancellation and account restrictions.</li>
        </ul>

        <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>4. Shared-route savings</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
          When you opt in (or when the platform runs automatic matching), your job may wait briefly for a compatible route.
          If a match is found, any difference may be issued as non-withdrawable wallet credit with a fixed validity period.
          Credit is applied on future bookings only and cannot be cashed out.
        </p>

        <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>5. Prohibited items</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
          Illegal goods, weapons, hazardous materials, and items prohibited under Nigerian law are not allowed.
          Riders and the platform may refuse such packages.
        </p>

        <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>6. Disputes</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
          Report issues through Support with clear details. The platform connects customers with independent riders;
          it is not the carrier of the package itself.
        </p>

        <p style={{ marginTop: 32, fontSize: 13, color: 'var(--gray-500)' }}>
          Last updated: November 2026 ·{' '}
          <Link to="/terms-riders" style={{ color: 'var(--primary)' }}>Rider terms</Link>
          {' · '}
          <Link to="/terms-merchants" style={{ color: 'var(--primary)' }}>Merchant terms</Link>
        </p>
      </div>
    </div>
  );
};

export default TermsCustomers;
