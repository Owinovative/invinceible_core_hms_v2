import { Test, TestingModule } from '@nestjs/testing';
import { IpdClinicalController } from './ipd-clinical.controller';

describe('IpdClinicalController', () => {
  let controller: IpdClinicalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IpdClinicalController],
    }).compile();

    controller = module.get<IpdClinicalController>(IpdClinicalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
