import { Controller, Get, Query, Param, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TerminologyGateway } from './terminology-gateway.service';
import { TerminologySyncService } from './terminology-sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('terminology')
@UseGuards(JwtAuthGuard)
export class TerminologyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TerminologyGateway,
    private readonly syncService: TerminologySyncService,
  ) {}

  @Get('health')
  async checkHealth() {
    const gatewayHealth = await this.gateway.checkHealth();
    const lastSync = await this.prisma.terminologySyncHistory.findFirst({
      orderBy: { startedAt: 'desc' },
    });

    return {
      status: gatewayHealth.status,
      error: gatewayHealth.error,
      lastSync: lastSync
        ? {
            status: lastSync.status,
            date: lastSync.completedAt || lastSync.startedAt,
            target: lastSync.targetSystem,
          }
        : null,
    };
  }

  /**
   * GET /terminology/metrics
   * Exposes comprehensive terminology metrics including coverage statistics,
   * sync history, active versions, latency, and certification readiness indicators.
   */
  @Get('metrics')
  async getMetrics() {
    const [
      totalConcepts,
      totalSources,
      totalCollections,
      totalMappings,
      recentSyncs,
      versions,
      conceptsByClass,
      // Coverage queries
      totalConsultations,
      codedConsultations,
      totalClaims,
      codedClaims,
      totalMedicines,
      codedMedicines,
      totalLabTests,
      codedLabTests,
    ] = await Promise.all([
      this.prisma.terminologyConcept.count(),
      this.prisma.terminologySource.count(),
      this.prisma.terminologyCollection.count(),
      this.prisma.terminologyMapping.count(),
      this.prisma.terminologySyncHistory.findMany({
        take: 20,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.terminologyVersion.findMany({
        where: { isCurrent: true },
      }),
      this.prisma.terminologyConcept.groupBy({
        by: ['conceptClass'],
        _count: { id: true },
        where: { retired: false },
      }),
      // Coverage: Consultations
      this.prisma.consultation.count(),
      this.prisma.consultation.count({
        where: { primaryDiagnosisId: { not: null } },
      }),
      // Coverage: SHA Claims
      this.prisma.shaClaim.count(),
      this.prisma.shaClaim.count({
        where: { diagnosisConceptId: { not: null } },
      }),
      // Coverage: Medicines
      this.prisma.medicine.count(),
      this.prisma.medicine.count({
        where: { terminologyConceptId: { not: null } },
      }),
      // Coverage: Lab Tests
      this.prisma.labTestCatalog.count(),
      this.prisma.labTestCatalog.count({
        where: { terminologyConceptId: { not: null } },
      }),
    ]);

    // Compute latency averages from successful syncs
    const successfulSyncs = recentSyncs.filter((s) => s.status === 'SUCCESS');
    const avgDurationMs =
      successfulSyncs.length > 0
        ? Math.round(
            successfulSyncs.reduce((sum, s) => sum + s.durationMs, 0) /
              successfulSyncs.length,
          )
        : 0;

    const lastSuccessful = recentSyncs.find((s) => s.status === 'SUCCESS');
    const lastFailed = recentSyncs.find((s) => s.status === 'FAILED');

    return {
      totalConcepts,
      totalSources,
      totalCollections,
      totalMappings,
      conceptsByClass: conceptsByClass.map((c) => ({
        conceptClass: c.conceptClass || 'Unknown',
        count: c._count.id,
      })),
      activeVersions: versions,
      recentSyncs,
      latency: {
        averageSyncDurationMs: avgDurationMs,
      },
      coverage: {
        consultations: {
          total: totalConsultations,
          coded: codedConsultations,
          percentage:
            totalConsultations > 0
              ? Math.round((codedConsultations / totalConsultations) * 100)
              : 0,
        },
        claims: {
          total: totalClaims,
          coded: codedClaims,
          percentage:
            totalClaims > 0 ? Math.round((codedClaims / totalClaims) * 100) : 0,
        },
        medicines: {
          total: totalMedicines,
          coded: codedMedicines,
          percentage:
            totalMedicines > 0
              ? Math.round((codedMedicines / totalMedicines) * 100)
              : 0,
        },
        labTests: {
          total: totalLabTests,
          coded: codedLabTests,
          percentage:
            totalLabTests > 0
              ? Math.round((codedLabTests / totalLabTests) * 100)
              : 0,
        },
      },
      lastSuccessfulSync: lastSuccessful
        ? {
            date: lastSuccessful.completedAt || lastSuccessful.startedAt,
            durationMs: lastSuccessful.durationMs,
            target: lastSuccessful.targetSystem,
          }
        : null,
      lastFailedSync: lastFailed
        ? {
            date: lastFailed.completedAt || lastFailed.startedAt,
            error: lastFailed.errorMessage,
            target: lastFailed.targetSystem,
          }
        : null,
    };
  }

  /**
   * GET /terminology/search
   *
   * 7-Tier Weighted Search Ranking Algorithm:
   *   Tier 1: Exact code match              (weight 700)
   *   Tier 2: Exact display match           (weight 600)
   *   Tier 3: Prefix match (display)        (weight 500)
   *   Tier 4: Synonym match (from metadata) (weight 400)
   *   Tier 5: Partial / contains match      (weight 300)
   *   Tier 6: Usage popularity              (weight up to 50, NEVER overrides tiers 1-5)
   *   Tier 7: Alphabetical fallback         (weight 0)
   *
   * Popularity MUST NEVER outrank an exact code or display match.
   */
  @Get('search')
  async searchLocalConcepts(
    @Query('q') query: string,
    @Query('system') system?: string,
    @Query('conceptClass') conceptClass?: string,
    @Query('limit') limit = '50',
  ) {
    if (!query || query.length < 2) {
      return [];
    }

    const parsedLimit = parseInt(limit, 10) || 50;
    const qLower = query.toLowerCase();

    const whereClause: any = {
      OR: [
        { code: { equals: query } },
        { display: { contains: query } },
        { code: { startsWith: query } },
      ],
      retired: false,
    };

    if (system) {
      whereClause.system = system;
    }

    if (conceptClass) {
      whereClause.conceptClass = conceptClass;
    }

    const results = await this.prisma.terminologyConcept.findMany({
      where: whereClause,
      take: parsedLimit * 2, // Over-fetch to account for re-ranking
    });

    // Score each result using the 7-tier algorithm
    const scored = results.map((concept) => {
      let score = 0;
      const codeLower = concept.code.toLowerCase();
      const displayLower = concept.display.toLowerCase();

      // Tier 1: Exact code match (highest priority)
      if (codeLower === qLower) score += 700;

      // Tier 2: Exact display match
      if (displayLower === qLower) score += 600;

      // Tier 3: Prefix match on display
      if (displayLower.startsWith(qLower) && displayLower !== qLower)
        score += 500;

      // Tier 4: Synonym match (from metadata.names or metadata.synonyms)
      const metadata = concept.metadata as any;
      if (metadata) {
        const names: string[] = metadata.names || metadata.synonyms || [];
        const hasSynonymMatch =
          Array.isArray(names) &&
          names.some((n: any) => {
            const nameStr = typeof n === 'string' ? n : n?.name || '';
            return nameStr.toLowerCase().includes(qLower);
          });
        if (hasSynonymMatch) score += 400;
      }

      // Tier 5: Partial / contains match (if not already scored higher)
      if (
        score < 500 &&
        (displayLower.includes(qLower) || codeLower.includes(qLower))
      ) {
        score += 300;
      }

      // Tier 6: Usage popularity (max 50 points, NEVER overrides tiers 1-5)
      // Popularity is strictly a tie-breaker within tiers
      const usageCount = (metadata?.usageCount as number) || 0;
      score += Math.min(usageCount, 50);

      return { concept, score };
    });

    // Sort by score desc, then alphabetical fallback (Tier 7)
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.concept.display.localeCompare(b.concept.display);
    });

    return scored.slice(0, parsedLimit).map((s) => s.concept);
  }

  @Get('remote-search')
  async searchRemoteConcepts(
    @Query('q') query: string,
    @Query('source') source?: string,
  ) {
    return this.gateway.searchConcepts({
      search: query,
      source: source,
      limit: 25,
    });
  }

  /**
   * POST /terminology/sync/trigger
   * Manually triggers a terminology sync for all configured systems.
   */
  @Post('sync/trigger')
  async triggerManualSync() {
    // Fire and forget — the sync runs asynchronously
    const systems = [
      {
        url: 'https://hie-docs.dha.go.ke/orgs/DHA/sources/ICD-11-MMS/',
        version: '2024',
      },
      {
        url: 'https://hie-docs.dha.go.ke/orgs/DHA/sources/KEML/',
        version: '2024',
      },
      {
        url: 'https://hie-docs.dha.go.ke/orgs/DHA/sources/LOINC/',
        version: '2024',
      },
    ];

    const results: any[] = [];
    for (const sys of systems) {
      try {
        await this.syncService.synchronizeSystem(
          sys.url,
          sys.version,
          'MANUAL',
        );
        results.push({ system: sys.url, status: 'SUCCESS' });
      } catch (e: any) {
        results.push({ system: sys.url, status: 'FAILED', error: e.message });
      }
    }

    return { triggered: true, results };
  }

  /**
   * GET /terminology/sync/history
   * Returns detailed synchronization history.
   */
  @Get('sync/history')
  async getSyncHistory(@Query('limit') limit = '50') {
    return this.prisma.terminologySyncHistory.findMany({
      take: parseInt(limit, 10) || 50,
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * GET /terminology/collections
   * Returns all terminology collections.
   */
  @Get('collections')
  async getCollections() {
    return this.prisma.terminologyCollection.findMany({
      include: { _count: { select: { concepts: true } } },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * GET /terminology/sources
   * Returns all terminology sources.
   */
  @Get('sources')
  async getSources() {
    return this.prisma.terminologySource.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
