import React from 'react';
import { Link } from 'react-router-dom';

const Page = () => {
  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: 'var(--gray-50)' }}>
      <div className="container">
        <div style={{ marginBottom: 24 }}>
          <Link to="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Back to Home</Link>
        </div>
        <div className="card">
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--gray-500)' }}>
            This page is part of Phase 2 and will be fully expanded next. 
            Core structure and routing are already in place.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Page;
