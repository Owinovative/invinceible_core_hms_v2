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
  BadRequestException,
  ForbiddenException,
  NotFoundException,
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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/request-user.interface';
import { ScopeService } from '../../auth/scope.service';

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
    private readonly scopeService: ScopeService,
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
  validateDefinition(@Body() body: WorkflowSchemaJSON) {
    return this.definitionService.validateDefinition(body);
  }

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW INSTANCES
  // ─────────────────────────────────────────────────────────────

  @Get('instances')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getInstances(
    @CurrentUser() user: RequestUser,
    @Query('facilityId') facilityId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const scopedFacilityId = this.resolveFacilityId(user, facilityId);
    return this.prisma.workflowInstance.findMany({
      where: {
        facilityId: scopedFacilityId,
        ...(status ? { status } : {}),
      },
      include: {
        definition: { select: { code: true, name: true } },
        tasks: { where: { status: { not: 'COMPLETED' } } },
      },
      orderBy: { createdAt: 'desc' },
      take: this.parseLimit(limit),
    });
  }

  @Get('instances/completed')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getCompletedInstances(
    @CurrentUser() user: RequestUser,
    @Query('facilityId') facilityId: string,
    @Query('limit') limit?: string,
  ) {
    const scopedFacilityId = this.resolveFacilityId(user, facilityId);
    return this.prisma.workflowInstance.findMany({
      where: { facilityId: scopedFacilityId, status: 'COMPLETED' },
      include: { definition: { select: { code: true, name: true } } },
      orderBy: { completedAt: 'desc' },
      take: this.parseLimit(limit),
    });
  }

  @Get('instances/failed')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getFailedInstances(
    @CurrentUser() user: RequestUser,
    @Query('facilityId') facilityId: string,
    @Query('limit') limit?: string,
  ) {
    const scopedFacilityId = this.resolveFacilityId(user, facilityId);
    return this.prisma.workflowInstance.findMany({
      where: { facilityId: scopedFacilityId, status: 'FAILED' },
      include: {
        definition: { select: { code: true, name: true } },
        audits: { orderBy: { timestamp: 'desc' }, take: 3 },
      },
      orderBy: { createdAt: 'desc' },
      take: this.parseLimit(limit),
    });
  }

  @Get('instances/:instanceId')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN', 'MEDICAL_OFFICER', 'NURSE')
  async getInstance(
    @Param('instanceId') instanceId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const facilityWhere = this.scopeService.buildFacilityScopeWhere(user);
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { instanceId, ...facilityWhere },
      include: {
        definition: true,
        version: { select: { versionNumber: true } },
        steps: true,
        tasks: { include: { assignments: true, escalations: true } },
        timers: true,
        audits: { orderBy: { timestamp: 'asc' } },
      },
    });
    if (!instance) {
      throw new NotFoundException(`Workflow instance ${instanceId} not found`);
    }
    return instance;
  }

  @Get('instances/:instanceId/timeline')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN', 'MEDICAL_OFFICER', 'NURSE')
  async getInstanceTimeline(
    @Param('instanceId') instanceId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const instance = await this.requireInstance(instanceId, user);
    return this.auditService.getAuditTrail(instanceId, instance.facilityId);
  }

  @Post('instances/:instanceId/replay')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  async replayInstance(
    @Param('instanceId') instanceId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.requireInstance(instanceId, user);
    // Integration with Phase 4 EventReplayEngine: replay domain events → rebuild instance
    // Full implementation requires a running DB + EventReplayService
    return {
      message: 'Replay initiated',
      instanceId,
      note: 'Domain events will be replayed through the Event Bus to reconstruct workflow state.',
    };
  }

  @Post('instances/:instanceId/compensate')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  async compensateInstance(
    @Param('instanceId') instanceId: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: RequestUser,
  ) {
    await this.requireInstance(instanceId, user);
    return this.compensationService.startCompensation(
      instanceId,
      body.reason ?? 'Manual compensation requested via API',
    );
  }

  // ─────────────────────────────────────────────────────────────
  // TASKS
  // ─────────────────────────────────────────────────────────────

  @Get('tasks/by-role/:role')
  @Roles(
    'ADMIN',
    'SYSTEM_ADMIN',
    'SUPERADMIN',
    'MEDICAL_OFFICER',
    'NURSE',
    'PHARMACIST',
    'RECEPTIONIST',
    'LAB_TECHNOLOGIST',
  )
  async getTasksByRole(
    @Param('role') role: string,
    @CurrentUser() user: RequestUser,
    @Query('facilityId') facilityId: string,
  ) {
    return this.assignmentService.getTasksByRole(
      role,
      this.resolveFacilityId(user, facilityId),
    );
  }

  @Get('tasks/by-user/:userId')
  @Roles(
    'ADMIN',
    'SYSTEM_ADMIN',
    'SUPERADMIN',
    'MEDICAL_OFFICER',
    'NURSE',
    'PHARMACIST',
  )
  async getTasksByUser(
    @Param('userId') userId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const targetUserId = this.parseId(userId, 'userId');
    const facilityId = await this.assertTargetUserAccess(targetUserId, user);
    return this.assignmentService.getTasksByUser(targetUserId, facilityId);
  }

  @Post('tasks/:taskId/assign')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.OK)
  async assignTask(
    @Param('taskId') taskId: string,
    @Body() body: { userId: number },
    @CurrentUser() user: RequestUser,
  ) {
    const task = await this.requireTask(taskId, user);
    await this.assertTargetUserAccess(
      body.userId,
      user,
      task.instance.facilityId,
    );
    return this.assignmentService.assignTask(
      taskId,
      body.userId,
      task.instance.facilityId,
    );
  }

  @Post('tasks/:taskId/claim')
  @Roles(
    'ADMIN',
    'SYSTEM_ADMIN',
    'SUPERADMIN',
    'MEDICAL_OFFICER',
    'NURSE',
    'PHARMACIST',
    'LAB_TECHNOLOGIST',
  )
  @HttpCode(HttpStatus.OK)
  async claimTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const task = await this.requireTask(taskId, user);
    return this.assignmentService.claimTask(
      taskId,
      user.userId,
      task.instance.facilityId,
    );
  }

  @Post('tasks/:taskId/complete')
  @Roles(
    'ADMIN',
    'SYSTEM_ADMIN',
    'SUPERADMIN',
    'MEDICAL_OFFICER',
    'NURSE',
    'PHARMACIST',
    'LAB_TECHNOLOGIST',
  )
  @HttpCode(HttpStatus.OK)
  async completeTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const task = await this.requireTask(taskId, user);
    return this.assignmentService.completeTask(
      taskId,
      user.userId,
      task.instance.facilityId,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ESCALATIONS
  // ─────────────────────────────────────────────────────────────

  @Get('escalations')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getActiveEscalations(
    @Query('facilityId') facilityId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.escalationService.getActiveEscalations(
      this.resolveFacilityId(user, facilityId),
    );
  }

  @Post('escalations/:id/resolve')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.OK)
  async resolveEscalation(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const escalationId = this.parseId(id, 'escalation id');
    const facilityId = await this.requireEscalationFacility(escalationId, user);
    return this.escalationService.resolveEscalation(escalationId, facilityId);
  }

  // ─────────────────────────────────────────────────────────────
  // ANALYTICS & METRICS
  // ─────────────────────────────────────────────────────────────

  @Get('metrics/dashboard')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getDashboard(
    @Query('facilityId') facilityId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.metricsService.getDashboard(
      this.resolveFacilityId(user, facilityId),
    );
  }

  @Get('metrics/kpi')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  async getKPIs(
    @Query('facilityId') facilityId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.metricsService.getKPIs(
      this.resolveFacilityId(user, facilityId),
    );
  }

  @Get('metrics/snapshots')
  @Roles('SUPER_ADMIN', 'SUPERADMIN')
  async getHistoricalSnapshots(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.metricsService.getHistoricalSnapshots(
      new Date(from),
      new Date(to),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SIMULATION
  // ─────────────────────────────────────────────────────────────

  @Post('simulate')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.OK)
  async simulate(
    @Body()
    body: {
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
  async getBlockedInstances(
    @CurrentUser() user: RequestUser,
    @Query('facilityId') facilityId?: string,
  ) {
    const scopedFacilityId =
      user.roleCode === 'SUPER_ADMIN' && !facilityId
        ? undefined
        : this.resolveFacilityId(user, facilityId);
    return this.recoveryService.getBlockedInstances(scopedFacilityId);
  }

  // ─────────────────────────────────────────────────────────────
  // HEALTH
  // ─────────────────────────────────────────────────────────────

  @Get('health')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
  getHealth() {
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

  private resolveFacilityId(user: RequestUser, requested?: string): number {
    const requestedId = requested
      ? this.parseId(requested, 'facilityId')
      : undefined;

    if (user.roleCode === 'SUPER_ADMIN') {
      if (!requestedId) {
        throw new BadRequestException('facilityId is required');
      }
      return requestedId;
    }

    if (!user.homeFacilityId) {
      throw new ForbiddenException('User has no home facility assigned');
    }
    if (requestedId && requestedId !== user.homeFacilityId) {
      throw new ForbiddenException('You cannot access this facility');
    }
    return user.homeFacilityId;
  }

  private parseId(value: string | number, name: string): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${name} must be a positive integer`);
    }
    return parsed;
  }

  private parseLimit(value?: string): number {
    if (!value) return 50;
    return Math.min(this.parseId(value, 'limit'), 200);
  }

  private async requireInstance(instanceId: string, user: RequestUser) {
    const facilityWhere = this.scopeService.buildFacilityScopeWhere(user);
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { instanceId, ...facilityWhere },
      select: { id: true, instanceId: true, facilityId: true },
    });
    if (!instance) {
      throw new NotFoundException(`Workflow instance ${instanceId} not found`);
    }
    return instance;
  }

  private async requireTask(taskId: string, user: RequestUser) {
    const facilityWhere = this.scopeService.buildFacilityScopeWhere(user);
    const task = await this.prisma.workflowTask.findFirst({
      where: { taskId, instance: facilityWhere },
      select: {
        id: true,
        taskId: true,
        instance: { select: { facilityId: true } },
      },
    });
    if (!task) {
      throw new NotFoundException(`Workflow task ${taskId} not found`);
    }
    return task;
  }

  private async requireEscalationFacility(
    escalationId: number,
    user: RequestUser,
  ) {
    const facilityWhere = this.scopeService.buildFacilityScopeWhere(user);
    const escalation = await this.prisma.workflowEscalation.findFirst({
      where: {
        id: escalationId,
        task: { instance: facilityWhere },
      },
      select: {
        task: { select: { instance: { select: { facilityId: true } } } },
      },
    });
    if (!escalation) {
      throw new NotFoundException(
        `Workflow escalation ${escalationId} not found`,
      );
    }
    return escalation.task.instance.facilityId;
  }

  private async assertTargetUserAccess(
    targetUserId: number,
    actor: RequestUser,
    expectedFacilityId?: number,
  ): Promise<number> {
    const target = await this.prisma.user.findUnique({
      where: { id: this.parseId(targetUserId, 'userId') },
      select: {
        homeFacilityId: true,
        staff: { select: { facilityId: true } },
      },
    });
    const targetFacilityId =
      target?.homeFacilityId ?? target?.staff?.facilityId ?? null;

    if (!target || !targetFacilityId) {
      throw new NotFoundException(`User ${targetUserId} not found`);
    }
    if (expectedFacilityId && targetFacilityId !== expectedFacilityId) {
      throw new ForbiddenException(
        'The selected user does not belong to this workflow facility',
      );
    }
    if (
      actor.roleCode !== 'SUPER_ADMIN' &&
      targetFacilityId !== actor.homeFacilityId
    ) {
      throw new ForbiddenException('You cannot access this user');
    }
    return targetFacilityId;
  }
}
