import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PatientService } from '../patient/patient.service';
import { AppointmentService } from '../appointment/appointment.service';
import { StaffService } from '../staff/staff.service';
import { NotificationService } from '../notification/notification.service';
import { CreateLabTestDto } from './dto/create-lab-test.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateLabResultDto } from './dto/create-lab-result.dto';
import { ScopeService } from '../auth/scope.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { BillingService } from '../billing/billing.service';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import {
  AmendLabResultDto,
  ValidateLabResultDto,
} from './dto/validate-lab-result.dto';
import {
  CreateExternalLabReferralDto,
  CreateExternalLabResultDto,
  CreateExternalLabPaymentDto,
  CreateExternalLabReportShareDto,
} from './dto/create-external-lab-referral.dto';
import {
  addCompactTable,
  addKeyValueGrid,
  addSectionTitle,
  createHospitalPdfBuffer,
  formatPdfDate,
} from '../common/pdf/hospital-pdf';

@Injectable()
export class LabService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientService: PatientService,
    private readonly appointmentService: AppointmentService,
    private readonly staffService: StaffService,
    private readonly notificationService: NotificationService,
    private readonly scopeService: ScopeService,
    private readonly billingService: BillingService,
    private readonly config: ConfigService,
  ) {}

  private signLabResult(payload: string) {
    const key =
      this.config.get<string>('LAB_SIGNING_KEY') ??
      this.config.get<string>('JWT_SECRET');
    if (!key) {
      throw new Error('LAB_SIGNING_KEY is not configured');
    }
    return createHmac('sha256', key).update(payload).digest('hex');
  }
  private async generateLabOrderNumber() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const prefix = `LAB-${year}${month}${day}`;

    const lastOrder = await this.prisma.labOrder.findFirst({
      where: {
        orderNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        orderNumber: 'desc',
      },
    });

    let nextSequence = 1;

    if (lastOrder?.orderNumber) {
      const lastPart = lastOrder.orderNumber.split('-').pop();
      const parsed = Number(lastPart);

      if (!Number.isNaN(parsed)) {
        nextSequence = parsed + 1;
      }
    }

    return `${prefix}-${String(nextSequence).padStart(4, '0')}`;
  }

  async createTestCatalogItem(createLabTestDto: CreateLabTestDto) {
    return this.prisma.labTestCatalog.create({
      data: {
        testName: createLabTestDto.testName,
        category: createLabTestDto.category,
        specimenType: createLabTestDto.specimenType,
        isActive: createLabTestDto.isActive ?? true,
      },
    });
  }

  getAllTests() {
    return this.prisma.labTestCatalog.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async createOrder(createLabOrderDto: CreateLabOrderDto) {
    const generatedOrderNumber = await this.generateLabOrderNumber();
    const patient = await this.patientService.findOne(
      createLabOrderDto.patientId,
    );

    let appointment: any = null;
    if (createLabOrderDto.appointmentId) {
      appointment = await this.appointmentService.findOne(
        createLabOrderDto.appointmentId,
      );
    }

    let admission: any = null;
    if (createLabOrderDto.admissionId) {
      admission = await this.prisma.admission.findUnique({
        where: { id: createLabOrderDto.admissionId },
        include: {
          patient: true,
          ward: true,
          bed: true,
        },
      });

      if (!admission) {
        throw new NotFoundException(
          `Admission with id ${createLabOrderDto.admissionId} not found`,
        );
      }

      if (admission.patientId !== createLabOrderDto.patientId) {
        throw new BadRequestException(
          'Admission does not belong to the selected patient',
        );
      }
    }

    let requestedBy: any = null;
    if (createLabOrderDto.requestedByStaffId) {
      requestedBy = await this.staffService.findOne(
        createLabOrderDto.requestedByStaffId,
      );
    }

    for (const item of createLabOrderDto.items) {
      const test = await this.prisma.labTestCatalog.findUnique({
        where: { id: item.testId },
      });

      if (!test) {
        throw new NotFoundException(
          `Lab test with id ${item.testId} not found`,
        );
      }
    }

    const facilityId =
      admission?.facilityId ?? appointment?.facilityId ?? patient.facilityId;

    const branchId =
      admission?.branchId ??
      appointment?.branchId ??
      requestedBy?.branchId ??
      null;

    const order = await this.prisma.labOrder.create({
      data: {
        facilityId,
        branchId,
        orderNumber: generatedOrderNumber,
        patientId: createLabOrderDto.patientId,
        appointmentId: createLabOrderDto.appointmentId,
        admissionId: createLabOrderDto.admissionId,
        encounterRef: createLabOrderDto.encounterRef,
        requestedByStaffId: createLabOrderDto.requestedByStaffId,
        clinicalNotes: createLabOrderDto.clinicalNotes,
        urgency: createLabOrderDto.urgency ?? 'ROUTINE',
        status: 'REQUESTED',
        items: {
          create: createLabOrderDto.items.map((item) => ({
            testId: item.testId,
            instructions: item.instructions,
            status: 'PENDING',
          })),
        },
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        appointment: true,
        admission: true,
        requestedBy: true,
        items: {
          include: {
            test: true,
          },
        },
      },
    });

    await this.notificationService.create({
      title: 'Lab Order Created',
      message: `Lab order ${order.orderNumber} has been created for patient ${order.patientId}.`,
      notificationType: 'LAB_ORDER_CREATED',
      severity: 'INFO',
      moduleName: 'LAB',
      entityType: 'LAB_ORDER',
      entityId: String(order.id),
      facilityId: order.facilityId,
      branchId: order.branchId ?? undefined,
      targetStaffId: createLabOrderDto.requestedByStaffId,
    });

    return order;
  }

  async createOrderScoped(
    createLabOrderDto: CreateLabOrderDto,
    user: RequestUser,
  ) {
    const patient = await this.patientService.findOneScoped(
      createLabOrderDto.patientId,
      user,
    );

    if (createLabOrderDto.appointmentId) {
      const appointment = await this.appointmentService.findOneScoped(
        createLabOrderDto.appointmentId,
        user,
      );

      if (appointment.patientId !== patient.id) {
        throw new BadRequestException(
          'Appointment does not belong to the selected patient',
        );
      }
    }

    if (createLabOrderDto.admissionId) {
      const admission = await this.prisma.admission.findUnique({
        where: { id: createLabOrderDto.admissionId },
      });

      if (!admission) {
        throw new NotFoundException(
          `Admission with id ${createLabOrderDto.admissionId} not found`,
        );
      }

      this.scopeService.assertBranchAccess(
        user,
        admission.facilityId,
        admission.branchId,
      );

      if (admission.patientId !== patient.id) {
        throw new BadRequestException(
          'Admission does not belong to the selected patient',
        );
      }
    }

    if (createLabOrderDto.requestedByStaffId) {
      const requestedBy = await this.staffService.findOne(
        createLabOrderDto.requestedByStaffId,
      );

      this.scopeService.assertBranchAccess(
        user,
        requestedBy.facilityId,
        requestedBy.branchId,
      );
    }

    return this.createOrder(createLabOrderDto);
  }

  getAllOrders() {
    return this.prisma.labOrder.findMany({
      include: {
        facility: true,
        branch: true,
        patient: true,
        appointment: true,
        admission: true,
        requestedBy: true,
        items: {
          include: {
            test: true,
            results: true,
          },
        },
      },
      orderBy: { id: 'desc' },
      take: 100,
    });
  }

  async getOrderById(id: number) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id },
      include: {
        facility: true,
        branch: true,
        patient: true,
        appointment: true,
        admission: true,
        requestedBy: true,
        items: {
          include: {
            test: true,
            results: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Lab order with id ${id} not found`);
    }

    return order;
  }

  async getLabQueue() {
    return this.prisma.labOrder.findMany({
      where: {
        status: {
          in: ['REQUESTED', 'IN_PROGRESS'],
        },
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        appointment: true,
        requestedBy: true,
        items: {
          include: {
            test: true,
            results: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
      take: 100,
    });
  }

  async createResult(createLabResultDto: CreateLabResultDto) {
    const orderItem = await this.prisma.labOrderItem.findUnique({
      where: { id: createLabResultDto.orderItemId },
      include: {
        order: true,
        test: true,
      },
    });

    if (!orderItem) {
      throw new NotFoundException(
        `Lab order item with id ${createLabResultDto.orderItemId} not found`,
      );
    }

    let recorder: any = null;
    if (createLabResultDto.recordedBy) {
      recorder = await this.staffService.findOne(createLabResultDto.recordedBy);
    }

    const existingResult = await this.prisma.labResult.findFirst({
      where: { orderItemId: createLabResultDto.orderItemId },
    });

    if (existingResult) {
      throw new BadRequestException(
        `Lab result already exists for order item ${createLabResultDto.orderItemId}`,
      );
    }

    try {
      const result = await this.prisma.labResult.create({
        data: {
          orderItemId: createLabResultDto.orderItemId,
          resultValue: createLabResultDto.resultValue,
          remarks: createLabResultDto.remarks,
          attachmentFileName: createLabResultDto.attachmentFileName,
          attachmentMimeType: createLabResultDto.attachmentMimeType,
          attachmentDataUrl: createLabResultDto.attachmentDataUrl,
          recordedBy: createLabResultDto.recordedBy,
        },
      });

      await this.prisma.labOrderItem.update({
        where: { id: createLabResultDto.orderItemId },
        data: { status: 'RESULTED' },
      });

      const remainingPending = await this.prisma.labOrderItem.count({
        where: {
          orderId: orderItem.orderId,
          status: {
            not: 'RESULTED',
          },
        },
      });

      const updatedOrder = await this.prisma.labOrder.update({
        where: { id: orderItem.orderId },
        data: {
          status: remainingPending === 0 ? 'RESULTED' : 'IN_PROGRESS',
        },
        include: {
          facility: true,
          branch: true,
          patient: true,
          requestedBy: true,
        },
      });

      const unitPrice = await this.billingService.resolveChargePrice({
        facilityId: updatedOrder.facilityId,
        branchId: updatedOrder.branchId,
        category: 'LAB',
        code: `LAB_TEST_${orderItem.testId}`,
        labTestId: orderItem.testId,
        fallbackPrice: 0,
      });

      await this.billingService.addAutoInvoiceItem({
        patientId: updatedOrder.patientId,
        facilityId: updatedOrder.facilityId,
        branchId: updatedOrder.branchId,
        appointmentId: updatedOrder.appointmentId,
        admissionId: updatedOrder.admissionId,
        createdByStaffId:
          recorder?.id ?? updatedOrder.requestedByStaffId ?? null,
        description: `Lab Test Resulted: ${
          orderItem.test?.testName ?? `Lab test #${orderItem.testId}`
        }`,
        quantity: 1,
        unitPrice: Number(unitPrice),
        notes:
          createLabResultDto.remarks ??
          'Automatically posted when the lab result was recorded.',
        sourceModule: 'LAB',
        sourceEntityType: 'LAB_RESULT',
        sourceEntityId: String(result.id),
      });

      await this.notificationService.create({
        title: 'Lab Result Recorded',
        message: `Result for ${orderItem.test?.testName ?? 'lab test'} has been recorded for order ${updatedOrder.orderNumber}.`,
        notificationType: 'LAB_RESULT_RECORDED',
        severity: 'INFO',
        moduleName: 'LAB',
        entityType: 'LAB_ORDER',
        entityId: String(updatedOrder.id),
        facilityId: updatedOrder.facilityId,
        branchId: updatedOrder.branchId ?? undefined,
        targetStaffId: updatedOrder.requestedByStaffId ?? undefined,
      });

      if (remainingPending === 0 && updatedOrder.requestedByStaffId) {
        await this.notificationService.create({
          title: 'Lab Order Completed',
          message: `All results for lab order ${updatedOrder.orderNumber} are ready.`,
          notificationType: 'LAB_ORDER_COMPLETED',
          severity: 'INFO',
          moduleName: 'LAB',
          entityType: 'LAB_ORDER',
          entityId: String(updatedOrder.id),
          facilityId: updatedOrder.facilityId,
          branchId: updatedOrder.branchId ?? undefined,
          targetStaffId: updatedOrder.requestedByStaffId,
        });
      }

      return result;
    } catch (error: any) {
      await this.notificationService.create({
        title: 'Lab Result Save Failed',
        message: `Failed to save result for order item ${createLabResultDto.orderItemId}.`,
        notificationType: 'LAB_RESULT_SAVE_FAILED',
        severity: 'CRITICAL',
        moduleName: 'LAB',
        entityType: 'LAB_ORDER_ITEM',
        entityId: String(createLabResultDto.orderItemId),
        facilityId: orderItem.order.facilityId,
        branchId: orderItem.order.branchId ?? undefined,
        targetStaffId: recorder?.id ?? undefined,
      });

      throw error;
    }
  }

  async createResultScoped(
    createLabResultDto: CreateLabResultDto,
    user: RequestUser,
  ) {
    const orderItem = await this.prisma.labOrderItem.findUnique({
      where: { id: createLabResultDto.orderItemId },
      include: {
        order: true,
      },
    });

    if (!orderItem) {
      throw new NotFoundException(
        `Lab order item with id ${createLabResultDto.orderItemId} not found`,
      );
    }

    this.scopeService.assertBranchAccess(
      user,
      orderItem.order.facilityId,
      orderItem.order.branchId,
    );

    if (createLabResultDto.recordedBy) {
      const recorder = await this.staffService.findOne(
        createLabResultDto.recordedBy,
      );

      this.scopeService.assertBranchAccess(
        user,
        recorder.facilityId,
        recorder.branchId,
      );
    }

    return this.createResult(createLabResultDto);
  }

  async getResultsByOrder(orderId: number) {
    await this.getOrderById(orderId);

    return this.prisma.labResult.findMany({
      where: {
        orderItem: {
          orderId,
        },
      },
      include: {
        orderItem: {
          include: {
            test: true,
            order: true,
          },
        },
      },
      orderBy: { id: 'desc' },
      take: 100,
    });
  }
  getAllOrdersScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.labOrder.findMany({
      where: scope,
      include: {
        facility: true,
        branch: true,
        patient: true,
        appointment: true,
        admission: true,
        requestedBy: true,
        items: {
          include: {
            test: true,
            results: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  async getOrderByIdScoped(id: number, user: RequestUser) {
    const order = await this.getOrderById(id);

    this.scopeService.assertBranchAccess(
      user,
      order.facilityId,
      order.branchId,
    );

    return order;
  }
  async getResultsByOrderScoped(orderId: number, user: RequestUser) {
    const order = await this.getOrderByIdScoped(orderId, user);

    return this.prisma.labResult.findMany({
      where: {
        orderItem: {
          orderId: order.id,
        },
      },
      include: {
        orderItem: {
          include: {
            test: true,
            order: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  async getLabQueueScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.labOrder.findMany({
      where: {
        ...scope,
        status: {
          in: ['REQUESTED', 'IN_PROGRESS'],
        },
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        appointment: true,
        admission: true,
        requestedBy: true,
        items: {
          include: {
            test: true,
            results: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  private async getScopedResult(id: number, user: RequestUser) {
    const result = await this.prisma.labResult.findUnique({
      where: { id },
      include: {
        orderItem: {
          include: {
            test: true,
            order: {
              include: {
                patient: true,
              },
            },
          },
        },
      },
    });
    if (!result) {
      throw new NotFoundException(`Lab result with id ${id} not found`);
    }
    this.scopeService.assertBranchAccess(
      user,
      result.orderItem.order.facilityId,
      result.orderItem.order.branchId,
    );
    return result;
  }

  async validateResult(
    id: number,
    dto: ValidateLabResultDto,
    user: RequestUser,
  ) {
    if (!user.staffId) {
      throw new BadRequestException(
        'A linked staff profile is required to validate lab results',
      );
    }
    const result = await this.getScopedResult(id, user);
    if (result.statusCode !== 'DRAFT') {
      throw new BadRequestException('Only draft results can be validated');
    }
    const validatedAt = new Date();
    const signatureHash = this.signLabResult(
      [
        result.id,
        result.orderItemId,
        result.resultValue,
        user.staffId,
        validatedAt.toISOString(),
      ].join('|'),
    );

    return this.prisma.$transaction(async (tx) => {
      const reserved = await tx.labResult.updateMany({
        where: { id, statusCode: 'DRAFT' },
        data: {
          statusCode: 'VALIDATED',
          validatedByStaffId: user.staffId!,
          validatedAt,
          validationNotes: dto.validationNotes?.trim(),
          signatureHash,
        },
      });
      if (reserved.count !== 1) {
        throw new BadRequestException(
          'This result was changed by another session',
        );
      }
      const validated = await tx.labResult.findUniqueOrThrow({
        where: { id },
      });
      await tx.auditLog.create({
        data: {
          moduleName: 'LAB',
          actionName: 'VALIDATE_LAB_RESULT',
          entityType: 'LAB_RESULT',
          entityId: String(id),
          facilityId: result.orderItem.order.facilityId,
          branchId: result.orderItem.order.branchId,
          actorUserId: user.userId,
          actorStaffId: user.staffId,
          beforeData: JSON.stringify(result),
          afterData: JSON.stringify(validated),
        },
      });
      return validated;
    });
  }

  async releaseResult(id: number, user: RequestUser) {
    if (!user.staffId) {
      throw new BadRequestException(
        'A linked staff profile is required to release lab results',
      );
    }
    const result = await this.getScopedResult(id, user);
    if (result.statusCode !== 'VALIDATED') {
      throw new BadRequestException(
        'A result must be validated before it can be released',
      );
    }
    const releasedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const reserved = await tx.labResult.updateMany({
        where: { id, statusCode: 'VALIDATED' },
        data: {
          statusCode: 'RELEASED',
          releasedByStaffId: user.staffId!,
          releasedAt,
        },
      });
      if (reserved.count !== 1) {
        throw new BadRequestException(
          'This result was changed by another session',
        );
      }
      const released = await tx.labResult.findUniqueOrThrow({ where: { id } });
      await tx.auditLog.create({
        data: {
          moduleName: 'LAB',
          actionName: 'RELEASE_LAB_RESULT',
          entityType: 'LAB_RESULT',
          entityId: String(id),
          facilityId: result.orderItem.order.facilityId,
          branchId: result.orderItem.order.branchId,
          actorUserId: user.userId,
          actorStaffId: user.staffId,
          beforeData: JSON.stringify(result),
          afterData: JSON.stringify(released),
        },
      });
      await tx.notification.create({
        data: {
          title: 'Lab Result Released',
          message: `${result.orderItem.test.testName} for order ${result.orderItem.order.orderNumber} is ready.`,
          notificationType: 'LAB_RESULT_RELEASED',
          severity: 'INFO',
          moduleName: 'LAB',
          entityType: 'LAB_RESULT',
          entityId: String(id),
          facilityId: result.orderItem.order.facilityId,
          branchId: result.orderItem.order.branchId,
          targetStaffId: result.orderItem.order.requestedByStaffId ?? undefined,
          targetUserId:
            result.orderItem.order.patient.portalUserId ?? undefined,
        },
      });
      return released;
    });
  }

  async amendResult(id: number, dto: AmendLabResultDto, user: RequestUser) {
    const result = await this.getScopedResult(id, user);
    if (result.statusCode === 'DRAFT') {
      throw new BadRequestException(
        'Draft results can be corrected before validation without amendment',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const amended = await tx.labResult.update({
        where: { id },
        data: {
          resultValue: dto.resultValue,
          remarks: dto.remarks ?? result.remarks,
          amendmentReason: dto.amendmentReason.trim(),
          statusCode: 'DRAFT',
          validatedByStaffId: null,
          validatedAt: null,
          validationNotes: null,
          releasedByStaffId: null,
          releasedAt: null,
          signatureHash: null,
        },
      });
      await tx.auditLog.create({
        data: {
          moduleName: 'LAB',
          actionName: 'AMEND_LAB_RESULT',
          entityType: 'LAB_RESULT',
          entityId: String(id),
          description: dto.amendmentReason.trim(),
          facilityId: result.orderItem.order.facilityId,
          branchId: result.orderItem.order.branchId,
          actorUserId: user.userId,
          actorStaffId: user.staffId ?? undefined,
          beforeData: JSON.stringify(result),
          afterData: JSON.stringify(amended),
        },
      });
      return amended;
    });
  }

  async getExternalReferrals(user: RequestUser) {
    return this.prisma.externalLabReferral.findMany({
      where: this.scopeService.buildBranchScopeWhere(user),
      include: {
        facility: true,
        branch: true,
        payments: true,
        items: {
          include: { test: true, result: true },
        },
      },
      orderBy: { receivedAt: 'desc' },
      take: 250,
    });
  }

  async createExternalReferral(
    dto: CreateExternalLabReferralDto,
    user: RequestUser,
  ) {
    this.scopeService.assertBranchAccess(user, dto.facilityId, dto.branchId);
    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
        select: { facilityId: true },
      });
      if (!branch || branch.facilityId !== dto.facilityId) {
        throw new BadRequestException(
          'Selected branch does not belong to the selected facility',
        );
      }
    }

    const uniqueTestIds = Array.from(
      new Set(dto.items.map((item) => item.testId)),
    );
    const tests = await this.prisma.labTestCatalog.findMany({
      where: { id: { in: uniqueTestIds }, isActive: true },
    });
    if (tests.length !== uniqueTestIds.length) {
      throw new BadRequestException(
        'One or more requested laboratory tests are invalid',
      );
    }
    const prices = new Map<number, number>();
    for (const test of tests) {
      prices.set(
        test.id,
        Number(
          await this.billingService.resolveChargePrice({
            facilityId: dto.facilityId,
            branchId: dto.branchId,
            category: 'LAB',
            code: `LAB_TEST_${test.id}`,
            labTestId: test.id,
            fallbackPrice: 0,
          }),
        ),
      );
    }

    const totalAmount = Array.from(prices.values()).reduce(
      (sum, price) => sum + price,
      0,
    );
    if (totalAmount <= 0) {
      throw new BadRequestException(
        'External laboratory tests require configured, non-zero tariffs before receipt',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const referral = await tx.externalLabReferral.create({
        data: {
          referralNumber: `XLAB-${randomUUID().slice(0, 12).toUpperCase()}`,
          invoiceNumber: `XLABINV-${randomUUID().slice(0, 12).toUpperCase()}`,
          totalAmount,
          balanceAmount: totalAmount,
          facilityId: dto.facilityId,
          branchId: dto.branchId,
          referringFacilityName: dto.referringFacilityName.trim(),
          referringFacilityContact: dto.referringFacilityContact?.trim(),
          referringClinicianName: dto.referringClinicianName?.trim(),
          externalPatientName: dto.externalPatientName.trim(),
          externalPatientIdentifier: dto.externalPatientIdentifier?.trim(),
          patientPhone: dto.patientPhone?.trim(),
          patientEmail: dto.patientEmail?.trim().toLowerCase(),
          sampleReference: dto.sampleReference.trim(),
          specimenType: dto.specimenType?.trim(),
          receivedByStaffId: user.staffId ?? undefined,
          clinicalNotes: dto.clinicalNotes?.trim(),
          urgency: dto.urgency?.trim().toUpperCase() || 'ROUTINE',
          items: {
            create: dto.items.map((item) => ({
              testId: item.testId,
              instructions: item.instructions?.trim(),
              priceAmount: prices.get(item.testId) ?? 0,
            })),
          },
        },
        include: {
          facility: true,
          branch: true,
          items: { include: { test: true } },
          payments: true,
        },
      });
      await tx.auditLog.create({
        data: {
          moduleName: 'LAB',
          actionName: 'CREATE_EXTERNAL_LAB_REFERRAL',
          entityType: 'EXTERNAL_LAB_REFERRAL',
          entityId: String(referral.id),
          facilityId: referral.facilityId,
          branchId: referral.branchId,
          actorUserId: user.userId,
          actorStaffId: user.staffId ?? undefined,
          afterData: JSON.stringify(referral),
        },
      });
      return referral;
    });
  }

  async createExternalLabPayment(
    id: number,
    dto: CreateExternalLabPaymentDto,
    user: RequestUser,
  ) {
    if (dto.paymentMethod !== 'CASH' && !dto.transactionReference?.trim()) {
      throw new BadRequestException(
        'A provider transaction reference is required for non-cash external laboratory payments',
      );
    }
    const scoped = await this.prisma.externalLabReferral.findUnique({
      where: { id },
      select: { facilityId: true, branchId: true },
    });
    if (!scoped) throw new NotFoundException('External referral not found');
    this.scopeService.assertBranchAccess(
      user,
      scoped.facilityId,
      scoped.branchId,
    );
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM external_lab_referrals WHERE id = ${id} FOR UPDATE`,
      );
      const referral = await tx.externalLabReferral.findUniqueOrThrow({
        where: { id },
      });
      if (dto.amount > Number(referral.balanceAmount)) {
        throw new BadRequestException(
          `Payment exceeds external invoice balance of ${referral.balanceAmount}`,
        );
      }
      const payment = await tx.externalLabPayment.create({
        data: {
          paymentNumber: `XLPAY-${randomUUID().slice(0, 12).toUpperCase()}`,
          externalLabReferralId: id,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          transactionReference: dto.transactionReference?.trim(),
          receivedByUserId: user.userId,
          receivedByStaffId: user.staffId ?? undefined,
        },
      });
      const paidAmount = Number(referral.paidAmount) + dto.amount;
      const balanceAmount = Math.max(
        0,
        Number(referral.totalAmount) - paidAmount,
      );
      const updated = await tx.externalLabReferral.update({
        where: { id },
        data: {
          paidAmount,
          balanceAmount,
          billingStatus: balanceAmount === 0 ? 'PAID' : 'PARTIALLY_PAID',
        },
        include: {
          items: { include: { test: true, result: true } },
          payments: true,
        },
      });
      await tx.auditLog.create({
        data: {
          moduleName: 'LAB',
          actionName: 'EXTERNAL_LAB_PAYMENT',
          entityType: 'EXTERNAL_LAB_PAYMENT',
          entityId: String(payment.id),
          facilityId: referral.facilityId,
          branchId: referral.branchId,
          actorUserId: user.userId,
          actorStaffId: user.staffId ?? undefined,
          afterData: JSON.stringify(payment),
        },
      });
      return updated;
    });
  }

  async createExternalReportShare(
    id: number,
    dto: CreateExternalLabReportShareDto,
    user: RequestUser,
  ) {
    const referral = await this.prisma.externalLabReferral.findUnique({
      where: { id },
      include: { items: { include: { result: true } } },
    });
    if (!referral) throw new NotFoundException('External referral not found');
    this.scopeService.assertBranchAccess(
      user,
      referral.facilityId,
      referral.branchId,
    );
    if (
      referral.statusCode !== 'RELEASED' ||
      referral.items.some((item) => item.result?.statusCode !== 'RELEASED')
    ) {
      throw new BadRequestException(
        'All results must be released before creating a report link',
      );
    }
    if (referral.billingStatus !== 'PAID') {
      throw new BadRequestException(
        'The external laboratory invoice must be paid before report delivery',
      );
    }
    const expiresInHours = Math.min(Math.max(dto.expiresInHours ?? 72, 1), 168);
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const share = await this.prisma.externalLabReportShare.create({
      data: {
        externalLabReferralId: id,
        tokenHash,
        expiresAt: new Date(Date.now() + expiresInHours * 3_600_000),
        createdByUserId: user.userId,
      },
    });
    return {
      id: share.id,
      expiresAt: share.expiresAt,
      accessPath: `/lab-report-access/${token}/pdf`,
    };
  }

  private async accessExternalReport(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const share = await this.prisma.externalLabReportShare.findUnique({
      where: { tokenHash },
      include: {
        referral: {
          include: {
            facility: true,
            branch: true,
            items: { include: { test: true, result: true } },
          },
        },
      },
    });
    if (
      !share ||
      share.revokedAt ||
      share.expiresAt <= new Date() ||
      share.referral.statusCode !== 'RELEASED'
    ) {
      throw new NotFoundException('The report link is invalid or expired');
    }

    const hasInvalidResultSignature = share.referral.items.some(
      ({ result }) => {
        if (
          !result ||
          !result.signatureHash ||
          !result.validatedByStaffId ||
          !result.validatedAt
        ) {
          return true;
        }
        const expected = this.signLabResult(
          `${result.id}|${result.resultValue}|${result.validatedByStaffId}|${result.validatedAt.toISOString()}`,
        );
        return expected !== result.signatureHash;
      },
    );
    if (hasInvalidResultSignature) {
      throw new NotFoundException(
        'The report is unavailable because its integrity check failed',
      );
    }

    await this.prisma.externalLabReportShare.update({
      where: { id: share.id },
      data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
    });
    return share.referral;
  }

  async getExternalReportPdf(token: string) {
    const referral = await this.accessExternalReport(token);
    return createHospitalPdfBuffer(
      {
        title: 'External Laboratory Report',
        subtitle: referral.referralNumber,
        reference: referral.invoiceNumber,
        facility: referral.facility,
        branch: referral.branch,
      },
      (doc) => {
        addSectionTitle(doc, 'Referral details');
        addKeyValueGrid(doc, [
          { label: 'Patient', value: referral.externalPatientName },
          {
            label: 'Patient identifier',
            value: referral.externalPatientIdentifier,
          },
          {
            label: 'Referring facility',
            value: referral.referringFacilityName,
          },
          { label: 'Sample', value: referral.sampleReference },
          { label: 'Received', value: formatPdfDate(referral.receivedAt) },
          { label: 'Status', value: referral.statusCode },
        ]);
        addSectionTitle(doc, 'Released results');
        addCompactTable(
          doc,
          [
            {
              header: 'Test',
              width: 130,
              render: (item: (typeof referral.items)[number]) =>
                item.test.testName,
            },
            {
              header: 'Result',
              width: 145,
              render: (item: (typeof referral.items)[number]) =>
                item.result?.resultValue,
            },
            {
              header: 'Remarks',
              width: 150,
              render: (item: (typeof referral.items)[number]) =>
                item.result?.remarks,
            },
            {
              header: 'Released',
              width: 95,
              render: (item: (typeof referral.items)[number]) =>
                formatPdfDate(item.result?.releasedAt),
            },
          ],
          referral.items,
        );
      },
    );
  }

  async createExternalResult(
    itemId: number,
    dto: CreateExternalLabResultDto,
    user: RequestUser,
  ) {
    const item = await this.prisma.externalLabOrderItem.findUnique({
      where: { id: itemId },
      include: { referral: true, result: true, test: true },
    });
    if (!item) {
      throw new NotFoundException(`External lab item ${itemId} not found`);
    }
    this.scopeService.assertBranchAccess(
      user,
      item.referral.facilityId,
      item.referral.branchId,
    );
    if (item.result) {
      throw new BadRequestException('A result already exists for this item');
    }

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.externalLabResult.create({
        data: {
          externalLabOrderItemId: item.id,
          resultValue: dto.resultValue,
          remarks: dto.remarks,
          recordedByStaffId: user.staffId ?? undefined,
        },
      });
      await tx.externalLabOrderItem.update({
        where: { id: item.id },
        data: { statusCode: 'RESULTED' },
      });
      const pending = await tx.externalLabOrderItem.count({
        where: {
          externalLabReferralId: item.externalLabReferralId,
          statusCode: { not: 'RESULTED' },
        },
      });
      await tx.externalLabReferral.update({
        where: { id: item.externalLabReferralId },
        data: { statusCode: pending === 0 ? 'RESULTED' : 'IN_PROGRESS' },
      });
      return result;
    });
  }

  private async getScopedExternalResult(id: number, user: RequestUser) {
    const result = await this.prisma.externalLabResult.findUnique({
      where: { id },
      include: {
        orderItem: {
          include: { referral: true, test: true },
        },
      },
    });
    if (!result) {
      throw new NotFoundException(`External lab result ${id} not found`);
    }
    this.scopeService.assertBranchAccess(
      user,
      result.orderItem.referral.facilityId,
      result.orderItem.referral.branchId,
    );
    return result;
  }

  async validateExternalResult(
    id: number,
    dto: ValidateLabResultDto,
    user: RequestUser,
  ) {
    if (!user.staffId) {
      throw new BadRequestException(
        'A linked staff profile is required to validate results',
      );
    }
    const result = await this.getScopedExternalResult(id, user);
    if (result.statusCode !== 'DRAFT') {
      throw new BadRequestException('Only draft results can be validated');
    }
    const validatedAt = new Date();
    const signatureHash = this.signLabResult(
      `${result.id}|${result.resultValue}|${user.staffId}|${validatedAt.toISOString()}`,
    );
    return this.prisma.$transaction(async (tx) => {
      const reserved = await tx.externalLabResult.updateMany({
        where: { id, statusCode: 'DRAFT' },
        data: {
          statusCode: 'VALIDATED',
          validatedByStaffId: user.staffId!,
          validatedAt,
          validationNotes: dto.validationNotes?.trim(),
          signatureHash,
        },
      });
      if (reserved.count !== 1) {
        throw new BadRequestException(
          'This external result was changed by another session',
        );
      }
      const validated = await tx.externalLabResult.findUniqueOrThrow({
        where: { id },
      });
      await tx.auditLog.create({
        data: {
          moduleName: 'LAB',
          actionName: 'VALIDATE_EXTERNAL_LAB_RESULT',
          entityType: 'EXTERNAL_LAB_RESULT',
          entityId: String(id),
          facilityId: result.orderItem.referral.facilityId,
          branchId: result.orderItem.referral.branchId,
          actorUserId: user.userId,
          actorStaffId: user.staffId,
          beforeData: JSON.stringify(result),
          afterData: JSON.stringify(validated),
        },
      });
      return validated;
    });
  }

  async releaseExternalResult(id: number, user: RequestUser) {
    if (!user.staffId) {
      throw new BadRequestException(
        'A linked staff profile is required to release results',
      );
    }
    const result = await this.getScopedExternalResult(id, user);
    if (result.statusCode !== 'VALIDATED') {
      throw new BadRequestException(
        'A result must be validated before release',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const releasedAt = new Date();
      const reserved = await tx.externalLabResult.updateMany({
        where: { id, statusCode: 'VALIDATED' },
        data: {
          statusCode: 'RELEASED',
          releasedByStaffId: user.staffId!,
          releasedAt,
        },
      });
      if (reserved.count !== 1) {
        throw new BadRequestException(
          'This external result was changed by another session',
        );
      }
      await tx.externalLabOrderItem.update({
        where: { id: result.externalLabOrderItemId },
        data: { statusCode: 'RELEASED' },
      });
      const remaining = await tx.externalLabOrderItem.count({
        where: {
          externalLabReferralId: result.orderItem.externalLabReferralId,
          statusCode: { not: 'RELEASED' },
        },
      });
      if (remaining === 0) {
        await tx.externalLabReferral.update({
          where: { id: result.orderItem.externalLabReferralId },
          data: { statusCode: 'RELEASED', completedAt: releasedAt },
        });
      }
      const released = await tx.externalLabResult.findUniqueOrThrow({
        where: { id },
      });
      await tx.auditLog.create({
        data: {
          moduleName: 'LAB',
          actionName: 'RELEASE_EXTERNAL_LAB_RESULT',
          entityType: 'EXTERNAL_LAB_RESULT',
          entityId: String(id),
          facilityId: result.orderItem.referral.facilityId,
          branchId: result.orderItem.referral.branchId,
          actorUserId: user.userId,
          actorStaffId: user.staffId,
          beforeData: JSON.stringify(result),
          afterData: JSON.stringify(released),
        },
      });
      return released;
    });
  }
}
