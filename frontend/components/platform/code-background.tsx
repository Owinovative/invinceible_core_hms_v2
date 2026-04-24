"use client";

const CODE_STRIPS = [
  `const scope = buildReadScope(user)\nif (!scope.facilityId) return null\nawait prisma.notification.findMany({ where: scope })`,
  `export async function createClinic(payload) {\n  return apiFetch("/clinics", {\n    method: "POST",\n    body: JSON.stringify(payload),\n  })\n}`,
  `model Patient {\n  id Int @id @default(autoincrement())\n  patientNumber String @unique\n  firstName String\n  lastName String\n}`,
  `@UseGuards(AuthGuard("jwt"))\n@Controller("notifications")\nexport class NotificationController {\n  @Get("stats")\n  getStats() {}\n}`,
  `function resolveNotification(id, payload) {\n  return apiFetch(\`/notifications/\${id}/resolve\`, {\n    method: "PATCH",\n    body: JSON.stringify(payload),\n  })\n}`,
  `SELECT *\nFROM notifications\nWHERE isResolved = false\nORDER BY id DESC;`,
  `const dashboard = {\n  healthScore: 100,\n  pendingLabQueue: 0,\n  unresolvedWarnings: 0,\n}`,
  `if (user.roleCode === "SUPER_ADMIN") {\n  router.push("/platform")\n}`,
  `await audit.write({\n  actor: user.id,\n  action: "SCOPE_CHANGE",\n  status: "locked"\n})`,
  `health.checks = [\n  "auth.jwt",\n  "db.prisma",\n  "alerts.queue",\n  "cors.origin"\n]`,
  `type Permission =\n  | "patients.read"\n  | "billing.write"\n  | "platform.root";`,
];

export function CodeBackground() {
  return (
    <>
      <div className="code-grid-bg" />
      <div className="code-rain">
        {CODE_STRIPS.map((text, index) => (
          <div
            key={index}
            className={`code-column ${index % 2 === 0 ? "alt" : ""}`}
            style={{
              left: `${6 + index * 12}%`,
              animationDuration: `${18 + index * 1.7}s`,
              animationDelay: `${index * -2.2}s`,
            }}
          >
            {text}
          </div>
        ))}
      </div>
    </>
  );
}
