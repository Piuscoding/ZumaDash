import React from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import { useBranding, BrandLogo } from '../context/BrandingContext';

const Terms = () => (
  <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
    <PublicNavbar />
    <div className="container" style={{ padding: '40px 16px', maxWidth: 720 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 24 }}>Terms & Conditions</h1>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>For Customers</h2>
      <ul style={{ paddingLeft: 20, lineHeight: 1.8, color: 'var(--gray-700)', fontSize: 14 }}>
        <li>ZumaDash operates only within Dutse, Kubwa and Bwari.</li>
        <li>You agree on the final price with the rider before the job starts.</li>
        <li>Provide accurate pickup and drop-off descriptions (landmarks + photos help a lot).</li>
        <li>Photo proof is required at pickup and delivery stages.</li>
        <li>False complaints may lead to account restrictions.</li>
        <li>Cash on Delivery or Bank Transfer are currently supported.</li>
      </ul>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>For Riders</h2>
      <ul style={{ paddingLeft: 20, lineHeight: 1.8, color: 'var(--gray-700)', fontSize: 14 }}>
        <li>Only verified and admin-approved riders can receive jobs.</li>
        <li>You collect the full agreed amount from the customer.</li>
        <li>Platform commission (currently 12–15%) must be remitted via bank transfer as agreed.</li>
        <li>False LIVE / PICKED / DONE updates will lead to warnings and possible permanent removal.</li>
        <li>You must provide photo proof at required stages.</li>
        <li>Outstanding commission may prevent you from receiving new jobs.</li>
      </ul>

      <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>General</h2>
      <ul style={{ paddingLeft: 20, lineHeight: 1.8, color: 'var(--gray-700)', fontSize: 14 }}>
        <li>ZumaDash is a technology platform connecting customers and independent riders.</li>
        <li>We are not a direct employer of riders.</li>
        <li>Disputes are reviewed fairly using available evidence (photos, timestamps, history).</li>
        <li>Platform name, logo and commission rate may be updated by admin.</li>
      </ul>

      <p style={{ marginTop: 32, fontSize: 13, color: 'var(--gray-500)' }}>
        Last updated: October 2026 • ZumaDash – Dutse, Kubwa & Bwari
      </p>
    </div>
  </div>
);

export default Terms;
