import { SetMetadata } from '@nestjs/common';
import type { HmsPermission } from './permissions';

export const PERMISSIONS_KEY = 'hms_permissions';

export const Permissions = (...permissions: HmsPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
