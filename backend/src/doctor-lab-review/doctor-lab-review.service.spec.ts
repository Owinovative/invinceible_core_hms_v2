import { Test, TestingModule } from '@nestjs/testing';
import { DoctorLabReviewService } from './doctor-lab-review.service';

describe('DoctorLabReviewService', () => {
  let service: DoctorLabReviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DoctorLabReviewService],
    }).compile();

    service = module.get<DoctorLabReviewService>(DoctorLabReviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
