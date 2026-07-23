import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { FeatureFlagService } from '../enterprise/feature-flag.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafeLoggerService } from '../resilience/safe-logger.service';
import { CommunicationService } from './communication.service';

@Injectable()
export class CommunicationSchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communication: CommunicationService,
    private readonly featureFlags: FeatureFlagService,
    private readonly logger: SafeLoggerService,
    private readonly config: ConfigService,
  ) {}

  @Interval(10 * 60 * 1000)
  async queueAppointmentReminders() {
    if (this.config.get<string>('WORKER_MODE') === 'true') return;
    if (!this.featureFlags.isEnabled('SMS_ENABLED')) return;
    const now = new Date();
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const appointments = await this.prisma.appointment.findMany({
      where: {
        appointmentDate: { gt: now, lte: horizon },
        statusCode: { notIn: ['CANCELLED', 'COMPLETED'] },
        patient: { phonePrimary: { not: null } },
      },
      include: { patient: true, clinic: true, facility: true },
      take: 1000,
      orderBy: { appointmentDate: 'asc' },
    });

    for (const appointment of appointments) {
      if (!appointment.patient.phonePrimary) continue;
      await this.communication
        .queueMessage({
          channel: 'sms',
          recipient: appointment.patient.phonePrimary,
          templateKey: 'APPOINTMENT_REMINDER',
          patientId: appointment.patientId,
          facilityId: appointment.facilityId,
          branchId: appointment.branchId,
          variables: {
            patientName: [
              appointment.patient.firstName,
              appointment.patient.lastName,
            ].join(' '),
            appointmentNumber: appointment.appointmentNumber,
            appointmentDate: appointment.appointmentDate.toISOString(),
            clinicName: appointment.clinic?.name ?? '',
            facilityName: appointment.facility.name,
          },
        })
        .catch((error) => {
          this.logger.warn('Unable to queue appointment reminder', {
            appointmentId: appointment.id,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    }
  }

  @Interval(10 * 60 * 1000)
  async queueClinicalAndFinancialNotifications() {
    if (this.config.get<string>('WORKER_MODE') === 'true') return;
    if (!this.featureFlags.isEnabled('SMS_ENABLED')) return;
    const now = new Date();
    const recent = new Date(now.getTime() - 15 * 60 * 1000);
    await Promise.all([
      this.queueReleasedLabResults(recent),
      this.queueCompletedPayments(recent),
      this.queueSpecialtyFollowUps(now),
      this.queueRefillReminders(now),
    ]);
  }

  private async queueReleasedLabResults(recent: Date) {
    const [internalResults, externalResults] = await Promise.all([
      this.prisma.labResult.findMany({
        where: {
          releasedAt: { gte: recent },
          orderItem: {
            order: { patient: { phonePrimary: { not: null } } },
          },
        },
        include: {
          orderItem: {
            include: {
              test: true,
              order: { include: { patient: true } },
            },
          },
        },
        take: 1000,
      }),
      this.prisma.externalLabResult.findMany({
        where: {
          releasedAt: { gte: recent },
          orderItem: { referral: { patientPhone: { not: null } } },
        },
        include: {
          orderItem: { include: { test: true, referral: true } },
        },
        take: 1000,
      }),
    ]);
    for (const result of internalResults) {
      const { order } = result.orderItem;
      if (!order.patient.phonePrimary) continue;
      await this.queueSafely({
        channel: 'sms',
        recipient: order.patient.phonePrimary,
        templateKey: 'LAB_RESULT_READY',
        patientId: order.patientId,
        facilityId: order.facilityId,
        branchId: order.branchId,
        variables: {
          patientName: `${order.patient.firstName} ${order.patient.lastName}`,
          orderNumber: order.orderNumber,
          testName: result.orderItem.test.testName,
        },
      });
    }
    for (const result of externalResults) {
      const referral = result.orderItem.referral;
      if (!referral.patientPhone) continue;
      await this.queueSafely({
        channel: 'sms',
        recipient: referral.patientPhone,
        templateKey: 'EXTERNAL_LAB_RESULT_READY',
        facilityId: referral.facilityId,
        branchId: referral.branchId,
        variables: {
          patientName: referral.externalPatientName,
          referralNumber: referral.referralNumber,
          testName: result.orderItem.test.testName,
        },
      });
    }
  }

  private async queueCompletedPayments(recent: Date) {
    const payments = await this.prisma.payment.findMany({
      where: {
        statusCode: 'COMPLETED',
        confirmedAt: { gte: recent },
        invoice: { patient: { phonePrimary: { not: null } } },
      },
      include: { invoice: { include: { patient: true } } },
      take: 1000,
    });
    for (const payment of payments) {
      const phone = payment.invoice.patient.phonePrimary;
      if (!phone) continue;
      const common = {
        channel: 'sms' as const,
        recipient: phone,
        patientId: payment.invoice.patientId,
        facilityId: payment.facilityId,
        branchId: payment.branchId,
      };
      await this.queueSafely({
        ...common,
        templateKey: 'PAYMENT_CONFIRMATION',
        variables: {
          patientName: `${payment.invoice.patient.firstName} ${payment.invoice.patient.lastName}`,
          receiptNumber: payment.receiptNumber,
          invoiceNumber: payment.invoice.invoiceNumber,
          amount: String(payment.amount),
        },
      });
      await this.queueSafely({
        ...common,
        templateKey: 'INVOICE_RECEIPT_READY',
        variables: {
          invoiceNumber: payment.invoice.invoiceNumber,
          receiptNumber: payment.receiptNumber,
        },
      });
    }
  }

  private async queueSpecialtyFollowUps(now: Date) {
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const [dental, orthopedic] = await Promise.all([
      this.prisma.dentalEncounter.findMany({
        where: {
          nextReviewAt: { gt: now, lte: horizon },
          statusCode: { not: 'CANCELLED' },
          patient: { phonePrimary: { not: null } },
        },
        include: { patient: true },
        take: 1000,
      }),
      this.prisma.orthopedicCase.findMany({
        where: {
          followUpAt: { gt: now, lte: horizon },
          statusCode: { not: 'CANCELLED' },
          patient: { phonePrimary: { not: null } },
        },
        include: { patient: true },
        take: 1000,
      }),
    ]);
    for (const record of [...dental, ...orthopedic]) {
      if (!record.patient.phonePrimary) continue;
      const followUpAt =
        'nextReviewAt' in record ? record.nextReviewAt : record.followUpAt;
      await this.queueSafely({
        channel: 'sms',
        recipient: record.patient.phonePrimary,
        templateKey: 'CLINICAL_FOLLOW_UP_REMINDER',
        patientId: record.patientId,
        facilityId: record.facilityId,
        branchId: record.branchId,
        variables: {
          patientName: `${record.patient.firstName} ${record.patient.lastName}`,
          followUpAt: followUpAt?.toISOString() ?? '',
          specialty: 'nextReviewAt' in record ? 'Dental' : 'Orthopedics',
        },
      });
    }
  }

  private durationDays(value?: string | null) {
    const match = value?.match(/(\d+)\s*(day|days|week|weeks|month|months)/i);
    if (!match) return null;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('week')) return amount * 7;
    if (unit.startsWith('month')) return amount * 30;
    return amount;
  }

  private async queueRefillReminders(now: Date) {
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        dispensedAt: {
          gte: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
          lte: now,
        },
        patient: { phonePrimary: { not: null } },
      },
      include: { patient: true, items: { include: { medicine: true } } },
      take: 2000,
    });
    for (const prescription of prescriptions) {
      const duration = Math.max(
        0,
        ...prescription.items.map(
          (item) => this.durationDays(item.duration) ?? 0,
        ),
      );
      if (!duration || !prescription.dispensedAt) continue;
      const dueAt = new Date(
        prescription.dispensedAt.getTime() + duration * 24 * 60 * 60 * 1000,
      );
      const hoursUntilDue = (dueAt.getTime() - now.getTime()) / 3_600_000;
      if (hoursUntilDue < 0 || hoursUntilDue > 24) continue;
      if (!prescription.patient.phonePrimary) continue;
      await this.queueSafely({
        channel: 'sms',
        recipient: prescription.patient.phonePrimary,
        templateKey: 'MEDICINE_REFILL_REMINDER',
        patientId: prescription.patientId,
        facilityId: prescription.facilityId,
        branchId: prescription.branchId,
        variables: {
          patientName: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
          prescriptionNumber: prescription.prescriptionNumber,
          medicines: prescription.items
            .map((item) => item.medicine.name)
            .join(', '),
          refillDueAt: dueAt.toISOString(),
        },
      });
    }
  }

  private async queueSafely(
    message: Parameters<CommunicationService['queueMessage']>[0],
  ) {
    await this.communication.queueMessage(message).catch((error) => {
      this.logger.warn('Unable to queue automated communication', {
        templateKey: message.templateKey,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }
}
