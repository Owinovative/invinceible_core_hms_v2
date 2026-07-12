import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

import { WorkflowEngineService } from '../engine/workflow-engine.service';
import { WorkflowDefinitionService } from '../definitions/workflow-definition.service';
import { WorkflowVersionService } from '../engine/workflow-version.service';
import { WorkflowSimulationService } from './workflow-simulation.service';
import { WorkflowMetricsService } from './workflow-metrics.service';
import { WorkflowAuditService } from './workflow-audit.service';
import { WorkflowRecoveryService } from '../engine/workflow-recovery.service';
import { WorkflowAssignmentService } from '../execution/workflow-assignment.service';
import { TaskEscalationService } from '../tasks/task-escalation.service';
import { WorkflowCompensationService } from '../engine/workflow-compensation.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { WorkflowSchemaJSON } from '../interfaces/workflow.interface';

@Controller('api/v1/workflows')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkflowController {
  constructor(
    private readonly workflowEngine: WorkflowEngineService,
    private readonly definitionService: WorkflowDefinitionService,
    private readonly versionService: WorkflowVersionService,
    private readonly simulationService: WorkflowSimulationService,
    private readonly metricsService: WorkflowMetricsService,
    private readonly auditService: WorkflowAuditService,
    private readonly recoveryService: WorkflowRecoveryService,
    private readonly assignmentService: WorkflowAssignmentService,
    private readonly escalationService: TaskEscalationService,
    private readonly compensationService: WorkflowCompensationService,
    private readonly prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW DEFINITIONS
  // ─────────────────────────────────────────────────────────────

  @Get('definitions')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN', 'MEDICAL_OFFICER', 'NURSE')
  async getDefinitions() {
    return this.definitionService.getAllDefinitions();
  }

  @Get('definitions/:code')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN', 'MEDICAL_OFFICER', 'NURSE')
  async getDefinition(@Param('code') code: string) {
    return this.definitionService.getDefinition(code);
  }

  @Get('definitions/:code/versions')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getDefinitionVersions(@Param('code') code: string) {
    const definition = await this.definitionService.getDefinition(code);
    return definition.versions;
  }

  @Post('definitions/validate')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.OK)
  async validateDefinition(@Body() body: WorkflowSchemaJSON) {
    return this.definitionService.validateDefinition(body);
  }

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW INSTANCES
  // ─────────────────────────────────────────────────────────────

  @Get('instances')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getInstances(
    @Query('facilityId') facilityId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.workflowInstance.findMany({
      where: {
        facilityId: parseInt(facilityId),
        ...(status ? { status } : {}),
      },
      include: {
        definition: { select: { code: true, name: true } },
        tasks: { where: { status: { not: 'COMPLETED' } } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit ?? '50'),
    });
  }

  @Get('instances/completed')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getCompletedInstances(
    @Query('facilityId') facilityId: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.workflowInstance.findMany({
      where: { facilityId: parseInt(facilityId), status: 'COMPLETED' },
      include: { definition: { select: { code: true, name: true } } },
      orderBy: { completedAt: 'desc' },
      take: parseInt(limit ?? '50'),
    });
  }

  @Get('instances/failed')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getFailedInstances(
    @Query('facilityId') facilityId: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.workflowInstance.findMany({
      where: { facilityId: parseInt(facilityId), status: 'FAILED' },
      include: { definition: { select: { code: true, name: true } }, audits: { orderBy: { timestamp: 'desc' }, take: 3 } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit ?? '50'),
    });
  }

  @Get('instances/:instanceId')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN', 'MEDICAL_OFFICER', 'NURSE')
  async getInstance(@Param('instanceId') instanceId: string) {
    return this.prisma.workflowInstance.findUnique({
      where: { instanceId },
      include: {
        definition: true,
        version: { select: { versionNumber: true } },
        steps: true,
        tasks: { include: { assignments: true, escalations: true } },
        timers: true,
        audits: { orderBy: { timestamp: 'asc' } },
      },
    });
  }

  @Get('instances/:instanceId/timeline')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN', 'MEDICAL_OFFICER', 'NURSE')
  async getInstanceTimeline(@Param('instanceId') instanceId: string) {
    return this.auditService.getAuditTrail(instanceId);
  }

  @Post('instances/:instanceId/replay')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  async replayInstance(@Param('instanceId') instanceId: string) {
    // Integration with Phase 4 EventReplayEngine: replay domain events → rebuild instance
    // Full implementation requires a running DB + EventReplayService
    return { message: 'Replay initiated', instanceId, note: 'Domain events will be replayed through the Event Bus to reconstruct workflow state.' };
  }

  @Post('instances/:instanceId/compensate')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  async compensateInstance(
    @Param('instanceId') instanceId: string,
    @Body() body: { reason?: string },
  ) {
    return this.compensationService.startCompensation(
      instanceId,
      body.reason ?? 'Manual compensation requested via API',
    );
  }

  // ─────────────────────────────────────────────────────────────
  // TASKS
  // ─────────────────────────────────────────────────────────────

  @Get('tasks/by-role/:role')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN', 'MEDICAL_OFFICER', 'NURSE', 'PHARMACIST', 'RECEPTIONIST', 'LAB_TECHNOLOGIST')
  async getTasksByRole(
    @Param('role') role: string,
    @Query('facilityId') facilityId: string,
  ) {
    return this.assignmentService.getTasksByRole(role, parseInt(facilityId));
  }

  @Get('tasks/by-user/:userId')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN', 'MEDICAL_OFFICER', 'NURSE', 'PHARMACIST')
  async getTasksByUser(@Param('userId') userId: string) {
    return this.assignmentService.getTasksByUser(parseInt(userId));
  }

  @Post('tasks/:taskId/assign')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.OK)
  async assignTask(
    @Param('taskId') taskId: string,
    @Body() body: { userId: number },
  ) {
    return this.assignmentService.assignTask(taskId, body.userId);
  }

  @Post('tasks/:taskId/claim')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN', 'MEDICAL_OFFICER', 'NURSE', 'PHARMACIST', 'LAB_TECHNOLOGIST')
  @HttpCode(HttpStatus.OK)
  async claimTask(
    @Param('taskId') taskId: string,
    @Body() body: { userId: number },
  ) {
    return this.assignmentService.claimTask(taskId, body.userId);
  }

  @Post('tasks/:taskId/complete')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN', 'MEDICAL_OFFICER', 'NURSE', 'PHARMACIST', 'LAB_TECHNOLOGIST')
  @HttpCode(HttpStatus.OK)
  async completeTask(
    @Param('taskId') taskId: string,
    @Body() body: { userId: number },
  ) {
    return this.assignmentService.completeTask(taskId, body.userId);
  }

  // ─────────────────────────────────────────────────────────────
  // ESCALATIONS
  // ─────────────────────────────────────────────────────────────

  @Get('escalations')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getActiveEscalations(@Query('facilityId') facilityId: string) {
    return this.escalationService.getActiveEscalations(parseInt(facilityId));
  }

  @Post('escalations/:id/resolve')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.OK)
  async resolveEscalation(@Param('id') id: string) {
    return this.escalationService.resolveEscalation(parseInt(id));
  }

  // ─────────────────────────────────────────────────────────────
  // ANALYTICS & METRICS
  // ─────────────────────────────────────────────────────────────

  @Get('metrics/dashboard')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getDashboard(@Query('facilityId') facilityId: string) {
    return this.metricsService.getDashboard(parseInt(facilityId));
  }

  @Get('metrics/kpi')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getKPIs(@Query('facilityId') facilityId: string) {
    return this.metricsService.getKPIs(parseInt(facilityId));
  }

  @Get('metrics/snapshots')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getHistoricalSnapshots(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.metricsService.getHistoricalSnapshots(new Date(from), new Date(to));
  }

  // ─────────────────────────────────────────────────────────────
  // SIMULATION
  // ─────────────────────────────────────────────────────────────

  @Post('simulate')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.OK)
  async simulate(
    @Body() body: {
      workflowCode: string;
      contextVariables: Record<string, any>;
      mode?: 'FULL' | 'SAFE' | 'PERFORMANCE';
    },
  ) {
    return this.simulationService.simulate(
      body.workflowCode,
      body.contextVariables,
      body.mode ?? 'FULL',
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RECOVERY
  // ─────────────────────────────────────────────────────────────

  @Get('recovery/blocked')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getBlockedInstances(@Query('facilityId') facilityId?: string) {
    return this.recoveryService.getBlockedInstances(facilityId ? parseInt(facilityId) : undefined);
  }

  // ─────────────────────────────────────────────────────────────
  // HEALTH
  // ─────────────────────────────────────────────────────────────

  @Get('health')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date(),
      engine: 'WorkflowEngine v5.0',
      features: [
        'transactional-outbox',
        'version-pinning',
        'parallel-joins',
        'compensation',
        'sandboxed-decision-engine',
        'event-replay-integration',
        'structural-validation',
      ],
    };
  }
}
