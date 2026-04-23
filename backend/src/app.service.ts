import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHello() {
    const facilityCount = await this.prisma.facility.count();
    const patientCount = await this.prisma.patient.count();
    const staffCount = await this.prisma.staff.count();

    return {
      message: 'Backend is running with Prisma + MySQL',
      stats: {
        facilities: facilityCount,
        patients: patientCount,
        staff: staffCount,
      },
    };
  }
}
