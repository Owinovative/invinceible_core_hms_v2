export const queryStaleTime = {
  realtime: 15_000,
  dashboard: 30_000,
  facilities: 5 * 60_000,
  branches: 5 * 60_000,
  tariffs: 5 * 60_000,
  medicineCatalog: 3 * 60_000,
  roles: 10 * 60_000,
  reports: 60_000,
} as const;
