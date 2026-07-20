import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Injectable()
export class QueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  async getFullQueue() {
    const appointments = await this.prisma.appointment.findMany({
      include: {
        patient: true,
        doctor: true,
        clinic: true,
      },
      orderBy: [{ appointmentDate: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      booked: appointments.filter((a) => a.statusCode === 'BOOKED'),
      checkedIn: appointments.filter((a) => a.statusCode === 'CHECKED_IN'),
      readyForDoctor: appointments.filter(
        (a) => a.statusCode === 'READY_FOR_DOCTOR',
      ),
      inConsultation: appointments.filter(
        (a) => a.statusCode === 'IN_CONSULTATION',
      ),
      completed: appointments.filter((a) => a.statusCode === 'COMPLETED'),
    };
  }
  async getFullQueueScoped(user: RequestUser, branchId?: number) {
    const scope = this.buildQueueScope(user, branchId);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        ...scope,
        statusCode: {
          in: ['BOOKED', 'CHECKED_IN', 'READY_FOR_DOCTOR', 'IN_CONSULTATION'],
        },
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
      orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
    });

    return this.sortAppointmentsByClinicalPriority(appointments);
  }

  async getTodayQueueScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        ...scope,
        appointmentDate: {
          gte: start,
          lte: end,
        },
        statusCode: {
          in: ['BOOKED', 'CHECKED_IN', 'READY_FOR_DOCTOR', 'IN_CONSULTATION'],
        },
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
      orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
    });

    return this.sortAppointmentsByClinicalPriority(appointments);
  }

  async getWaitingQueueScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        ...scope,
        statusCode: {
          in: ['BOOKED', 'CHECKED_IN', 'READY_FOR_DOCTOR'],
        },
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
      orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
    });

    return this.sortAppointmentsByClinicalPriority(appointments);
  }

  async getDoctorQueueScoped(doctorId: number, user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        ...scope,
        doctorId,
        statusCode: {
          in: ['BOOKED', 'CHECKED_IN', 'READY_FOR_DOCTOR', 'IN_CONSULTATION'],
        },
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
      orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
    });

    return this.sortAppointmentsByClinicalPriority(appointments);
  }

  async getQueueStatsScoped(user: RequestUser, branchId?: number) {
    const scope = this.buildQueueScope(user, branchId);

    const total = await this.prisma.appointment.count({
      where: {
        ...scope,
        statusCode: {
          in: ['BOOKED', 'CHECKED_IN', 'READY_FOR_DOCTOR', 'IN_CONSULTATION'],
        },
      },
    });

    const waiting = await this.prisma.appointment.count({
      where: {
        ...scope,
        statusCode: {
          in: ['BOOKED', 'CHECKED_IN', 'READY_FOR_DOCTOR'],
        },
      },
    });

    const inConsultation = await this.prisma.appointment.count({
      where: {
        ...scope,
        statusCode: 'IN_CONSULTATION',
      },
    });

    const completed = await this.prisma.appointment.count({
      where: {
        ...scope,
        statusCode: 'COMPLETED',
      },
    });

    return {
      total,
      waiting,
      inProgress: inConsultation,
      inConsultation,
      completed,
    };
  }

  async getTodayQueue() {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        patient: true,
        doctor: true,
        clinic: true,
      },
      orderBy: [{ appointmentDate: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      date: today,
      booked: appointments.filter((a) => a.statusCode === 'BOOKED'),
      checkedIn: appointments.filter((a) => a.statusCode === 'CHECKED_IN'),
      readyForDoctor: appointments.filter(
        (a) => a.statusCode === 'READY_FOR_DOCTOR',
      ),
      inConsultation: appointments.filter(
        (a) => a.statusCode === 'IN_CONSULTATION',
      ),
      completed: appointments.filter((a) => a.statusCode === 'COMPLETED'),
    };
  }

  async getWaitingQueue() {
    return this.prisma.appointment.findMany({
      where: {
        statusCode: {
          in: ['BOOKED', 'CHECKED_IN', 'READY_FOR_DOCTOR'],
        },
      },
      include: {
        patient: true,
        doctor: true,
        clinic: true,
      },
      orderBy: [{ appointmentDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getDoctorQueue(doctorId: number) {
    return this.prisma.appointment.findMany({
      where: {
        doctorId,
        statusCode: {
          in: ['BOOKED', 'CHECKED_IN', 'READY_FOR_DOCTOR', 'IN_CONSULTATION'],
        },
      },
      include: {
        patient: true,
        doctor: true,
        clinic: true,
      },
      orderBy: [{ appointmentDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getQueueStats() {
    const total = await this.prisma.appointment.count();
    const booked = await this.prisma.appointment.count({
      where: { statusCode: 'BOOKED' },
    });
    const checkedIn = await this.prisma.appointment.count({
      where: { statusCode: 'CHECKED_IN' },
    });
    const inConsultation = await this.prisma.appointment.count({
      where: { statusCode: 'IN_CONSULTATION' },
    });
    const completed = await this.prisma.appointment.count({
      where: { statusCode: 'COMPLETED' },
    });

    return {
      total,
      booked,
      checkedIn,
      inConsultation,
      completed,
    };
  }

  private sortAppointmentsByClinicalPriority<
    T extends {
      triagePriority?: string | null;
      appointmentDate?: Date | string | null;
      createdAt?: Date | string | null;
    },
  >(appointments: T[]) {
    const priorityWeight: Record<string, number> = {
      CRITICAL: 0,
      EMERGENCY: 0,
      URGENT: 1,
      HIGH: 1,
      NORMAL: 2,
      ROUTINE: 2,
      LOW: 3,
    };

    return appointments.sort((left, right) => {
      const leftPriority =
        priorityWeight[String(left.triagePriority ?? 'NORMAL').toUpperCase()] ??
        2;
      const rightPriority =
        priorityWeight[
          String(right.triagePriority ?? 'NORMAL').toUpperCase()
        ] ?? 2;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return (
        this.dateValue(left.appointmentDate ?? left.createdAt) -
        this.dateValue(right.appointmentDate ?? right.createdAt)
      );
    });
  }

  private dateValue(value?: Date | string | null) {
    const date = value ? new Date(value) : new Date(0);
    return Number.isFinite(date.getTime()) ? date.getTime() : 0;
  }

  private buildQueueScope(user: RequestUser, branchId?: number) {
    const scope = this.scopeService.buildReadScope(user);
    if (!branchId) return scope;

    if (user.roleCode !== 'SUPER_ADMIN') {
      this.scopeService.assertBranchAccess(user, user.homeFacilityId!, branchId);
    }

    return { ...scope, branchId };
  }
}
