import { Test, TestingModule } from '@nestjs/testing';
import { BranchController } from './branch.controller';

describe('BranchController', () => {
  let controller: BranchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BranchController],
    }).compile();

    controller = module.get<BranchController>(BranchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
