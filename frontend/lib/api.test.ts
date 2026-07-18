import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./api";

describe("apiFetch", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses HttpOnly-cookie credentials and disables caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/health/live")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/health/live",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });

  it("returns the backend validation message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: ["Username is required"] }), {
          status: 400,
        }),
      ),
    );

    await expect(apiFetch("/auth/login")).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Username is required",
    });
  });

  it("normalizes network failures instead of leaking raw fetch errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed")));

    await expect(apiFetch("/auth/me")).rejects.toEqual(
      expect.objectContaining<ApiError>({
        name: "ApiError",
        status: 0,
        message: expect.stringContaining("Unable to reach"),
      }),
    );
  });
});
