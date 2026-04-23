import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyStockService } from './pharmacy-stock.service';

describe('PharmacyStockService', () => {
  let service: PharmacyStockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PharmacyStockService],
    }).compile();

    service = module.get<PharmacyStockService>(PharmacyStockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
