import React from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import { useBranding, BrandLogo } from '../context/BrandingContext';

const TermsCustomers = () => (
  <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
    <PublicNavbar />
    <div className="container" style={{ padding: '40px 16px', maxWidth: 720 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Terms & Conditions — Customers</h1>
      <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 28 }}>ZumaDash delivery service for Dutse, Kubwa and Bwari.</p>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>1. Service area</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
        ZumaDash only facilitates deliveries within Dutse, Kubwa and Bwari. Jobs outside this area are not supported.
      </p>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>2. Booking & pricing</h2>
      <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
        <li>You provide accurate pickup and drop-off descriptions (and optional photos).</li>
        <li>Suggested prices are guides; the final price is the one you accept from a rider offer.</li>
        <li>You may cancel before a rider is assigned; after assignment, contact support.</li>
      </ul>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>3. Payment</h2>
      <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
        <li>Cash on delivery: pay the agreed amount to the rider on delivery.</li>
        <li>Bank transfer: transfer the shown amount to the platform account and confirm in the app before booking is completed.</li>
        <li>False payment claims may result in account freeze and job cancellation.</li>
      </ul>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>4. Prohibited items</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
        You must not send illegal goods, weapons, hazardous materials, or items prohibited by Nigerian law. ZumaDash and riders may refuse such packages.
      </p>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>5. Disputes & safety</h2>
      <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
        <li>Report problems via Support with clear details. Photo proof and timestamps are used in reviews.</li>
        <li>False complaints against honest riders may lead to account restrictions.</li>
        <li>ZumaDash is a platform connecting you with independent riders; it is not the carrier of the package itself.</li>
      </ul>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>6. Accounts</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
        Provide accurate registration details. We may freeze accounts for fraud, abuse, or repeated false reports.
      </p>

      <p style={{ marginTop: 32, fontSize: 13, color: 'var(--gray-500)' }}>
        Last updated: October 2026 · <Link to="/terms-riders" style={{ color: 'var(--primary)' }}>Rider Terms</Link>
      </p>
    </div>
  </div>
);

export default TermsCustomers;
