const SENSITIVE_PATHS = [
  {
    pattern: /^(\/lab-report-access\/)[^/?]+(\/pdf)?$/i,
    replacement: '$1[REDACTED]$2',
  },
] as const;

/**
 * Produces a route identifier that is safe to include in operational logs.
 * Query values are deliberately omitted because they can contain identifiers,
 * access tokens, or patient search terms.
 */
export function safeRequestPath(rawPath: string | undefined) {
  const pathname = (rawPath || '/').split('?')[0] || '/';
  for (const sensitivePath of SENSITIVE_PATHS) {
    if (sensitivePath.pattern.test(pathname)) {
      return pathname.replace(sensitivePath.pattern, sensitivePath.replacement);
    }
  }
  return pathname;
}
