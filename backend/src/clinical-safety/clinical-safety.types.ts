export type ClinicalWarningSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type ClinicalSafetyWarning = {
  code: string;
  severity: ClinicalWarningSeverity;
  message: string;
  requiresOverrideReason: boolean;
};
