import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { FeatureFlagService } from '../enterprise/feature-flag.service';
import { EvaluateClinicalSafetyDto } from './dto/evaluate-clinical-safety.dto';
import type { ClinicalSafetyWarning } from './clinical-safety.types';

@Injectable()
export class ClinicalSafetyService {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  evaluate(dto: EvaluateClinicalSafetyDto) {
    if (!this.featureFlags.isEnabled('CLINICAL_DECISION_SUPPORT_ENABLED')) {
      throw new ServiceUnavailableException(
        'Clinical decision support is disabled by feature flag.',
      );
    }

    const warnings = evaluateClinicalSafety(dto);

    return {
      warnings,
      requiresClinicianReview: warnings.length > 0,
      safetyNotice:
        'These warnings assist staff only. A licensed clinician must review and decide the final action.',
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export function evaluateClinicalSafety(
  dto: EvaluateClinicalSafetyDto,
): ClinicalSafetyWarning[] {
  const warnings: ClinicalSafetyWarning[] = [];

  if (dto.oxygenSaturation !== undefined) {
    if (dto.oxygenSaturation < 90) {
      warnings.push(
        critical(
          'OXYGEN_CRITICAL',
          'Oxygen saturation is below 90%. Immediate clinician review is required.',
        ),
      );
    } else if (dto.oxygenSaturation < 94) {
      warnings.push(
        warning(
          'OXYGEN_LOW',
          'Oxygen saturation is below the expected safe range.',
        ),
      );
    }
  }

  if (dto.systolicBp !== undefined || dto.diastolicBp !== undefined) {
    const systolic = dto.systolicBp ?? 0;
    const diastolic = dto.diastolicBp ?? 0;

    if (systolic >= 180 || diastolic >= 120) {
      warnings.push(
        critical('BP_CRITICAL', 'Blood pressure is in a critical range.'),
      );
    } else if (systolic >= 140 || diastolic >= 90) {
      warnings.push(
        warning('BP_HIGH', 'Blood pressure is above the normal range.'),
      );
    } else if ((dto.systolicBp ?? 999) < 90 || (dto.diastolicBp ?? 999) < 60) {
      warnings.push(
        warning('BP_LOW', 'Blood pressure is below the normal range.'),
      );
    }
  }

  if (dto.temperatureC !== undefined) {
    if (dto.temperatureC >= 39 || dto.temperatureC < 35) {
      warnings.push(
        critical('TEMPERATURE_CRITICAL', 'Temperature is in a critical range.'),
      );
    } else if (dto.temperatureC >= 38 || dto.temperatureC < 36) {
      warnings.push(
        warning(
          'TEMPERATURE_ABNORMAL',
          'Temperature is outside the normal range.',
        ),
      );
    }
  }

  if (dto.pulse !== undefined) {
    if (dto.pulse >= 130 || dto.pulse <= 45) {
      warnings.push(
        critical('PULSE_CRITICAL', 'Pulse rate is in a critical range.'),
      );
    } else if (dto.pulse >= 110 || dto.pulse < 60) {
      warnings.push(
        warning('PULSE_ABNORMAL', 'Pulse rate is outside the expected range.'),
      );
    }
  }

  if (dto.painScore !== undefined && dto.painScore >= 8) {
    warnings.push(
      warning(
        'HIGH_PAIN_SCORE',
        'Pain score is high and should be reviewed promptly.',
      ),
    );
  }

  if (dto.pregnant && dto.medicines?.length) {
    warnings.push(
      warning(
        'PREGNANCY_MEDICINE_REVIEW',
        'Pregnancy is documented. Medicines should be reviewed for pregnancy safety.',
      ),
    );
  }

  if (dto.allergyText?.trim() && dto.medicines?.length) {
    warnings.push(
      warning(
        'ALLERGY_MEDICINE_REVIEW',
        'Allergies are documented. Check prescribed medicines against the allergy record.',
      ),
    );
  }

  for (const flag of dto.labFlags ?? []) {
    const normalized = flag.toLowerCase();
    if (normalized.includes('critical')) {
      warnings.push(
        critical('CRITICAL_LAB_FLAG', 'A lab result has been marked critical.'),
      );
    } else if (normalized.includes('abnormal')) {
      warnings.push(
        warning('ABNORMAL_LAB_FLAG', 'A lab result has been marked abnormal.'),
      );
    }
  }

  const medicineNames = (dto.medicines ?? [])
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const duplicateMedicines = medicineNames.filter(
    (medicine, index) => medicineNames.indexOf(medicine) !== index,
  );

  if (duplicateMedicines.length > 0) {
    warnings.push(
      warning(
        'DUPLICATE_PRESCRIPTION',
        'The medicine list contains a duplicate item.',
      ),
    );
  }

  return warnings;
}

function critical(code: string, message: string): ClinicalSafetyWarning {
  return {
    code,
    severity: 'CRITICAL',
    message,
    requiresOverrideReason: true,
  };
}

function warning(code: string, message: string): ClinicalSafetyWarning {
  return {
    code,
    severity: 'WARNING',
    message,
    requiresOverrideReason: false,
  };
}
