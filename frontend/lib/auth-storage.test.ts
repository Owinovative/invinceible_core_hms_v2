import { beforeEach, describe, expect, it } from "vitest";
import { clearLegacyAccessToken } from "./auth-storage";

describe("auth storage migration", () => {
  beforeEach(() => localStorage.clear());

  it("removes legacy Web Storage JWTs", () => {
    localStorage.setItem("hms_access_token", "sensitive-jwt");
    clearLegacyAccessToken();
    expect(localStorage.getItem("hms_access_token")).toBeNull();
  });
});
