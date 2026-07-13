import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | Invinceible Core HMS",
  description: "Terms of Use for Invinceible Core Hospital Management System",
};

const TERMS_TOC = [
  { id: "acceptance", title: "1. Acceptance of Terms", level: 2 },
  { id: "description", title: "2. Description of Service", level: 2 },
  { id: "dpa-dha", title: "3. Compliance with Kenyan Law", level: 2 },
  { id: "user-obligations", title: "4. User Obligations & Confidentiality", level: 2 },
  { id: "access-security", title: "5. Access and Security", level: 2 },
  { id: "sha-integration", title: "6. SHA & Third-Party Integrations", level: 2 },
  { id: "data-retention", title: "7. Data Retention & Backups", level: 2 },
  { id: "intellectual-property", title: "8. Intellectual Property", level: 2 },
  { id: "limitation", title: "9. Limitation of Liability", level: 2 },
  { id: "termination", title: "10. Termination", level: 2 },
];

export default function TermsOfUsePage() {
  return (
    <LegalPageLayout
      title="Terms of Use"
      lastUpdated="January 15, 2026"
      version="1.0.0"
      toc={TERMS_TOC}
    >
      <p className="lead text-lg text-muted-foreground">
        Welcome to Invinceible Core HMS (&ldquo;the System&rdquo;). These Terms of Use govern your access to and use of our Hospital Management Information System, tailored for healthcare facilities in the Republic of Kenya.
      </p>

      <h2 id="acceptance">1. Acceptance of Terms</h2>
      <p>
        By accessing or using Invinceible Core HMS, you (&ldquo;the User&rdquo; or &ldquo;the Facility&rdquo;) agree to be bound by these Terms of Use and our Privacy Policy. If you are accepting these terms on behalf of a hospital, clinic, or other legal entity, you represent that you have the authority to bind such entity to these terms.
      </p>

      <h2 id="description">2. Description of Service</h2>
      <p>
        Invinceible Core HMS is a cloud-hosted software-as-a-service (SaaS) platform designed to manage hospital operations including but not limited to patient registration, triage, consultations, pharmacy, laboratory, inpatient departments (IPD), billing, and integration with external platforms such as the Social Health Authority (SHA) and future KRA eTIMS implementations.
      </p>

      <h2 id="dpa-dha">3. Compliance with Kenyan Law</h2>
      <p>
        The System is designed to comply with the legal frameworks of the Republic of Kenya, specifically:
      </p>
      <ul>
        <li><strong>The Data Protection Act, 2019:</strong> Governing the collection, processing, and storage of personal and sensitive personal data (health data).</li>
        <li><strong>The Digital Health Act, 2023:</strong> Mandating the secure interoperability, confidentiality, and electronic medical record standards within the healthcare ecosystem.</li>
        <li><strong>The Health Act, 2017:</strong> Ensuring patient rights, confidentiality, and quality of care.</li>
      </ul>

      <h2 id="user-obligations">4. User Obligations & Medical Confidentiality</h2>
      <p>
        As a healthcare professional or administrative staff using the System, you agree to:
      </p>
      <ul>
        <li>Maintain strict medical confidentiality regarding all patient records accessed through the System.</li>
        <li>Only access patient data that is strictly necessary for the performance of your duties (Principle of Data Minimization).</li>
        <li>Obtain and record appropriate patient consent before processing sensitive personal health data, as required by the Data Protection Act.</li>
        <li>Never share, export, or print electronic medical records (EMR) for unauthorized purposes.</li>
      </ul>

      <h2 id="access-security">5. Access, Security, & Role-Based Access Control (RBAC)</h2>
      <p>
        Access to the System is governed by Role-Based Access Control (RBAC). 
      </p>
      <p>
        <strong>Credentials:</strong> You are responsible for safeguarding your login credentials. You must not share your account details with any other person. <br/>
        <strong>Audit Logging:</strong> Every action taken within the System, including viewing, editing, and deleting patient records, is securely logged in an immutable audit trail, recording your User ID, Timestamp, IP Address, and the changes made. These logs may be used in compliance audits or legal proceedings.
      </p>

      <h2 id="sha-integration">6. SHA, API Interoperability & Third-Party Integrations</h2>
      <p>
        The System integrates with external APIs, including the Social Health Authority (SHA) for claims management and eligibility checks.
      </p>
      <ul>
        <li><strong>Facility Credentials:</strong> The Facility is responsible for providing valid integration credentials (e.g., DHA Client ID/Secret, eTIMS keys).</li>
        <li><strong>Data Transmission:</strong> The System securely transmits data to these third parties over encrypted channels (HTTPS/TLS). We are not responsible for the availability or processing accuracy of third-party systems.</li>
      </ul>

      <h2 id="data-retention">7. Data Retention, Backups, and Disaster Recovery</h2>
      <p>
        We employ robust cloud hosting infrastructure with automated backups and disaster recovery protocols. Patient health data is retained in accordance with the statutory requirements set forth by the Ministry of Health and the Data Protection Commissioner. Upon termination of service, data extraction and handover processes will be conducted in compliance with the DPA 2019.
      </p>

      <h2 id="intellectual-property">8. Intellectual Property</h2>
      <p>
        Invinceible Core Software Firm retains all rights, title, and interest in and to the System, including its source code, design, and architecture. The Facility retains all rights to its patient and operational data entered into the System.
      </p>

      <h2 id="limitation">9. Limitation of Liability</h2>
      <p>
        While we strive for 99.9% uptime and clinical safety, Invinceible Core HMS is an administrative tool. It does not replace professional medical judgment. We shall not be liable for any direct or indirect damages, medical malpractice claims, or loss of profits arising from the use or inability to use the System.
      </p>

      <h2 id="termination">10. Termination</h2>
      <p>
        We reserve the right to suspend or terminate access to the System immediately if a User or Facility breaches these Terms, particularly concerning data privacy violations, unauthorized access, or failure to remit subscription fees.
      </p>
    </LegalPageLayout>
  );
}
