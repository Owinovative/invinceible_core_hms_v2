import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FacilityModule } from './facility/facility.module';
import { RoleModule } from './role/role.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { StaffModule } from './staff/staff.module';
import { PatientModule } from './patient/patient.module';
import { AppointmentModule } from './appointment/appointment.module';
import { QueueModule } from './queue/queue.module';
import { ConsultationModule } from './consultation/consultation.module';
import { LabModule } from './lab/lab.module';
import { DoctorLabReviewModule } from './doctor-lab-review/doctor-lab-review.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { IpdModule } from './ipd/ipd.module';
import { IpdClinicalModule } from './ipd-clinical/ipd-clinical.module';
import { BillingModule } from './billing/billing.module';
import { ReportsModule } from './reports/reports.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationModule } from './notification/notification.module';
import { BranchModule } from './branch/branch.module';
import { DepartmentModule } from './department/department.module';
import { ClinicModule } from './clinic/clinic.module';
import { PharmacyStockModule } from './pharmacy-stock/pharmacy-stock.module';
import { TriageModule } from './triage/triage.module'; 
import { PrescriptionModule } from './prescription/prescription.module';
import { PrescriptionItemModule } from './prescription-item/prescription-item.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    FacilityModule,
    RoleModule,
    UserModule,
    AuthModule,
    StaffModule,
    PatientModule,
    AppointmentModule,
    QueueModule,
    ConsultationModule,
    LabModule,
    DoctorLabReviewModule,
    PharmacyModule,
    IpdModule,
    IpdClinicalModule,
    BillingModule,
    ReportsModule,
    AuditLogModule,
    SettingsModule,
    NotificationModule,
    BranchModule,
    DepartmentModule,
    ClinicModule,
    PharmacyStockModule,
    TriageModule,
    PrescriptionModule,
    PrescriptionItemModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
