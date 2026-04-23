import { Test, TestingModule } from '@nestjs/testing';
import { DoctorLabReviewController } from './doctor-lab-review.controller';

describe('DoctorLabReviewController', () => {
  let controller: DoctorLabReviewController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoctorLabReviewController],
    }).compile();

    controller = module.get<DoctorLabReviewController>(DoctorLabReviewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
