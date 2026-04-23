import { Test, TestingModule } from '@nestjs/testing';
import { IpdController } from './ipd.controller';

describe('IpdController', () => {
  let controller: IpdController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IpdController],
    }).compile();

    controller = module.get<IpdController>(IpdController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
