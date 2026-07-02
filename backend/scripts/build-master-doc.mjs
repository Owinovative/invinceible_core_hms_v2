// Assembles docs/master/MASTER_SYSTEM_DOCUMENTATION.md from the canonical
// documentation set: cover, table of contents, all sections with demoted
// headings and rewritten cross-links, glossary, and index.
// Usage: node scripts/build-master-doc.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const docsRoot = join(repoRoot, 'docs');
const outDir = join(docsRoot, 'master');
const outPath = join(outDir, 'MASTER_SYSTEM_DOCUMENTATION.md');

const SECTIONS = [
  ['Part I — Architecture', [
    ['SYSTEM_ARCHITECTURE.md', 'System Architecture'],
    ['BACKEND.md', 'Backend'],
    ['FRONTEND.md', 'Frontend'],
    ['DATABASE.md', 'Database'],
    ['WORKFLOWS.md', 'Clinical & Operational Workflows'],
  ]],
  ['Part II — API', [
    ['API_REFERENCE.md', 'API Reference'],
  ]],
  ['Part III — Security & Access', [
    ['AUTHENTICATION.md', 'Authentication'],
    ['AUTHORIZATION.md', 'Authorization'],
    ['SECURITY.md', 'Security'],
  ]],
  ['Part IV — Integrations', [
    ['INTEGRATIONS.md', 'Integrations Overview'],
    ['integrations/README.md', 'Government Integrations: DHA & KRA eTIMS'],
    ['integrations/etims.md', 'KRA eTIMS Details'],
    ['integrations/dha.md', 'DHA Details'],
    ['integrations/configuration.md', 'Integration Configuration'],
  ]],
  ['Part V — Operations', [
    ['DEPLOYMENT.md', 'Deployment'],
    ['CONFIGURATION.md', 'Configuration Reference'],
    ['MONITORING.md', 'Monitoring & Observability'],
    ['ERROR_HANDLING.md', 'Error Handling'],
    ['PERFORMANCE.md', 'Performance & Scalability'],
  ]],
  ['Part VI — Development & Quality', [
    ['DEVELOPMENT_GUIDE.md', 'Development Guide & Code Quality Report'],
    ['CONTRIBUTING.md', 'Contributing'],
    ['TESTING.md', 'Testing'],
  ]],
  ['Part VII — Product', [
    ['UI_UX_GUIDE.md', 'UI / UX Guide'],
    ['DESIGN_SYSTEM.md', 'Design System'],
    ['ROADMAP.md', 'Roadmap'],
    ['CHANGELOG.md', 'Changelog'],
  ]],
];

const GLOSSARY = `## Glossary

| Term | Definition |
| --- | --- |
| **Branch** | A physical site of a Facility; most records carry facilityId + optional branchId |
| **CU / CU invoice number** | KRA Control Unit identifier assigned to a fiscalized invoice by eTIMS |
| **Daraja** | Safaricom's M-PESA API platform (STK Push = phone payment prompt) |
| **DHA** | Digital Health Agency — Kenya's health information exchange authority |
| **Dead letter** | Queued request whose retry budget is exhausted; requires operator requeue |
| **eTIMS** | KRA electronic Tax Invoice Management System (fiscalization) |
| **Facility** | Tenant: a hospital/clinic organization in the multi-tenant platform |
| **FHIR R4** | HL7 Fast Healthcare Interoperability Resources, release 4 — DHA payload format |
| **Fiscalization** | Registering an invoice with KRA and storing the CU number, signature, and QR |
| **IPD / OPD** | Inpatient / Outpatient departments |
| **KMHFL** | Kenya Master Health Facility List (facility codes) |
| **OSCU / VSCU** | Online / Virtual Sales Control Unit — eTIMS integration device models |
| **OTC sale** | Over-the-counter pharmacy sale without a prescription |
| **PHI** | Protected Health Information |
| **RBAC** | Role-Based Access Control |
| **SHA** | Social Health Authority — Kenya's national health insurer |
| **Step-up** | Re-authentication required for sensitive actions on top of a valid session |
| **STK Push** | SIM Toolkit prompt asking a customer to authorize an M-PESA payment |
| **Tenant scoping** | Automatic restriction of every query/mutation to the caller's facility/branch |
| **Triage** | Nurse-led vitals capture and prioritization before consultation |
`;

const INDEX = `## Index

- **Appointments** — Workflows §2–3; Database (patient journey ER); UI Guide §2
- **Audit logging** — Backend §3; Workflows §19; Security §1; Monitoring §2
- **Authentication / JWT / sessions** — Authentication; API Reference (auth module)
- **Billing / invoices / payments** — Backend §5; Workflows §9–10; Database (billing ER); UI Guide §3
- **Caching** — Performance §2; Backend §4
- **CI/CD** — Deployment §1; Contributing
- **Configuration / environment variables** — Configuration Reference; Integration Configuration
- **CORS / security headers** — Security §1; System Architecture §4
- **Database schema / migrations** — Database
- **DHA** — Integrations; DHA Details; Workflows §16
- **Discharge / admissions** — Workflows §13–14; UI Guide §2
- **eTIMS / fiscalization** — Integrations; KRA eTIMS Details; Workflows §9
- **Error handling** — Error Handling; Workflows §21
- **Health checks** — Monitoring §1; Deployment §6
- **Laboratory** — Workflows §6; UI Guide §2
- **M-PESA** — Integrations §3; Workflows §10; Configuration (payments)
- **Multi-tenancy / scoping** — Authorization §4; System Architecture §1
- **Notifications** — Workflows §17; Frontend §5
- **Patient portal** — Authentication §5; UI Guide §5
- **Permissions / roles** — Authorization §2–3
- **Pharmacy / stock** — Backend §5; Workflows §8, §11; UI Guide §2
- **Queues (background)** — Backend §4, §6; Error Handling §5
- **Rate limiting** — Security §1; Configuration (cache/rate limits)
- **Reports** — Workflows §18; Backend §5; Monitoring §3
- **SHA claims** — Integrations; Workflows §9; UI Guide §3
- **Testing / coverage** — Testing; Development Guide
- **Triage / queue** — Workflows §3–4; UI Guide §2
`;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function demoteHeadings(markdown) {
  // #→##, ##→###, etc. (max depth 6); skip fenced code blocks.
  const lines = markdown.split('\n');
  let inFence = false;
  return lines
    .map((line) => {
      if (/^\s*```/.test(line)) inFence = !inFence;
      if (!inFence && /^#{1,5} /.test(line)) return `#${line}`;
      return line;
    })
    .join('\n');
}

function rewriteLinks(markdown, sectionAnchors, sourceFile) {
  // Resolve each relative link against the included file's own directory,
  // then either point at the in-document anchor (for included docs) or
  // re-relativize it from docs/master/.
  const sourceDir = dirname(join(docsRoot, sourceFile));
  return markdown.replace(
    /\]\((?!https?:\/\/|#|mailto:)([^)]+)\)/g,
    (full, target) => {
      const [pathPart] = target.split('#');
      const absolute = resolve(sourceDir, pathPart);
      const docsRelative = relative(docsRoot, absolute)
        .split(sep)
        .join('/');
      if (sectionAnchors.has(docsRelative)) {
        return `](#${sectionAnchors.get(docsRelative)})`;
      }
      const fromMaster = relative(outDir, absolute).split(sep).join('/');
      return `](${fromMaster})`;
    },
  );
}

const sectionAnchors = new Map();
for (const [, docs] of SECTIONS) {
  for (const [file, title] of docs) {
    sectionAnchors.set(file, slugify(title));
  }
}

const today = new Date().toISOString().slice(0, 10);

let out = `# Invinceible Core HMS
## Complete System Documentation

**Enterprise-grade Hospital Management Information System**
Multi-tenant · NestJS + Next.js + Prisma · KRA eTIMS & DHA ready

| | |
| --- | --- |
| Repository | Owinovative/invinceible_core_hms_v2 |
| Version | 2.x (see Changelog) |
| Generated | ${today} |
| Audience | Enterprise clients · Hospital administrators · Developers · DevOps · Architects · Auditors · Certification bodies · Investors |
| Source of truth | The repository code; regenerate via \`node backend/scripts/build-master-doc.mjs\` |

---

## Table of Contents

`;

let partNumber = 0;
for (const [part, docs] of SECTIONS) {
  out += `**${part}**\n\n`;
  for (const [file, title] of docs) {
    out += `- [${title}](#${sectionAnchors.get(file)})\n`;
  }
  out += '\n';
  partNumber += 1;
}
out += `**Appendices**\n\n- [Glossary](#glossary)\n- [Index](#index)\n\n---\n\n`;

for (const [part, docs] of SECTIONS) {
  out += `# ${part}\n\n`;
  for (const [file, title] of docs) {
    const raw = readFileSync(join(docsRoot, file), 'utf8');
    // Drop the doc's own H1 (replaced by our section heading).
    const withoutH1 = raw.replace(/^# .*\n+/, '');
    out += `## ${title}\n\n`;
    out += rewriteLinks(demoteHeadings(withoutH1), sectionAnchors, file);
    out += '\n\n---\n\n';
  }
}

out += `# Appendices\n\n${GLOSSARY}\n\n${INDEX}\n`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, out, 'utf8');
console.log(`Wrote ${outPath} (${Math.round(out.length / 1024)} KB)`);
