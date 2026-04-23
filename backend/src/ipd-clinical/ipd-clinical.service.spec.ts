import { Test, TestingModule } from '@nestjs/testing';
import { IpdClinicalService } from './ipd-clinical.service';

describe('IpdClinicalService', () => {
  let service: IpdClinicalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpdClinicalService],
    }).compile();

    service = module.get<IpdClinicalService>(IpdClinicalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
