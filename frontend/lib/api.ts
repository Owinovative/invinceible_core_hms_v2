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
  const { token, headers, ...rest } = options;

  const resolvedToken = token ?? getStoredToken();

  if (isLocalApiUrl(API_BASE_URL) && !isLocalBrowser()) {
    throw new ApiError(
      "The hospital server URL is not configured for this deployment. Set NEXT_PUBLIC_API_BASE_URL in Vercel to the Railway backend URL.",
      0,
    );
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
        ...(headers || {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Unable to reach the hospital server. Verify the Railway backend is online and NEXT_PUBLIC_API_BASE_URL points to it.",
      0,
    );
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

export { API_BASE_URL };
