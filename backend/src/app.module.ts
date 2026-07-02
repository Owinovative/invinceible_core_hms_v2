import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
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
import { OperationalModuleModule } from './operational-module/operational-module.module';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { MasterCatalogModule } from './master-catalog/master-catalog.module';
import { UserLocationModule } from './user-location/user-location.module';
import { ShaClaimsModule } from './sha-claims/sha-claims.module';
import { UserReviewModule } from './user-review/user-review.module';
import { FeedbackModule } from './feedback/feedback.module';
import { FacilitySubscriptionModule } from './facility-subscription/facility-subscription.module';
import { validateEnvironment } from './config/env.validation';
import { AuditInterceptor } from './audit-log/audit.interceptor';
import { UserLocationInterceptor } from './user-location/user-location.interceptor';
import { FacilitySubscriptionInterceptor } from './facility-subscription/facility-subscription.interceptor';
import { ResilienceModule } from './resilience/resilience.module';
import { RateLimitMiddleware } from './resilience/rate-limit.middleware';
import { RequestContextMiddleware } from './resilience/request-context.middleware';
import { RequestLoggingMiddleware } from './resilience/request-logging.middleware';
import { EnterpriseModule } from './enterprise/enterprise.module';
import { ClinicalSafetyModule } from './clinical-safety/clinical-safety.module';
import { PatientPortalModule } from './patient-portal/patient-portal.module';
import { CommunicationModule } from './communication/communication.module';
import { DataOutboxModule } from './data-outbox/data-outbox.module';
import { IntegrationModule } from './integration/integration.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    EnterpriseModule,
    ResilienceModule,
    ClinicalSafetyModule,
    PatientPortalModule,
    CommunicationModule,
    DataOutboxModule,
    IntegrationModule,
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
    OperationalModuleModule,
    AiAssistantModule,
    MasterCatalogModule,
    UserLocationModule,
    ShaClaimsModule,
    UserReviewModule,
    FeedbackModule,
    FacilitySubscriptionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: UserLocationInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: FacilitySubscriptionInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        RequestContextMiddleware,
        RateLimitMiddleware,
        RequestLoggingMiddleware,
      )
      .forRoutes('*');
  }
}
