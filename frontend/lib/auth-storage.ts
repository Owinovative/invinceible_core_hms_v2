const LEGACY_TOKEN_KEY = "hms_access_token";

// Remove tokens left by versions that stored JWTs in Web Storage. New
// sessions are held only in a backend-issued HttpOnly cookie.
export function clearLegacyAccessToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}
