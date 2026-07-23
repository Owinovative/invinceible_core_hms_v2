import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { PharmacyStockController } from './pharmacy-stock.controller';

describe('PharmacyStockController authorization metadata', () => {
  it.each([
    PharmacyStockController.prototype.create,
    PharmacyStockController.prototype.update,
    PharmacyStockController.prototype.addStock,
    PharmacyStockController.prototype.deductStock,
    PharmacyStockController.prototype.restockBranchMedicine,
    PharmacyStockController.prototype.importBranchPricing,
  ])('requires stock.adjust for every stock mutation', (handler) => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
      'stock.adjust',
    ]);
  });
});
