import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  ClinicalAiRequestDto,
  ClinicalAiTask,
} from './dto/clinical-ai-request.dto';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

const SAFETY_NOTICE =
  'AI output is a drafting aid only. A licensed clinician must verify facts, clinical judgment, orders, and final wording before use.';

const TASK_LABELS: Record<ClinicalAiTask, string> = {
  [ClinicalAiTask.SOAP_NOTE]: 'SOAP clinical note',
  [ClinicalAiTask.TREATMENT_PLAN]: 'treatment plan draft',
  [ClinicalAiTask.DISCHARGE_SUMMARY]: 'discharge summary draft',
  [ClinicalAiTask.PATIENT_INSTRUCTIONS]: 'patient instructions',
  [ClinicalAiTask.LAB_RESULT_SUMMARY]: 'lab result summary',
  [ClinicalAiTask.BILLING_NARRATIVE]: 'billing narrative',
  [ClinicalAiTask.PHARMACY_COUNSELLING]: 'pharmacy counselling note',
  [ClinicalAiTask.GENERAL_DRAFT]: 'clinical text draft',
};

@Injectable()
export class AiAssistantService {
  private readonly client?: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    this.model =
      this.configService.get<string>('OPENAI_MODEL')?.trim() || 'gpt-5-mini';

    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  getStatus() {
    return {
      enabled: Boolean(this.client),
      model: this.model,
      safetyNotice: SAFETY_NOTICE,
      tasks: Object.values(ClinicalAiTask),
    };
  }

  async createClinicalDraft(dto: ClinicalAiRequestDto, user: RequestUser) {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI assistant is not configured. Set OPENAI_API_KEY on the backend environment.',
      );
    }

    if (!dto.prompt?.trim() && !dto.context) {
      throw new BadRequestException(
        'Provide a prompt or clinical context before asking the AI assistant.',
      );
    }

    try {
      const response = await this.client.responses.create({
        model: this.model,
        instructions: this.instructionsFor(dto.task),
        input: this.buildInput(dto, user),
        max_output_tokens: 1200,
      });

      const output = response.output_text?.trim();

      if (!output) {
        throw new InternalServerErrorException(
          'AI assistant returned an empty draft.',
        );
      }

      return {
        task: dto.task,
        taskLabel: TASK_LABELS[dto.task],
        model: this.model,
        output,
        safetyNotice: SAFETY_NOTICE,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'AI assistant request failed.';

      throw new InternalServerErrorException(message);
    }
  }

  private instructionsFor(task: ClinicalAiTask) {
    return [
      'You are a careful clinical documentation assistant inside a hospital management system.',
      'Create polished, concise, professional medical text for clinician review.',
      'Do not invent patient facts, diagnoses, orders, medications, dosages, allergies, vitals, or lab results.',
      'If information is missing, write "Not documented" or ask for the missing detail.',
      'Do not present yourself as a doctor and do not replace clinical judgment.',
      'Flag urgent red flags and advise immediate clinician review when the provided facts suggest risk.',
      'Use clear section headings, neutral wording, and hospital-appropriate language.',
      `Requested output: ${TASK_LABELS[task]}.`,
    ].join('\n');
  }

  private buildInput(dto: ClinicalAiRequestDto, user: RequestUser) {
    const context = dto.context
      ? this.safeJson(dto.context, 9000)
      : 'No structured context provided.';

    return [
      `Task: ${TASK_LABELS[dto.task]}`,
      `Audience: ${dto.audience?.trim() || 'hospital clinician'}`,
      `User role: ${user.roleCode || 'STAFF'}`,
      `Facility scope: ${user.homeFacilityName || 'Not specified'}`,
      `Branch scope: ${user.homeBranchName || 'Not specified'}`,
      '',
      'User request:',
      dto.prompt?.trim() || 'Use the structured context to create the draft.',
      '',
      'Structured context:',
      context,
      '',
      'Return only the usable draft plus a short clinician-review note at the end.',
    ].join('\n');
  }

  private safeJson(value: unknown, limit: number) {
    try {
      const serialized = JSON.stringify(value, null, 2);
      return serialized.length > limit
        ? `${serialized.slice(0, limit)}\n...[truncated]`
        : serialized;
    } catch {
      return 'Context could not be serialized.';
    }
  }
}
