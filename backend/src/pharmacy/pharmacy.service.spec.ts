import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyService } from './pharmacy.service';
import { PrismaService } from '../prisma/prisma.service';
import { PatientService } from '../patient/patient.service';
import { StaffService } from '../staff/staff.service';
import { ConsultationService } from '../consultation/consultation.service';
import { NotificationService } from '../notification/notification.service';
import { ScopeService } from '../auth/scope.service';
import { BillingService } from '../billing/billing.service';

describe('PharmacyService', () => {
  let service: PharmacyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PharmacyService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: PatientService,
          useValue: {},
        },
        {
          provide: StaffService,
          useValue: {},
        },
        {
          provide: ConsultationService,
          useValue: {},
        },
        {
          provide: NotificationService,
          useValue: {},
        },
        {
          provide: ScopeService,
          useValue: {},
        },
        {
          provide: BillingService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<PharmacyService>(PharmacyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
