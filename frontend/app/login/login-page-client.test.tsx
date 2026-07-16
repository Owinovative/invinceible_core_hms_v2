import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import LoginPageClient from "./login-page-client";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams("next=/patients"),
}));
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ login: mocks.login, isLoading: false }),
}));
vi.mock("@/components/shared/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

describe("LoginPageClient", () => {
  it("submits credentials and returns to the requested safe route", async () => {
    mocks.login.mockResolvedValueOnce({});
    render(<LoginPageClient />);

    fireEvent.change(screen.getByLabelText("Username or email"), {
      target: { value: "cashier" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(mocks.login).toHaveBeenCalledWith({
        username: "cashier",
        password: "secret-password",
      }),
    );
    expect(mocks.replace).toHaveBeenCalledWith("/patients");
  });

  it("shows a safe authentication message for a rejected login", async () => {
    mocks.login.mockRejectedValueOnce(new ApiError("Unauthorized", 401));
    render(<LoginPageClient />);

    fireEvent.change(screen.getByLabelText("Username or email"), {
      target: { value: "unknown" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "username or password is incorrect",
    );
  });
});
