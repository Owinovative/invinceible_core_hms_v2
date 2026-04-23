import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DoctorLabReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrdersByAppointment(appointmentId: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: true,
        clinic: true,
        consultation: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Appointment with id ${appointmentId} not found`,
      );
    }

    const orders = await this.prisma.labOrder.findMany({
      where: {
        appointmentId,
      },
      include: {
        requestedBy: true,
        items: {
          include: {
            test: true,
            results: true,
          },
        },
        patient: true,
        appointment: true,
      },
      orderBy: { id: 'desc' },
    });

    return {
      appointment,
      orders,
    };
  }

  async getSingleOrderReview(orderId: number) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: orderId },
      include: {
        patient: true,
        appointment: {
          include: {
            doctor: true,
            consultation: true,
            clinic: true,
          },
        },
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
      throw new NotFoundException(`Lab order with id ${orderId} not found`);
    }

    const totalItems = order.items.length;
    const resultedItems = order.items.filter(
      (item) => item.status === 'RESULTED',
    ).length;

    return {
      order,
      summary: {
        totalItems,
        resultedItems,
        pendingItems: totalItems - resultedItems,
        isFullyResulted: totalItems > 0 && totalItems === resultedItems,
      },
    };
  }

  async getDoctorPendingReviews(doctorId: number) {
    const doctor = await this.prisma.staff.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with id ${doctorId} not found`);
    }

    const orders = await this.prisma.labOrder.findMany({
      where: {
        appointment: {
          doctorId,
        },
      },
      include: {
        patient: true,
        appointment: {
          include: {
            doctor: true,
            consultation: true,
          },
        },
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

    return orders.map((order) => {
      const totalItems = order.items.length;
      const resultedItems = order.items.filter(
        (item) => item.status === 'RESULTED',
      ).length;

      return {
        ...order,
        reviewSummary: {
          totalItems,
          resultedItems,
          pendingItems: totalItems - resultedItems,
          isFullyResulted: totalItems > 0 && totalItems === resultedItems,
        },
      };
    });
  }
}
