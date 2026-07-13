import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowSchemaJSON } from '../interfaces/workflow.interface';

@Injectable()
export class WorkflowVersionService {
  private readonly logger = new Logger(WorkflowVersionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async publishVersion(workflowCode: string, schema: WorkflowSchemaJSON, creatorUserId?: number): Promise<any> {
    this.logger.log(`Publishing new version for workflow: ${workflowCode}`);

    return this.prisma.$transaction(async (tx) => {
      // 1. Ensure definition exists
      let definition = await tx.workflowDefinition.findUnique({
        where: { code: workflowCode }
      });

      if (!definition) {
        definition = await tx.workflowDefinition.create({
          data: {
            code: workflowCode,
            name: schema.workflow,
            category: 'CLINICAL',
            isActive: true,
          }
        });
      }

      // 2. Determine next version number
      const currentLatest = await tx.workflowVersion.findFirst({
        where: { workflowDefinitionId: definition.id },
        orderBy: { versionNumber: 'desc' }
      });

      const nextVersion = currentLatest ? currentLatest.versionNumber + 1 : 1;
      
      if (schema.version !== nextVersion) {
        throw new BadRequestException(`Schema version mismatch. Expected ${nextVersion} but got ${schema.version}`);
      }

      // 3. Create new version
      const newVersion = await tx.workflowVersion.create({
        data: {
          workflowDefinitionId: definition.id,
          versionNumber: nextVersion,
          schema: schema as any,
          isPublished: true,
          publishedAt: new Date(),
          createdBy: creatorUserId ? creatorUserId.toString() : 'SYSTEM'
        }
      });

      // 4. Deprecate the old one if it existed
      if (currentLatest) {
        await tx.workflowVersion.update({
          where: { id: currentLatest.id },
          data: { isDeprecated: true, deprecatedAt: new Date() }
        });
      }

      return newVersion;
    });
  }

  async getLatestVersion(workflowCode: string) {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { code: workflowCode }
    });

    if (!definition) throw new NotFoundException(`Workflow ${workflowCode} not found`);

    const version = await this.prisma.workflowVersion.findFirst({
      where: { workflowDefinitionId: definition.id, isPublished: true, isDeprecated: false },
      orderBy: { versionNumber: 'desc' }
    });

    if (!version) throw new NotFoundException(`No active version found for ${workflowCode}`);

    return { definition, version };
  }
}
