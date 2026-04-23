import { Test, TestingModule } from '@nestjs/testing';
import { FacilityService } from './facility.service';

describe('FacilityService', () => {
  let service: FacilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FacilityService],
    }).compile();

    service = module.get<FacilityService>(FacilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
