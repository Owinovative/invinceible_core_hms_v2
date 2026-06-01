import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClinicalAiRequestDto,
  ClinicalAiTask,
  IdentityOcrRequestDto,
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
  [ClinicalAiTask.SYSTEM_NAVIGATION]: 'system navigation guidance',
  [ClinicalAiTask.GENERAL_DRAFT]: 'clinical text draft',
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

@Injectable()
export class AiAssistantService {
  private readonly apiKey?: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>('GEMINI_API_KEY')?.trim() ||
      this.configService.get<string>('GOOGLE_API_KEY')?.trim() ||
      this.configService.get<string>('GOOGLE_GENAI_API_KEY')?.trim();
    this.model =
      this.configService.get<string>('GEMINI_MODEL')?.trim() ||
      'gemini-2.5-flash-lite';
  }

  getStatus() {
    const enabled = this.isAiEnabled();

    return {
      enabled,
      provider: 'google-gemini',
      model: this.model,
      externalCallsAllowed: enabled,
      safetyNotice: SAFETY_NOTICE,
      tasks: Object.values(ClinicalAiTask),
    };
  }

  async createClinicalDraft(dto: ClinicalAiRequestDto, user: RequestUser) {
    this.assertAiAvailable(
      'AI assistant is disabled. Set AI_ENABLED=true and GEMINI_API_KEY only after patient-data AI use has been approved.',
    );

    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'AI assistant is not configured. Set GEMINI_API_KEY on the backend environment.',
      );
    }

    if (!dto.prompt?.trim() && !dto.context) {
      throw new BadRequestException(
        'Provide a prompt or clinical context before asking the AI assistant.',
      );
    }

    try {
      const response = await fetch(this.geminiEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: this.instructionsFor(dto.task) }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: this.buildInput(dto, user) }],
            },
          ],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 1200,
          },
        }),
      });

      const payload = (await response.json()) as GeminiGenerateContentResponse;

      if (!response.ok) {
        throw new InternalServerErrorException(
          payload.error?.message || 'Gemini assistant request failed.',
        );
      }

      const output = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join('\n')
        .trim();

      if (!output) {
        throw new InternalServerErrorException(
          'Gemini assistant returned an empty draft.',
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

  async extractIdentity(dto: IdentityOcrRequestDto, user: RequestUser) {
    this.assertAiAvailable(
      'AI identity reading is disabled. Set AI_ENABLED=true and GEMINI_API_KEY only after staff onboarding AI use has been approved.',
    );

    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'AI identity reading is not configured. Set GEMINI_API_KEY on the backend environment.',
      );
    }

    const image = this.parseImageDataUrl(dto.imageDataUrl);
    if (!image) {
      throw new BadRequestException('Provide a valid image data URL.');
    }

    try {
      const response = await fetch(this.geminiEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: [
                  'Read the national identification card image for staff onboarding.',
                  'Return strict JSON only with keys: fullName, firstName, middleName, lastName, nationalIdNumber, confidence, notes.',
                  'For Kenyan IDs, nationalIdNumber is the visible ID/serial identity number, not a date, phone number, district, or birth year.',
                  'Do not invent values. Use null when text is unreadable.',
                  'confidence must be a number from 0 to 1.',
                ].join('\n'),
              },
            ],
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: [
                    `Requester role: ${user.roleCode || 'STAFF'}`,
                    'Extract only the visible legal name and national ID number from this ID image.',
                  ].join('\n'),
                },
                {
                  inline_data: {
                    mime_type: image.mimeType,
                    data: image.base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 400,
            responseMimeType: 'application/json',
          },
        }),
      });

      const payload = (await response.json()) as GeminiGenerateContentResponse;

      if (!response.ok) {
        throw new InternalServerErrorException(
          payload.error?.message || 'Gemini identity reading failed.',
        );
      }

      const output = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join('\n')
        .trim();

      if (!output) {
        throw new InternalServerErrorException(
          'Gemini returned an empty identity reading.',
        );
      }

      const parsed = this.parseJsonObject(output);
      const identity = this.normalizeIdentityResult(parsed, output);

      return {
        ...identity,
        model: this.model,
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
        error instanceof Error ? error.message : 'AI identity reading failed.';

      throw new InternalServerErrorException(message);
    }
  }

  private instructionsFor(task: ClinicalAiTask) {
    if (task === ClinicalAiTask.SYSTEM_NAVIGATION) {
      return [
        'You are a careful hospital management system navigation assistant.',
        'Help the staff member find the correct module, page, and next operational steps inside Invinceible Core HMS.',
        'Use only the routes, module names, workflow signals, and user scope provided in the structured context.',
        'Do not invent unavailable features, credentials, patient facts, medical advice, billing amounts, or clinical instructions.',
        'Return a short answer with: Best module, Why, Next steps, and Safety or permission note.',
        'If a task requires admin rights, say so clearly.',
      ].join('\n');
    }

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

    if (dto.task === ClinicalAiTask.SYSTEM_NAVIGATION) {
      return [
        `Task: ${TASK_LABELS[dto.task]}`,
        `Audience: ${dto.audience?.trim() || 'hospital system user'}`,
        `User role: ${user.roleCode || 'STAFF'}`,
        `Facility scope: ${user.homeFacilityName || 'Not specified'}`,
        `Branch scope: ${user.homeBranchName || 'Not specified'}`,
        '',
        'User is stuck with:',
        dto.prompt?.trim() ||
          'Use the structured context to suggest the best workflow route.',
        '',
        'Structured system map and current signals:',
        context,
        '',
        'Return concise navigation guidance. Include route names exactly as provided when possible.',
      ].join('\n');
    }

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

  private parseImageDataUrl(value: string) {
    const match = value.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
    if (!match) return null;
    return {
      mimeType: match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1],
      base64: match[2],
    };
  }

  private parseJsonObject(value: string): Record<string, unknown> {
    const cleaned = value
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) {
        return JSON.parse(cleaned.slice(start, end + 1)) as Record<
          string,
          unknown
        >;
      }
      throw new InternalServerErrorException(
        'Gemini identity response was not valid JSON.',
      );
    }
  }

  private normalizeIdentityResult(
    parsed: Record<string, unknown>,
    rawOutput: string,
  ) {
    const fullName = this.stringFromAny(
      parsed.fullName,
      parsed.name,
      parsed.names,
      parsed.legalName,
    );
    const explicitFirstName = this.stringFromAny(parsed.firstName, parsed.givenName);
    const explicitMiddleName = this.stringFromAny(parsed.middleName);
    const explicitLastName = this.stringFromAny(
      parsed.lastName,
      parsed.surname,
      parsed.familyName,
    );
    const split = this.splitIdentityName(
      [explicitFirstName, explicitMiddleName, explicitLastName]
        .filter(Boolean)
        .join(' ') || fullName,
    );
    const nationalIdNumber =
      this.cleanIdentityNumber(
        this.stringFromAny(
          parsed.nationalIdNumber,
          parsed.idNumber,
          parsed.identityNumber,
          parsed.cardNumber,
          parsed.serialNumber,
        ),
      ) ?? this.extractIdentityNumberFromText(rawOutput);
    const confidenceValue = Number(parsed.confidence);
    const confidence = Number.isFinite(confidenceValue)
      ? Math.max(0, Math.min(1, confidenceValue))
      : nationalIdNumber || fullName
        ? 0.55
        : 0;

    return {
      fullName: fullName || split.fullName || null,
      firstName: explicitFirstName || split.firstName || null,
      middleName: explicitMiddleName || split.middleName || null,
      lastName: explicitLastName || split.lastName || null,
      nationalIdNumber: nationalIdNumber ?? null,
      confidence,
      notes: this.stringFromAny(parsed.notes) || '',
    };
  }

  private stringFromAny(...values: unknown[]) {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (Array.isArray(value)) {
        const text = value
          .filter((item) => typeof item === 'string' && item.trim())
          .join(' ')
          .trim();
        if (text) return text;
      }
    }

    return null;
  }

  private splitIdentityName(value?: string | null) {
    const parts = String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);

    return {
      fullName: parts.join(' ') || null,
      firstName: parts[0] ?? null,
      middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : null,
      lastName:
        parts.length > 1
          ? parts.length > 2
            ? parts[parts.length - 1]
            : parts.slice(1).join(' ')
          : null,
    };
  }

  private cleanIdentityNumber(value?: string | null) {
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 5 && digits.length <= 12) return digits;
    return null;
  }

  private extractIdentityNumberFromText(value: string) {
    const matches = value.match(/\b\d{5,12}\b/g) ?? [];
    return (
      matches.find((match) => !/^(19|20)\d{2}$/.test(match)) ??
      matches[0] ??
      null
    );
  }

  private geminiEndpoint() {
    const modelPath = this.model.startsWith('models/')
      ? this.model
      : `models/${this.model}`;

    return `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent`;
  }

  private isAiEnabled() {
    const raw = this.configService.get<string>('AI_ENABLED') ?? 'false';
    return ['true', '1', 'yes', 'on'].includes(raw.toLowerCase());
  }

  private assertAiAvailable(message: string) {
    if (!this.isAiEnabled()) {
      throw new ServiceUnavailableException(message);
    }
  }
}
