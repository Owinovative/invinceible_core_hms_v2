import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { PharmacyInventoryController } from './pharmacy-inventory.controller';

describe('PharmacyInventoryController authorization metadata', () => {
  it.each([
    PharmacyInventoryController.prototype.createLocation,
    PharmacyInventoryController.prototype.receiveBatch,
    PharmacyInventoryController.prototype.reviewReturn,
  ])('requires stock.adjust for inventory-changing operations', (handler) => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
      'stock.adjust',
    ]);
  });

  it.each([
    PharmacyInventoryController.prototype.listMovements,
    PharmacyInventoryController.prototype.exportMovements,
  ])('requires reports.read for drug-ledger access', (handler) => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
      'reports.read',
    ]);
  });
});
