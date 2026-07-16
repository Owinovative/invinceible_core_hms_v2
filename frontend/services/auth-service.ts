import { apiFetch } from "@/lib/api";
import type { AuthUser, LoginResponse } from "@/types/auth";

export async function loginUser(payload: {
  username: string;
  password: string;
}) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe() {
  return apiFetch<AuthUser>("/auth/me", {
    method: "GET",
  });
}

export async function logoutUser() {
  return apiFetch<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}

export async function acceptOwnDeactivation() {
  return apiFetch<{ message: string }>("/auth/accept-deactivation", {
    method: "POST",
  });
}

export async function forgotPassword(payload: { username: string }) {
  return apiFetch<{
    message: string;
    devResetToken?: string;
    devResetLink?: string;
    expiresAt?: string;
  }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(payload: {
  token: string;
  newPassword: string;
}) {
  return apiFetch<{
    message: string;
  }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
