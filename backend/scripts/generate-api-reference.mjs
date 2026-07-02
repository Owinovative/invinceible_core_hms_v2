// Generates docs/API_REFERENCE.md by statically scanning every NestJS
// controller for routes, guards, permissions, roles, and request DTOs.
// Usage: node scripts/generate-api-reference.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = join(backendRoot, 'src');
const outputPath = resolve(backendRoot, '..', 'docs', 'API_REFERENCE.md');

const HTTP_DECORATORS = ['Get', 'Post', 'Patch', 'Put', 'Delete'];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (entry.endsWith('.controller.ts')) files.push(full);
  }
  return files;
}

function extractDecoratorArg(text) {
  const match = text.match(/\(\s*'([^']*)'\s*\)/);
  return match ? match[1] : '';
}

function parseControllers(source, filePath) {
  const controllers = [];
  // Split on @Controller decorators; each chunk (after the first) is a class.
  const parts = source.split(/@Controller\(/).slice(1);
  let searchFrom = 0;
  for (const part of parts) {
    const controllerStart = source.indexOf('@Controller(', searchFrom);
    searchFrom = controllerStart + 1;
    const prefixMatch = part.match(/^\s*'([^']*)'/);
    const prefix = prefixMatch ? prefixMatch[1] : '';
    const classMatch = part.match(/export class (\w+)/);
    const className = classMatch ? classMatch[1] : 'UnknownController';
    const headSection = part.slice(0, part.indexOf('export class'));
    const classGuards = [...headSection.matchAll(/@UseGuards\((.*)\)/g)]
      .map((m) => m[1])
      .join(', ');

    // Body of this controller: from class declaration to the next
    // @Controller or end of file.
    const bodyStart = part.indexOf('export class');
    const nextController = part.indexOf('@Controller(', bodyStart);
    const body =
      nextController === -1
        ? part.slice(bodyStart)
        : part.slice(bodyStart, nextController);

    // Routes: in this codebase auth decorators (@UseGuards/@Roles/
    // @Permissions/@StepUpRequired) follow the HTTP verb decorator, so for
    // each verb we scan forward to the method signature and read the
    // decorators in between.
    const routes = [];
    const httpRegex = new RegExp(
      `@(${HTTP_DECORATORS.join('|')})\\((?:\\s*'([^']*)')?`,
      'g',
    );
    for (const httpMatch of body.matchAll(httpRegex)) {
      const tail = body.slice(
        httpMatch.index,
        httpMatch.index + 1_200,
      );
      // Method name: first identifier( that is not a decorator call.
      const nameMatch = tail.match(/\)\s*\r?\n\s*(?:async\s+)?(\w+)\s*\(/);
      const decoratorRegion = nameMatch
        ? tail.slice(0, nameMatch.index + 1)
        : tail;
      let signatureRegion = nameMatch ? tail.slice(nameMatch.index) : tail;
      // Limit the DTO search to this method's parameter list: stop where
      // the method body opens (`) {` or `): ReturnType {`).
      const bodyOpen = signatureRegion.search(/\)\s*(?::[^{]+)?\{/);
      if (bodyOpen !== -1) {
        signatureRegion = signatureRegion.slice(0, bodyOpen + 1);
      }

      const permissions = [
        ...decoratorRegion.matchAll(/@Permissions\(([^)]*)\)/g),
      ].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
      const roles = [
        ...decoratorRegion.matchAll(/@Roles\(([^)]*)\)/g),
      ].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
      const guards = [
        ...decoratorRegion.matchAll(/@UseGuards\((.*)\)/g),
      ].map((m) => m[1]);
      const stepUp = /@StepUpRequired\(/.test(decoratorRegion);
      const dtoMatch = signatureRegion.match(
        /@Body\(\)\s*\w+:\s*([\w[\]<>]+)/,
      );

      routes.push({
        method: httpMatch[1].toUpperCase(),
        path: httpMatch[2] ?? '',
        handler: nameMatch ? nameMatch[1] : '',
        permissions,
        roles,
        guards,
        stepUp,
        bodyDto: dtoMatch ? dtoMatch[1] : '',
      });
    }

    controllers.push({
      className,
      prefix,
      classGuards,
      routes,
      file: relative(backendRoot, filePath).split(sep).join('/'),
    });
  }
  return controllers;
}

function fullPath(prefix, path) {
  const joined = ['', prefix, path].join('/').replace(/\/+/g, '/');
  return joined === '' ? '/' : joined.replace(/\/$/, '') || '/';
}

function moduleName(file) {
  const parts = file.split('/');
  const name = parts[1] === 'src' ? parts[2] : parts[1];
  return name.endsWith('.ts') ? 'app-root' : name;
}

const controllerFiles = walk(srcRoot).sort();
const allControllers = controllerFiles.flatMap((file) =>
  parseControllers(readFileSync(file, 'utf8'), file),
);

const byModule = new Map();
for (const controller of allControllers) {
  const mod = moduleName(controller.file);
  if (!byModule.has(mod)) byModule.set(mod, []);
  byModule.get(mod).push(controller);
}

const totalRoutes = allControllers.reduce(
  (sum, c) => sum + c.routes.length,
  0,
);

let md = `# API Reference

> Auto-generated from the NestJS controllers by
> \`backend/scripts/generate-api-reference.mjs\`. Regenerate after adding or
> changing routes: \`cd backend && node scripts/generate-api-reference.mjs\`.

**${allControllers.length} controllers · ${totalRoutes} endpoints**

## Conventions

- **Base URL**: the backend service root (e.g. \`http://localhost:3000\`).
- **Authentication**: routes guarded by \`AuthGuard('jwt')\` require
  \`Authorization: Bearer <access token>\` obtained from \`POST /auth/login\`.
  Controllers with no auth guard are public (webhooks, health, verification).
- **Authorization**: \`Permissions\` values are enforced by
  \`PermissionsGuard\` from the role→permission matrix in
  \`backend/src/auth/permissions.ts\`; \`Roles\` values by \`RolesGuard\`.
  \`Step-up\` marks routes requiring recent re-authentication
  (\`StepUpGuard\`).
- **Validation**: request bodies are validated by the global
  \`ValidationPipe\` (\`whitelist\`, \`forbidNonWhitelisted\`, \`transform\`)
  against the DTO listed per route (see \`dto/\` folder of each module).
- **Errors**: failures return the standard envelope produced by the global
  exception filter — \`{ statusCode, message, error }\` with appropriate
  HTTP status (400 validation, 401 unauthenticated, 403 forbidden,
  404 not found, 409/422 domain conflicts, 429 rate limited, 500 internal).
- **Correlation**: every response carries \`X-Request-Id\`; clients may
  supply their own via \`X-Request-Id\`/\`X-Correlation-Id\`.

## Endpoint index by module

`;

const sortedModules = [...byModule.keys()].sort();
for (const mod of sortedModules) {
  md += `- [${mod}](#module-${mod.replace(/[^a-z0-9-]/g, '')})\n`;
}
md += '\n';

for (const mod of sortedModules) {
  md += `## Module: ${mod}\n\n`;
  for (const controller of byModule.get(mod)) {
    md += `### ${controller.className}\n\n`;
    md += `Source: \`${controller.file}\``;
    if (controller.classGuards) {
      md += ` · Class guards: \`${controller.classGuards}\``;
    } else {
      md += ` · **Public (no class-level auth guard)**`;
    }
    md += '\n\n';
    if (controller.routes.length === 0) {
      md += '_No routes._\n\n';
      continue;
    }
    md +=
      '| Method | Path | Handler | Authorization | Request body (DTO) |\n' +
      '| --- | --- | --- | --- | --- |\n';
    for (const route of controller.routes) {
      const auth = [
        route.permissions.map((p) => `\`${p}\``).join(', '),
        route.roles.length ? `roles: ${route.roles.join(', ')}` : '',
        route.stepUp ? 'step-up' : '',
        route.guards.length ? `guards: ${route.guards.join('; ')}` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      md += `| ${route.method} | \`${fullPath(controller.prefix, route.path)}\` | ${route.handler} | ${auth || '–'} | ${route.bodyDto ? `\`${route.bodyDto}\`` : '–'} |\n`;
    }
    md += '\n';
  }
}

md += `## Key sequence diagrams

### Login and authenticated request

\`\`\`mermaid
sequenceDiagram
    participant C as Client (Next.js)
    participant A as POST /auth/login
    participant G as AuthGuard('jwt') + PermissionsGuard
    participant S as Domain service
    C->>A: { username, password }
    A->>A: bcrypt verify + lockout check + single-session version
    A-->>C: { accessToken (JWT), user, role, permissions }
    C->>G: GET /patients (Authorization: Bearer)
    G->>G: verify JWT, load session version, check permission
    G->>S: request user context (facility/branch scope)
    S-->>C: scoped data
\`\`\`

### M-PESA STK payment

\`\`\`mermaid
sequenceDiagram
    participant UI as Billing UI
    participant B as POST /billing/payments/mpesa/request
    participant D as Safaricom Daraja
    participant CB as POST /billing/payments/mpesa/callback (public)
    UI->>B: { invoiceId, phoneNumber, amount }
    B->>D: OAuth + STK push
    D-->>B: CheckoutRequestID
    B-->>UI: pending payment record
    D->>CB: async result callback
    CB->>CB: confirm/fail payment, recalculate invoice
    CB->>CB: trigger eTIMS fiscalization (queued)
    UI->>B: GET /billing/payments/mpesa/status/:checkoutRequestId
    B-->>UI: COMPLETED / FAILED
\`\`\`

### Fiscalized billing event (eTIMS)

\`\`\`mermaid
sequenceDiagram
    participant B as BillingService
    participant E as EtimsService
    participant Q as integration_outbound_requests
    participant W as IntegrationQueueWorker
    participant K as KRA eTIMS (mock/sandbox/production)
    B->>E: onBillingFinalized(invoiceId)
    E->>Q: create fiscal doc + enqueue (idempotent)
    W->>Q: claim due request
    W->>K: saveTrnsSalesOsdc
    K-->>W: CU invoice number + receipt signature
    W->>E: store CU data + QR, status ACCEPTED
\`\`\`
`;

writeFileSync(outputPath, md, 'utf8');
console.log(
  `Wrote ${outputPath}: ${allControllers.length} controllers, ${totalRoutes} routes`,
);
