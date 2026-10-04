import React from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import { useBranding, BrandLogo } from '../context/BrandingContext';
import fleetHubImg from '../assets/fleet-hub.png';

const TermsMerchants = () => {
  const { platformName } = useBranding();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <PublicNavbar />
      <div className="container" style={{ padding: '40px 16px', maxWidth: 720 }}>
        <div
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 28,
            border: '1px solid var(--gray-200)',
            background: 'white',
          }}
        >
          <img
            src={fleetHubImg}
            alt="Fleet merchants on ZumaDash"
            style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }}
          />
          <div style={{ padding: '20px 20px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <BrandLogo size={36} />
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{platformName}</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>
              Terms & Conditions — Merchants (Fleet Owners)
            </h1>
            <p style={{ color: 'var(--gray-500)', fontSize: 14, margin: 0 }}>
              For businesses and owners who register multiple bikes and manage fleet riders on {platformName}.
              Service area: Dutse · Kubwa · Bwari only.
            </p>
          </div>
        </div>

        <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>1. Role of a merchant</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
          A merchant (fleet owner) is not an employee of {platformName}. You operate as an independent business partner.
          You supply bikes, create and manage fleet riders under your account, and remain responsible for how those
          riders behave while using the platform. Individual riders you create are linked to your merchant account and
          may be subject to the control flags you set (job access, suspension, withdrawals).
        </p>

        <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>2. Application & verification</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>
            You must apply as <strong>Fleet / Merchant</strong>, provide a valid NIN, guarantor details, and the number
            of bikes in your fleet.
          </li>
          <li>
            For each bike you must supply accurate plate number, model/colour as available, and upload photos,
            documents, and optional video for admin review.
          </li>
          <li>
            Admin reviews your application. Only after approval can you open the merchant dashboard, create riders, and
            use fleet tools.
          </li>
          <li>
            False identity, forged papers, or misrepresenting bike ownership may lead to rejection or permanent removal
            from the platform.
          </li>
        </ul>

        <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>3. Bikes & fleet records</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>
            Approved bikes become platform records under your merchant account. Keep plates and media up to date when
            admin requests a re-upload.
          </li>
          <li>
            Each active fleet rider should be assigned to one bike. Two riders cannot be assigned to the same bike at the
            same time.
          </li>
          <li>
            You must only list bikes you own or are authorised to operate commercially in Dutse, Kubwa and Bwari.
          </li>
        </ul>

        <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>4. Creating and managing riders</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>
            You may create fleet rider accounts (email, password, assigned bike) after merchant approval. Login details
            must be shared responsibly with the actual rider.
          </li>
          <li>
            You control flags such as: allow taking jobs, suspend rider, block rider withdrawals, and allow merchant
            withdraw from that rider’s available balance.
          </li>
          <li>
            You cannot delete a rider while they have an active job (accepted, live, picked, or pending clearance).
          </li>
          <li>
            Fleet riders remain bound by rider conduct rules (honest status, photo proof, service area). Misconduct by
            your riders may affect your merchant standing.
          </li>
        </ul>

        <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>5. Jobs, service area & conduct</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>
            All {platformName} deliveries are limited to <strong>Dutse, Kubwa and Bwari</strong>. Do not instruct riders
            to take platform jobs outside this corridor.
          </li>
          <li>
            Bargaining and agreed prices work as on the main platform. Suggested price bands are guidance only; final
            price is set through the offer/accept flow or acceptance of the suggested price.
          </li>
          <li>
            WhatsApp and photo tracking remain primary where GPS is weak. You and your riders must not falsify proofs.
          </li>
        </ul>

        <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>6. Money, commission & withdrawals</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>
            <strong>Cash on delivery (COD):</strong> the rider holds the full agreed amount; platform commission is owed
            by the rider (and reflected on fleet stats) until settled through the normal commission process.
          </li>
          <li>
            <strong>Bank transfer:</strong> the customer pays the platform account; commission is already with the
            company and is not “owed” by the rider in the same way.
          </li>
          <li>
            Rider earnings move to <strong>pending clearance</strong> when delivered, then to <strong>available</strong>
            only after admin clearance. Withdrawals follow platform rules (approved bank KYC, no blocking commission
            owed where applicable).
          </li>
          <li>
            If you enable merchant withdraw from a rider, funds leave that rider’s available balance and are paid toward
            your approved merchant bank details after admin processes the request. You must not withdraw from riders who
            still owe commission or without their flag enabled.
          </li>
          <li>
            Outstanding fleet commission or fraud investigations may lead to freezes of riders or your merchant account.
          </li>
        </ul>

        <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>7. Support & messages</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--gray-700)' }}>
          <li>
            You may message platform support (admin), one fleet rider, or all your riders through the support system.
          </li>
          <li>
            Fleet chats with your riders can be closed by you. Tickets to admin support are closed by admin only.
          </li>
          <li>
            Fleet riders may message you or admin; they cannot close tickets. Treat support threads as official records.
          </li>
        </ul>

        <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>8. Data, privacy & documents</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
          You grant {platformName} permission to store and review application data, bike media, and operational stats for
          verification, safety, and settlements. Admin may request re-upload or remove incorrect media. Do not upload
          documents you are not authorised to share. Customer and rider personal data you see must not be used outside
          legitimate delivery operations.
        </p>

        <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>9. Freezes, disputes & termination</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
          Admin may freeze jobs, riders, or your merchant account while investigating complaints, unpaid commission, or
          policy breaches. Evidence includes status history, photos, bank records, and trust scores. Serious or repeated
          violations may result in permanent removal of the merchant account and linked fleet riders from the platform.
          You may stop using {platformName} at any time, subject to clearing outstanding obligations.
        </p>

        <h2 style={{ fontSize: 17, margin: '24px 0 8px' }}>10. Changes to these terms</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--gray-700)' }}>
          {platformName} may update merchant terms as the product evolves. Continued use of the merchant dashboard after
          notice of changes means you accept the updated terms. Material changes will be reflected on this page with an
          updated date.
        </p>

        <div style={{ marginTop: 28, padding: 16, background: 'white', borderRadius: 12, border: '1px solid var(--gray-200)' }}>
          <p style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--gray-700)' }}>
            Ready to put your fleet on {platformName}?
          </p>
          <Link to="/become-a-rider" className="btn btn-primary" style={{ marginRight: 8 }}>
            Apply as fleet owner
          </Link>
          <Link to="/for-riders" className="btn btn-secondary">
            For riders
          </Link>
        </div>

        <p style={{ marginTop: 32, fontSize: 13, color: 'var(--gray-500)' }}>
          Last updated: October 2026 ·{' '}
          <Link to="/terms-riders" style={{ color: 'var(--primary)' }}>
            Rider Terms
          </Link>
          {' · '}
          <Link to="/terms-customers" style={{ color: 'var(--primary)' }}>
            Customer Terms
          </Link>
          {' · '}
          <Link to="/terms" style={{ color: 'var(--primary)' }}>
            General Terms
          </Link>
        </p>
      </div>
    </div>
  );
};

export default TermsMerchants;
