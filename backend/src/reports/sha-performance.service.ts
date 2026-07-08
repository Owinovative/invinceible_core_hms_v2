import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ShaPerformanceQuery {
  facilityId: number;
  branchId?: number;
  startDate: string;
  endDate: string;
}

@Injectable()
export class ShaPerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getClaimAgingReport(query: ShaPerformanceQuery) {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);
    
    // Group claims by age based on submittedAt (e.g., 0-30 days, 31-60 days, 61-90 days, 90+ days)
    const claims = await this.prisma.shaClaim.findMany({
      where: {
        facilityId: query.facilityId,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        submittedAt: { not: null },
        createdAt: { gte: start, lte: end },
        statusCode: { in: ['SUBMITTED', 'PENDING'] },
      },
      select: {
        id: true,
        submittedAt: true,
        claimedAmount: true,
        statusCode: true,
      }
    });

    const now = new Date().getTime();
    const buckets = {
      '0-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 },
    };

    for (const claim of claims) {
      if (!claim.submittedAt) continue;
      const daysOld = Math.floor((now - claim.submittedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysOld <= 30) {
        buckets['0-30'].count++;
        buckets['0-30'].amount += claim.claimedAmount;
      } else if (daysOld <= 60) {
        buckets['31-60'].count++;
        buckets['31-60'].amount += claim.claimedAmount;
      } else if (daysOld <= 90) {
        buckets['61-90'].count++;
        buckets['61-90'].amount += claim.claimedAmount;
      } else {
        buckets['90+'].count++;
        buckets['90+'].amount += claim.claimedAmount;
      }
    }

    return buckets;
  }

  async getFacilityPerformanceReport(query: ShaPerformanceQuery) {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);
    
    // Aggregate by status
    const claims = await this.prisma.shaClaim.groupBy({
      by: ['statusCode'],
      where: {
        facilityId: query.facilityId,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        createdAt: { gte: start, lte: end },
      },
      _count: { id: true },
      _sum: {
        claimedAmount: true,
        approvedAmount: true,
        paidAmount: true,
        rejectedAmount: true,
      },
    });

    const summary = {
      totalClaims: 0,
      totalClaimed: 0,
      totalApproved: 0,
      totalPaid: 0,
      totalRejected: 0,
      byStatus: {} as Record<string, { count: number; amount: number }>,
    };

    for (const group of claims) {
      const count = group._count.id;
      const amount = group._sum.claimedAmount || 0;
      
      summary.totalClaims += count;
      summary.totalClaimed += amount;
      summary.totalApproved += group._sum.approvedAmount || 0;
      summary.totalPaid += group._sum.paidAmount || 0;
      summary.totalRejected += group._sum.rejectedAmount || 0;
      
      summary.byStatus[group.statusCode] = { count, amount };
    }

    // Calculate loss ratio
    const lossRatio = summary.totalClaimed > 0 ? (summary.totalRejected / summary.totalClaimed) * 100 : 0;
    
    // Calculate recovery percentage
    const recoveryPercentage = summary.totalClaimed > 0 ? (summary.totalPaid / summary.totalClaimed) * 100 : 0;

    return {
      ...summary,
      lossRatio,
      recoveryPercentage,
    };
  }
}
