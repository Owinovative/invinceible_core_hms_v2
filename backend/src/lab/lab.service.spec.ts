import { Test, TestingModule } from '@nestjs/testing';
import { LabService } from './lab.service';

describe('LabService', () => {
  let service: LabService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LabService],
    }).compile();

    service = module.get<LabService>(LabService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
