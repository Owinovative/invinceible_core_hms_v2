import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { LegalController } from './legal.controller';

describe('LegalController authorization metadata', () => {
  const adminHandlers = [
    LegalController.prototype.getAllDocuments,
    LegalController.prototype.saveDraft,
    LegalController.prototype.publishDocument,
  ];

  it.each(adminHandlers)(
    'requires legal.manage on every admin handler',
    (handler) => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
        'legal.manage',
      ]);
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
        JwtAuthGuard,
        PermissionsGuard,
      ]);
    },
  );

  it('keeps only the published-document endpoint public', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        LegalController.prototype.getPublishedDocuments,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        LegalController.prototype.acceptDocument,
      ),
    ).toEqual([JwtAuthGuard]);
  });
});
