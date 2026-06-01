const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = RequestInit & {
  token?: string;
  timeoutMs?: number;
};

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("hms_access_token");
}

function isLocalApiUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

function isLocalBrowser() {
  if (typeof window === "undefined") return true;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, headers, timeoutMs = 25000, signal, ...rest } = options;

  const resolvedToken = token ?? getStoredToken();

  if (isLocalApiUrl(API_BASE_URL) && !isLocalBrowser()) {
    throw new ApiError(
      "The hospital server URL is not configured for this deployment. Set NEXT_PUBLIC_API_BASE_URL to the deployed backend URL.",
      0,
    );
  }

  let response: Response;
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();

  if (signal) {
    if (signal.aborted) controller.abort();
    signal.addEventListener("abort", abortFromCaller, { once: true });
  }

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
        ...(headers || {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(
        "The hospital server took too long to respond. Please retry, and check the backend host if this continues.",
        0,
      );
    }

    throw new ApiError(
      "Unable to reach the hospital server. Verify the backend is online and NEXT_PUBLIC_API_BASE_URL points to it.",
      0,
    );
  } finally {
    globalThis.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const text = await response.text();
      if (text) {
        try {
          const payload = JSON.parse(text) as {
            message?: string | string[];
            error?: string;
          };
          if (Array.isArray(payload.message)) {
            message = payload.message.join(" ");
          } else {
            message = payload.message || payload.error || text;
          }
        } catch {
          message = text;
        }
      }
    } catch {
      // ignore
    }

    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      !path.startsWith("/auth/login")
    ) {
      localStorage.removeItem("hms_access_token");
      window.location.assign("/login");
    }

    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export async function apiDownload(path: string, fileName: string) {
  const token = getStoredToken();

  if (isLocalApiUrl(API_BASE_URL) && !isLocalBrowser()) {
    throw new ApiError(
      "The hospital server URL is not configured for this deployment. Set NEXT_PUBLIC_API_BASE_URL to the deployed backend URL.",
      0,
    );
  }

  let response: Response;
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 30000);

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(
        "The hospital server took too long to prepare the download. Please retry.",
        0,
      );
    }

    throw new ApiError(
      "Unable to reach the hospital server. Verify the backend is online and NEXT_PUBLIC_API_BASE_URL points to it.",
      0,
    );
  } finally {
    globalThis.clearTimeout(timeout);
  }

  if (!response.ok) {
    let message = `Download failed with status ${response.status}`;

    try {
      const text = await response.text();
      if (text) message = text;
    } catch {
      // ignore
    }

    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("hms_access_token");
      window.location.assign("/login");
    }

    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export { API_BASE_URL };
