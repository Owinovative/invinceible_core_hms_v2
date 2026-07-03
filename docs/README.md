# Invinceible Core HMS — Documentation

Enterprise documentation for the complete Hospital Management Information
System, reverse-engineered from the repository as the single source of
truth. Start here.

## 📘 Master document

- [Master System Documentation](master/MASTER_SYSTEM_DOCUMENTATION.md) —
  single consolidated document (also exported as
  [PDF](master/Invinceible-Core-HMS-System-Documentation.pdf))

## 🏗 Architecture & code

| Document | Contents |
| --- | --- |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | Overall/runtime/deployment architecture, request lifecycle, module graph, conventions |
| [BACKEND.md](BACKEND.md) | 44 NestJS modules, layering, middleware/guards, resilience, business rules |
| [FRONTEND.md](FRONTEND.md) | Next.js app, routing (94 pages), components, state management |
| [DATABASE.md](DATABASE.md) | 57 models, ER diagrams, indexes, migrations, entity lifecycles |
| [API_REFERENCE.md](API_REFERENCE.md) | **Auto-generated** — 47 controllers, 341 endpoints with auth + DTOs |
| [WORKFLOWS.md](WORKFLOWS.md) | 21 clinical & operational flowcharts |

## 🔐 Security & access

| Document | Contents |
| --- | --- |
| [AUTHENTICATION.md](AUTHENTICATION.md) | Login, JWT, sessions, lockouts, step-up, resets |
| [AUTHORIZATION.md](AUTHORIZATION.md) | RBAC, permission matrix, tenant scoping |
| [SECURITY.md](SECURITY.md) | Threat model, hardening, recommendations |

## 🔌 Integrations

| Document | Contents |
| --- | --- |
| [INTEGRATIONS.md](INTEGRATIONS.md) | All external systems, status, sequence diagrams, extension recipe |
| [integrations/](integrations/README.md) | Deep dive: KRA eTIMS & DHA (architecture, config, testing, deployment, troubleshooting) |

## ⚙️ Operations

| Document | Contents |
| --- | --- |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Render/Vercel pipeline, scaling, backups, DR |
| [CONFIGURATION.md](CONFIGURATION.md) | Every environment variable |
| [MONITORING.md](MONITORING.md) | Health, logging, dashboards, alerting |
| [ERROR_HANDLING.md](ERROR_HANDLING.md) | Error pipeline, status codes, failure isolation |
| [PERFORMANCE.md](PERFORMANCE.md) | Caching, indexes, load testing, bottlenecks |

## 👩‍💻 Development

| Document | Contents |
| --- | --- |
| [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) | Setup, conventions, feature recipe, **code quality report** |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Engineering rules, workflow, quality gates |
| [TESTING.md](TESTING.md) | Test landscape, strategy, mocks, coverage |

## 🎨 Product & UI

| Document | Contents |
| --- | --- |
| [UI_UX_GUIDE.md](UI_UX_GUIDE.md) | Every major screen: purpose, roles, actions, screenshot plan |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Tokens, shadcn primitives, composition patterns |
| [ROADMAP.md](ROADMAP.md) | Consolidated forward plan |
| [CHANGELOG.md](CHANGELOG.md) | Release history summary |

## 📚 Topic guides (deep dives)

<details>
<summary>Operations & platform</summary>

- [Render production deployment](deployment/render.md) ·
  [MySQL → PostgreSQL migration](deployment/mysql-to-render-postgres.md)
- [Operations alerting](operations-alerting.md) ·
  [Operations dashboard](operations-dashboard.md) ·
  [Logging & observability](logging-observability.md)
- [Performance & scalability](performance-scalability.md) ·
  [Load testing](load-testing.md) ·
  [High availability](high-availability-architecture.md)
- [Database storage efficiency](database-storage-efficiency.md) ·
  [Feature flags](feature-flags.md) ·
  [Release checklist](release-checklist.md) ·
  [Release notes v2.0.0](releases/v2.0.0.md)

</details>

<details>
<summary>Security & compliance</summary>

- [Production security checklist](production-security-checklist.md) ·
  [Security monitoring](security-monitoring.md) ·
  [Security testing](security-testing.md)
- [Roles & permissions matrix](roles-permissions-matrix.md) ·
  [Multi-tenant facility isolation](multi-tenant-facility-isolation.md)
- [Data privacy & consent](data-privacy-consent.md) ·
  [AI assistant safety](ai-assistant-safety.md)

</details>

<details>
<summary>Clinical & financial workflows</summary>

- [Clinical workflow](clinical-workflow.md) ·
  [Clinical decision support](clinical-decision-support.md) ·
  [Lab quality controls](lab-quality-controls.md)
- [Prescriptions & pharmacy](prescriptions-pharmacy.md) ·
  [Pharmacy stock safety](pharmacy-stock-safety.md)
- [SHA & insurance workflow](sha-insurance-workflow.md) ·
  [M-Pesa reconciliation](mpesa-reconciliation.md) ·
  [Payments notes](payments/)
- [Reports & printouts](reports-printouts.md) ·
  [Reporting & BI](reporting-bi.md) ·
  [PDF printout audit](pdf-printout-audit.md) ·
  [Data warehouse plan](data-warehouse-plan.md)
- [Patient portal](patient-portal.md) ·
  [Communication notifications](communication-notifications.md) ·
  [Mobile & tablet readiness](mobile-tablet-readiness.md)
- [HMS benchmark gap analysis](hms-benchmark-gap-analysis.md) ·
  [Repository audit](repository-audit.md)

</details>
