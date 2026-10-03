import React from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import { useBranding, BrandLogo } from '../context/BrandingContext';

const TermsRiders = () => (
  <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
    <PublicNavbar />
    <div className="container" style={{ padding: '40px 16px', maxWidth: 720 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Terms & Conditions — Riders</h1>
      <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 28 }}>Independent delivery partners on ZumaDash.</p>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>1. Independent contractor</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
        You are not an employee of ZumaDash. You provide delivery services as an independent partner using your own bike(s).
      </p>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>2. Verification</h2>
      <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
        <li>You must complete the application (NIN, bike details, guarantor) and wait for admin approval.</li>
        <li>Only approved riders can access the rider dashboard and receive jobs.</li>
        <li>False documents or identity may result in permanent ban.</li>
      </ul>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>3. Jobs & conduct</h2>
      <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
        <li>Only accept jobs you can complete within Dutse, Kubwa and Bwari.</li>
        <li>Update status honestly: LIVE, PICKED, DELIVERED with real photo proof.</li>
        <li>False status updates (e.g. marking DELIVERED without delivering) are grounds for freeze or ban.</li>
        <li>Treat customers and packages with care.</li>
      </ul>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>4. Commission & settlement</h2>
      <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
        <li>You collect the full agreed price from the customer (cash or as arranged).</li>
        <li>Platform commission is a percentage of the agreed price and is owed to ZumaDash.</li>
        <li>You must remit commission via bank transfer as instructed (daily or every 2 days).</li>
        <li>Outstanding commission may block new jobs until cleared.</li>
      </ul>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>5. Freezes & disputes</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
        Admin may freeze a job’s earnings or your account while investigating complaints. Evidence (photos, history, trust score) is used. Proven fraud leads to progressive penalties up to permanent removal.
      </p>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>6. Service area</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
        ZumaDash jobs are limited to Dutse, Kubwa and Bwari. Do not accept or divert jobs outside this corridor through the platform.
      </p>

      <p style={{ marginTop: 32, fontSize: 13, color: 'var(--gray-500)' }}>
        Last updated: October 2026 · <Link to="/terms-customers" style={{ color: 'var(--primary)' }}>Customer Terms</Link>
      </p>
    </div>
  </div>
);

export default TermsRiders;
