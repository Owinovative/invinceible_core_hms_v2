import { expect, test, type Page, type Route } from "@playwright/test";

const user = {
  id: 1,
  userId: 1,
  username: "broadway-admin",
  fullName: "Broadway Demonstration Administrator",
  isActive: true,
  role: { id: 1, code: "SUPER_ADMIN", name: "Super Administrator" },
  roleCode: "SUPER_ADMIN",
  homeFacilityId: 1,
  homeFacilityName: "Broadway Demonstration Hospital",
  homeBranchId: 1,
  homeBranchName: "Main Branch",
  canAccessAllBranchesInFacility: false,
  allowedBranchIds: [1],
  allowedBranches: [
    {
      id: 1,
      name: "Main Branch",
      code: "MAIN",
      facilityId: 1,
    },
  ],
  staffId: 1,
};

const inventoryDashboard = {
  filters: { nearExpiryDays: 90, deadStockDays: 180 },
  summary: {
    locations: 0,
    activeBatches: 0,
    expiredBatches: 0,
    nearExpiryBatches: 0,
    deadStockItems: 0,
  },
  expired: [],
  nearExpiry: [],
  deadStock: [],
};

const demoPatient = {
  id: 5,
  patientNumber: "BWAY-0005",
  firstName: "Amina",
  lastName: "Demo",
};

const pharmacyLocation = {
  id: 10,
  facilityId: 1,
  branchId: 1,
  code: "MAIN",
  name: "Main Pharmacy",
  locationType: "MAIN",
};

const medicineBatch = {
  id: 99,
  batchNumber: "BATCH-DEMO",
  expiresAt: "2027-12-31T00:00:00.000Z",
  quantityAvailable: 50,
  statusCode: "ACTIVE",
  medicine: { id: 20, code: "PARA500", name: "Paracetamol 500 mg" },
  pharmacyLocation,
};

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "Access-Control-Allow-Origin": "http://127.0.0.1:3101",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
  });
}

async function mockHospitalApi(page: Page) {
  await page.route(
    /^http:\/\/(localhost|127\.0\.0\.1):3000\/.*/,
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;

      if (request.method() === "OPTIONS") return json(route, {});
      if (path === "/auth/me") return json(route, user);
      if (path === "/facility-subscriptions/my-status") {
        return json(route, {
          facilityId: 1,
          subscriptionWriteLocked: false,
          subscription: { statusCode: "ACTIVE" },
        });
      }
      if (path === "/notifications/unresolved-count") {
        return json(route, {
          filters: { facilityId: 1, branchId: 1, moduleName: null },
          counts: { total: 0, unread: 0, lowStock: 0, outOfStock: 0 },
        });
      }
      if (
        request.method() === "GET" &&
        /^\/operational-modules\/[^/]+\/records$/.test(path)
      ) {
        return json(route, {
          records: [],
          summary: { total: 0, active: 0, completed: 0, overdue: 0 },
          statusBreakdown: [],
          priorityBreakdown: [],
        });
      }
      if (path === "/pharmacy-inventory/dashboard") {
        return json(route, inventoryDashboard);
      }
      if (path === "/patients") return json(route, [demoPatient]);
      if (path === "/lab/tests") {
        return json(route, [
          { id: 40, testName: "Full Blood Count", specimenType: "Blood" },
        ]);
      }
      if (path === "/pharmacy-inventory/locations") {
        if (request.method() === "GET") return json(route, [pharmacyLocation]);
        const payload = request.postDataJSON();
        return json(route, { id: 11, ...payload });
      }
      if (path === "/pharmacy-inventory/batches") {
        return json(route, [medicineBatch]);
      }
      if (path === "/pharmacy-inventory/returns") {
        return json(route, [
          {
            id: 70,
            returnNumber: "RET-DEMO-1",
            statusCode: "PENDING_INSPECTION",
            returnReason: "Unopened medicine returned",
            receivedAt: "2026-07-23T09:00:00.000Z",
            patient: demoPatient,
            pharmacyLocation,
            items: [
              {
                id: 71,
                quantityReturned: 2,
                conditionCode: "SEALED",
                medicine: medicineBatch.medicine,
                medicineBatch,
              },
            ],
          },
        ]);
      }
      if (
        path === "/pharmacy-inventory/returns/70/review" &&
        request.method() === "POST"
      ) {
        return json(route, { id: 70, statusCode: "REVIEWED" });
      }
      if (path === "/lab/external-referrals" && request.method() === "POST") {
        return json(route, { id: 60, referralNumber: "EXT-DEMO-1" });
      }
      if (
        path === "/clinical-specialties/dental/encounters" &&
        request.method() === "POST"
      ) {
        return json(route, { id: 80, encounterNumber: "DEN-DEMO-1" });
      }
      if (
        path === "/clinical-specialties/orthopedic/cases" &&
        request.method() === "POST"
      ) {
        return json(route, { id: 90, caseNumber: "ORT-DEMO-1" });
      }
      if (
        path === "/private-insurance/payers" &&
        request.method() === "POST"
      ) {
        return json(route, { id: 100, code: "BWAY", name: "Broadway Cover" });
      }
      if (
        request.method() === "GET" &&
        (path === "/pharmacy/medicines" ||
          path === "/pharmacy-inventory/movements" ||
          path === "/lab/external-referrals" ||
          path === "/clinical-specialties/dental/encounters" ||
          path === "/clinical-specialties/orthopedic/cases" ||
          path === "/private-insurance/payers" ||
          path === "/private-insurance/policies" ||
          path === "/private-insurance/claims" ||
          path === "/billing/invoices")
      ) {
        return json(route, []);
      }
      if (path.startsWith("/reports/patient-turnaround")) {
        return json(route, { filters: {}, departments: [] });
      }
      if (path.startsWith("/reports/")) return json(route, {});
      if (path === "/reports") return json(route, {});
      if (path === "/communications/bulk" && request.method() === "POST") {
        const payload = request.postDataJSON() as { messages: unknown[] };
        return json(route, {
          requested: payload.messages.length,
          queued: payload.messages.length,
        });
      }
      // Module workspace and non-critical shell queries receive a safe empty
      // object so a Broadway workflow test never depends on a live backend.
      return json(route, request.method() === "GET" ? {} : { id: 1 });
    },
  );
}

test.beforeEach(async ({ page }) => {
  await mockHospitalApi(page);
});

const workflowPages = [
  ["/pharmacy-inventory", "Batches, Expiry and Returns"],
  ["/lab-external", "External Sample Management"],
  ["/dental", "Dental"],
  ["/orthopedics", "Orthopedics"],
  ["/insurance", "Insurance Eligibility and Claims"],
  ["/communications", "Bulk Patient and Staff Messaging"],
  ["/reports", "Reports Dashboard"],
] as const;

for (const [path, heading] of workflowPages) {
  test(`${heading} workflow is accessible to an authenticated operator`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${path.replace("/", "\\/")}$`));
  });
}

test("pharmacy can create a scoped stock location", async ({ page }) => {
  await page.goto("/pharmacy-inventory");
  await page.getByPlaceholder("Code e.g. IPD").fill("IPD");
  await page.getByPlaceholder("Name e.g. Inpatient Pharmacy").fill(
    "Inpatient Pharmacy",
  );
  await page.getByRole("button", { name: "Create location" }).click();
  await expect(page.getByText("Pharmacy location created.")).toBeVisible();
});

test("pharmacist can review a medicine return into an active batch", async ({
  page,
}) => {
  await page.goto("/pharmacy-inventory");
  await page.locator('select:has(option[value="RESTOCK"])').selectOption(
    "RESTOCK",
  );
  await page.locator('select:has(option[value="99"])').selectOption("99");
  await page.getByPlaceholder("Inspection notes").fill(
    "Seal intact; returned to saleable stock.",
  );
  await page.getByRole("button", { name: "Complete inspection" }).click();
  await expect(page.getByText("Return RET-DEMO-1 reviewed.")).toBeVisible();
});

test("external laboratory can receive a priced referral sample", async ({
  page,
}) => {
  await page.goto("/lab-external");
  await page.getByPlaceholder("Referring hospital or clinic").fill(
    "Broadway Satellite Clinic",
  );
  await page.getByPlaceholder("External patient name").fill("External Demo");
  await page.getByPlaceholder("Sample reference / barcode").fill("SAMPLE-1");
  await page.getByRole("combobox").filter({ hasText: "Select test" }).selectOption(
    "40",
  );
  await page.getByRole("button", { name: "Receive sample" }).click();
  await expect(
    page.getByText("External laboratory referral received."),
  ).toBeVisible();
});

test("clinician can open a dental encounter", async ({ page }) => {
  await page.goto("/dental");
  await page.getByRole("combobox").filter({ hasText: "Select patient" }).first().selectOption(
    "5",
  );
  await page.getByPlaceholder("Chief complaint").fill("Demonstration tooth pain");
  await page.getByRole("button", { name: "Open dental encounter" }).click();
  await expect(page.getByText(/Dental encounter created/)).toBeVisible();
});

test("clinician can open an orthopedic case", async ({ page }) => {
  await page.goto("/orthopedics");
  await page.getByRole("combobox").filter({ hasText: "Select patient" }).selectOption(
    "5",
  );
  await page.getByPlaceholder("Anatomical site").fill("Left forearm");
  await page.getByRole("button", { name: "Open case" }).click();
  await expect(page.getByText("Orthopedic case created.")).toBeVisible();
});

test("administrator can register a contracted insurance payer", async ({
  page,
}) => {
  await page.goto("/insurance");
  await page.getByPlaceholder("Payer code").fill("BWAY");
  await page.getByPlaceholder("Payer name").fill("Broadway Cover");
  await page.getByRole("button", { name: "Add payer" }).click();
  await expect(page.getByText("Payer registered.")).toBeVisible();
});

test("approved bulk communication is queued through the provider workflow", async ({
  page,
}) => {
  await page.goto("/communications");
  await page
    .getByPlaceholder(/Recipients, one per line/)
    .fill("+254700000001\n+254700000002");
  await page
    .getByPlaceholder("Message content supplied to the approved provider template")
    .fill("Broadway demonstration appointment reminder.");
  await page.getByRole("button", { name: "Queue messages" }).click();
  await expect(page.getByText("2 of 2 messages queued.")).toBeVisible();
});
