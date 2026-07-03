import {
  Activity, Ambulance, Baby, BedDouble, BriefcaseBusiness, CalendarPlus,
  Clock3, CreditCard, Dumbbell, FileCheck2, FlaskConical, HeartPulse,
  LayoutDashboard, Microscope, Monitor, Pill, Plus, Receipt, ScanLine,
  Settings, ShieldCheck, ShoppingCart, Sparkles, Stethoscope, Truck,
  UserPlus, Users, Warehouse, Network, Link2, type LucideIcon,
} from "lucide-react";

/**
 * Single navigation registry for the sidebar, command palette, and
 * breadcrumbs. `module` drives the per-family accent (data-module).
 */
export type ModuleFamily =
  | "clinical"
  | "diagnostics"
  | "pharmacy"
  | "finance"
  | "inpatient"
  | "operations"
  | "admin";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  keywords?: string[];
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  allowedRoles?: string[];
};

export type NavSection = {
  label: string;
  module: ModuleFamily;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    label: "Workspace",
    module: "clinical",
    items: [
      { title: "Command Center", href: "/dashboard", icon: LayoutDashboard, keywords: ["home", "overview"] },
      { title: "AI Assistant", href: "/ai-assistant", icon: Sparkles, keywords: ["gemini", "help"] },
      { title: "Patients", href: "/patients", icon: Users, keywords: ["register", "records"] },
      { title: "Appointments", href: "/appointments", icon: CalendarPlus, keywords: ["booking", "schedule"] },
      { title: "Active Queue", href: "/queue", icon: Clock3, keywords: ["waiting", "checked in"] },
    ],
  },
  {
    label: "Medical Care",
    module: "clinical",
    items: [
      { title: "Consultations", href: "/consultation", icon: Stethoscope, keywords: ["doctor", "encounter"] },
      { title: "Triage & Vitals", href: "/triage", icon: HeartPulse, keywords: ["vitals", "nurse"] },
      { title: "OPD Clinics", href: "/opd-clinics", icon: UserPlus },
      { title: "Admissions (IPD)", href: "/ipd", icon: BedDouble, keywords: ["wards", "beds", "inpatient"] },
      { title: "Emergency", href: "/emergency", icon: Ambulance },
      { title: "Theatre", href: "/theatre", icon: Activity, keywords: ["surgery"] },
      { title: "Maternity", href: "/maternity", icon: Baby },
    ],
  },
  {
    label: "Diagnostics",
    module: "diagnostics",
    items: [
      { title: "Laboratory", href: "/lab", icon: FlaskConical, keywords: ["tests", "results"] },
      { title: "Radiology", href: "/radiology", icon: Monitor, keywords: ["imaging", "xray"] },
      { title: "Blood Bank", href: "/blood-bank", icon: ScanLine },
    ],
  },
  {
    label: "Pharmacy & Inventory",
    module: "pharmacy",
    items: [
      { title: "Dispensing", href: "/pharmacy", icon: Pill, keywords: ["prescriptions", "medicines"] },
      { title: "OTC Sales", href: "/pharmacy/otc-sales", icon: ShoppingCart, keywords: ["walk-in", "sale"] },
      { title: "Branch Stock", href: "/pharmacy-stock", icon: Warehouse, keywords: ["inventory"] },
      { title: "Procurement", href: "/procurement", icon: Truck, keywords: ["purchase", "supplies"] },
    ],
  },
  {
    label: "Revenue Cycle",
    module: "finance",
    items: [
      { title: "Billing & Cashier", href: "/billing", icon: CreditCard, keywords: ["payments", "mpesa", "cash"] },
      { title: "Invoices", href: "/invoices", icon: Receipt },
      { title: "Insurance & Claims", href: "/insurance", icon: ShieldCheck, keywords: ["sha", "claims"] },
    ],
  },
  {
    label: "Specialties",
    module: "operations",
    items: [
      { title: "Dental", href: "/dental", icon: Microscope },
      { title: "Physiotherapy", href: "/physiotherapy", icon: Dumbbell },
      { title: "Oncology", href: "/oncology", icon: Activity },
      { title: "Renal / Dialysis", href: "/renal-dialysis", icon: HeartPulse },
      { title: "Mental Health", href: "/mental-health", icon: HeartPulse },
    ],
  },
  {
    label: "Integrations",
    module: "operations",
    items: [
      { title: "Integration Hub", href: "/integration", icon: Network, keywords: ["dha", "sha", "kra", "api"] },
      { title: "Sync Status", href: "/integration/sync", icon: Link2, keywords: ["sync", "errors"] },
    ],
  },
  {
    label: "System",
    module: "admin",
    items: [
      { title: "Medical Records", href: "/medical-records", icon: FileCheck2 },
      { title: "Analytics & Reports", href: "/reports", icon: Activity, keywords: ["dashboard", "export"] },
      { title: "Human Resources", href: "/hr", icon: BriefcaseBusiness },
      { title: "Settings", href: "/settings", icon: Settings, adminOnly: true },
      { title: "Platform Control", href: "/platform", icon: ShieldCheck, superAdminOnly: true },
    ],
  },
];

export const quickActions: NavItem[] = [
  { title: "New Patient", href: "/patients/new", icon: UserPlus },
  { title: "New Appointment", href: "/appointments/new", icon: CalendarPlus },
  { title: "New Invoice", href: "/billing/invoices", icon: Plus },
];

export function visibleNavSections(roleCode: string): NavSection[] {
  const canManageSettings = ["SUPER_ADMIN", "ADMIN", "FACILITY_ADMIN"].includes(
    roleCode,
  );
  const isSuperAdmin = roleCode === "SUPER_ADMIN";

  return navSections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => !item.adminOnly || canManageSettings)
        .filter((item) => !item.superAdminOnly || isSuperAdmin)
        .filter(
          (item) => !item.allowedRoles || item.allowedRoles.includes(roleCode),
        ),
    }))
    .filter((section) => section.items.length > 0);
}

/** Module family for the current pathname (drives data-module accents). */
export function moduleForPath(pathname: string): ModuleFamily {
  for (const section of navSections) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return section.module;
      }
    }
  }
  return "clinical";
}
