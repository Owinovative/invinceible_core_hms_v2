import { Test, TestingModule } from '@nestjs/testing';
import { IpdService } from './ipd.service';

describe('IpdService', () => {
  let service: IpdService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpdService],
    }).compile();

    service = module.get<IpdService>(IpdService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
