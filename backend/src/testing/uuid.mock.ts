import { randomUUID } from 'node:crypto';

// Jest runs this codebase as CommonJS while uuid v14 is ESM-only. Production
// continues to use uuid; unit tests map that package to Node's equivalent.
export const v4 = () => randomUUID();
