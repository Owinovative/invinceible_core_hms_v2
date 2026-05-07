import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  ) {}
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
        unitPrice,
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
}
