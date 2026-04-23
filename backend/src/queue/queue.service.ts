import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';


@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService, private readonly scopeService: ScopeService) {}

  async getFullQueue() {
    const appointments = await this.prisma.appointment.findMany({
      include: {
        patient: true,
        doctor: true,
        clinic: true,
      },
      orderBy: [
        { appointmentDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return {
      booked: appointments.filter((a) => a.statusCode === 'BOOKED'),
      checkedIn: appointments.filter((a) => a.statusCode === 'CHECKED_IN'),
      inConsultation: appointments.filter(
        (a) => a.statusCode === 'IN_CONSULTATION',
      ),
      completed: appointments.filter((a) => a.statusCode === 'COMPLETED'),
    };
  }
  getFullQueueScoped(user: RequestUser) {
  const scope = this.scopeService.buildReadScope(user);

  return this.prisma.appointment.findMany({
    where: {
      ...scope,
      statusCode: {
        in: ['BOOKED', 'CHECKED_IN', 'IN_CONSULTATION'],
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
}

getTodayQueueScoped(user: RequestUser) {
  const scope = this.scopeService.buildReadScope(user);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return this.prisma.appointment.findMany({
    where: {
      ...scope,
      appointmentDate: {
        gte: start,
        lte: end,
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
}

getWaitingQueueScoped(user: RequestUser) {
  const scope = this.scopeService.buildReadScope(user);

  return this.prisma.appointment.findMany({
    where: {
      ...scope,
      statusCode: {
        in: ['BOOKED', 'CHECKED_IN'],
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
}

async getDoctorQueueScoped(doctorId: number, user: RequestUser) {
  const scope = this.scopeService.buildReadScope(user);

  return this.prisma.appointment.findMany({
    where: {
      ...scope,
      doctorId,
      statusCode: {
        in: ['BOOKED', 'CHECKED_IN', 'IN_CONSULTATION'],
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
}

async getQueueStatsScoped(user: RequestUser) {
  const scope = this.scopeService.buildReadScope(user);

  const total = await this.prisma.appointment.count({
    where: {
      ...scope,
      statusCode: {
        in: ['BOOKED', 'CHECKED_IN', 'IN_CONSULTATION'],
      },
    },
  });

  const waiting = await this.prisma.appointment.count({
    where: {
      ...scope,
      statusCode: {
        in: ['BOOKED', 'CHECKED_IN'],
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
      orderBy: [
        { appointmentDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return {
      date: today,
      booked: appointments.filter((a) => a.statusCode === 'BOOKED'),
      checkedIn: appointments.filter((a) => a.statusCode === 'CHECKED_IN'),
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
          in: ['BOOKED', 'CHECKED_IN'],
        },
      },
      include: {
        patient: true,
        doctor: true,
        clinic: true,
      },
      orderBy: [
        { appointmentDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async getDoctorQueue(doctorId: number) {
    return this.prisma.appointment.findMany({
      where: {
        doctorId,
        statusCode: {
          in: ['BOOKED', 'CHECKED_IN', 'IN_CONSULTATION'],
        },
      },
      include: {
        patient: true,
        doctor: true,
        clinic: true,
      },
      orderBy: [
        { appointmentDate: 'asc' },
        { createdAt: 'asc' },
      ],
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
}
