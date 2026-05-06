import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const HMS_TOKEN = __ENV.HMS_TOKEN || "";
const PUBLIC_VERIFY_CODE = __ENV.PUBLIC_VERIFY_CODE || "";
const RUN_MPESA = (__ENV.RUN_MPESA || "false").toLowerCase() === "true";

export const options = {
  stages: [
    { duration: "2m", target: 100 },
    { duration: "3m", target: 500 },
    { duration: "3m", target: 1000 },
    { duration: "5m", target: 5000 },
    { duration: "5m", target: 10000 },
    { duration: "10m", target: 30000 },
    { duration: "3m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
  },
};

function authHeaders(extra = {}) {
  return {
    headers: {
      ...(HMS_TOKEN ? { Authorization: `Bearer ${HMS_TOKEN}` } : {}),
      ...extra,
    },
  };
}

export default function () {
  const live = http.get(`${BASE_URL}/health/live`);
  check(live, { "live ok": (res) => res.status === 200 });

  const ready = http.get(`${BASE_URL}/health/ready`);
  check(ready, { "ready safe": (res) => [200, 503].includes(res.status) });

  if (HMS_TOKEN) {
    const dashboard = http.get(`${BASE_URL}/billing/dashboard`, authHeaders());
    check(dashboard, {
      "billing dashboard not 5xx": (res) => res.status < 500,
    });

    const suggestions = http.get(
      `${BASE_URL}/patients/search/suggestions?search=a`,
      authHeaders(),
    );
    check(suggestions, {
      "patient search not 5xx": (res) => res.status < 500,
    });

    const invoices = http.get(
      `${BASE_URL}/billing/invoices?page=1&pageSize=25`,
      authHeaders(),
    );
    check(invoices, { "invoice list not 5xx": (res) => res.status < 500 });

    const facilities = http.get(`${BASE_URL}/facilities`, authHeaders());
    check(facilities, { "facility list not 5xx": (res) => res.status < 500 });

    if (RUN_MPESA) {
      const idem = `k6:${__VU}:${Math.floor(Date.now() / 60000)}`;
      const mpesa = http.post(
        `${BASE_URL}/billing/payments/mpesa/request`,
        JSON.stringify({
          invoiceId: Number(__ENV.MPESA_TEST_INVOICE_ID || 0),
          amount: Number(__ENV.MPESA_TEST_AMOUNT || 1),
          phoneNumber: __ENV.MPESA_TEST_PHONE || "254700000000",
        }),
        authHeaders({
          "Content-Type": "application/json",
          "Idempotency-Key": idem,
        }),
      );
      check(mpesa, {
        "mpesa prompt protected": (res) => [200, 201, 400, 409, 429].includes(res.status),
      });
    }
  }

  if (PUBLIC_VERIFY_CODE) {
    const verify = http.get(
      `${BASE_URL}/billing/public/invoices/${encodeURIComponent(PUBLIC_VERIFY_CODE)}`,
    );
    check(verify, { "public verify not 5xx": (res) => res.status < 500 });
  }

  sleep(1);
}
