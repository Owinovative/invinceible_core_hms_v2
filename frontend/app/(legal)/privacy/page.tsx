import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Invinceible Core HMS",
  description: "Privacy Policy for Invinceible Core Hospital Management System",
};

const PRIVACY_TOC = [
  { id: "introduction", title: "1. Introduction", level: 2 },
  { id: "data-collection", title: "2. Information We Collect", level: 2 },
  { id: "data-usage", title: "3. How We Use Your Data", level: 2 },
  { id: "data-sharing", title: "4. Data Sharing & Third Parties", level: 2 },
  { id: "data-security", title: "5. Data Security", level: 2 },
  { id: "patient-rights", title: "6. Data Subject Rights", level: 2 },
  { id: "cookies", title: "7. Cookies & Tracking", level: 2 },
  { id: "contact", title: "8. Contact Information", level: 2 },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="January 15, 2026"
      version="1.0.0"
      toc={PRIVACY_TOC}
    >
      <p className="lead text-lg text-muted-foreground">
        Invinceible Core Software Firm (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting the privacy and security of your personal data and sensitive health data. This Privacy Policy outlines our practices in compliance with the Kenya Data Protection Act, 2019.
      </p>

      <h2 id="introduction">1. Introduction</h2>
      <p>
        This Privacy Policy applies to all users (hospital staff, administrators, and healthcare professionals) accessing the Invinceible Core HMS (&ldquo;the System&rdquo;). It details how we act as both a Data Controller (for your account information) and a Data Processor (for the patient health records managed by your facility).
      </p>

      <h2 id="data-collection">2. Information We Collect</h2>
      <p>We collect and process the following categories of data:</p>
      <ul>
        <li><strong>User Account Data:</strong> Names, email addresses, phone numbers, job titles, and facility affiliations of staff members accessing the System.</li>
        <li><strong>Technical & Audit Data:</strong> IP addresses, browser types, device information, geolocation data, and detailed audit logs of all actions performed within the System (e.g., viewing, creating, or modifying records).</li>
        <li><strong>Patient Health Data (Processed on behalf of the Facility):</strong> Sensitive personal data including medical history, diagnoses, triage vitals, lab results, prescriptions, and billing information. As a Data Processor, we only process this data based on the instructions of the healthcare facility (the Data Controller).</li>
      </ul>

      <h2 id="data-usage">3. How We Use Your Data</h2>
      <p>We use the collected information for the following purposes:</p>
      <ul>
        <li>To authenticate users and enforce Role-Based Access Control (RBAC).</li>
        <li>To provide, maintain, and secure the System and its features.</li>
        <li>To generate immutable audit trails required for legal, clinical safety, and compliance purposes.</li>
        <li>To facilitate interoperability and integration with required national systems such as the Social Health Authority (SHA) and future KRA eTIMS implementations.</li>
      </ul>

      <h2 id="data-sharing">4. Data Sharing & Third Parties</h2>
      <p>We do not sell or rent personal or medical data to third parties. Data may be shared strictly under the following circumstances:</p>
      <ul>
        <li><strong>Statutory & Regulatory Bodies:</strong> Secure transmission of claims and eligibility data to the SHA, or financial data to the KRA, as configured by the Facility.</li>
        <li><strong>Cloud Infrastructure Providers:</strong> Data is hosted on secure, compliant cloud infrastructure providers who are legally bound by strict data processing agreements.</li>
        <li><strong>Legal Obligations:</strong> If required by a valid court order or statutory requirement from the Office of the Data Protection Commissioner (ODPC) or Ministry of Health.</li>
      </ul>

      <h2 id="data-security">5. Data Security</h2>
      <p>
        Protecting sensitive health data is our highest priority. We implement enterprise-grade security measures including:
      </p>
      <ul>
        <li>Encryption of data in transit (TLS 1.3) and at rest (AES-256).</li>
        <li>Strict authentication protocols and session management.</li>
        <li>Comprehensive audit logging of all system interactions.</li>
        <li>Regular automated backups stored in geographically redundant, secure locations.</li>
      </ul>

      <h2 id="patient-rights">6. Data Subject Rights</h2>
      <p>
        Under the Kenya Data Protection Act, 2019, individuals have the right to be informed, access, correct, delete, or restrict the processing of their personal data. 
      </p>
      <p>
        For <strong>Hospital Staff</strong>: You may exercise your rights by contacting your Facility Administrator or our support team. <br/>
        For <strong>Patients</strong>: The Healthcare Facility acts as the Data Controller. Patients seeking to exercise their data rights regarding medical records must contact the Facility directly. We will assist the Facility in fulfilling these requests.
      </p>

      <h2 id="cookies">7. Cookies & Tracking</h2>
      <p>
        We use essential cookies and similar technologies necessary for the functioning of the System, such as maintaining active login sessions and storing security tokens. We do not use third-party tracking cookies for marketing purposes within the clinical application.
      </p>

      <h2 id="contact">8. Contact Information</h2>
      <p>
        If you have any questions or concerns regarding this Privacy Policy or our data processing practices, please contact our Data Protection Officer at:
      </p>
      <p>
        <strong>Email:</strong> dpo@invinceiblecore.com<br/>
        <strong>Address:</strong> Invinceible Core Software Firm, Nairobi, Kenya.
      </p>
    </LegalPageLayout>
  );
}
