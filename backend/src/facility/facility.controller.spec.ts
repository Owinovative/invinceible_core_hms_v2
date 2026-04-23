import { Test, TestingModule } from '@nestjs/testing';
import { FacilityController } from './facility.controller';

describe('FacilityController', () => {
  let controller: FacilityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FacilityController],
    }).compile();

    controller = module.get<FacilityController>(FacilityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
