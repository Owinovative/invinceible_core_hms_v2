import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const validateOnly = process.argv.includes('--validate-only');
const baseUrl = (
  process.env.HMS_UAT_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');
const token = process.env.HMS_UAT_BEARER_TOKEN?.trim();
const scenarioPath = process.env.DHA_UAT_SCENARIO_FILE?.trim();
const evidencePath =
  process.env.DHA_UAT_EVIDENCE_FILE?.trim() ||
  path.resolve(
    '.artifacts',
    `dha-uat-${new Date().toISOString().replaceAll(':', '-')}.json`,
  );

if (!scenarioPath) {
  throw new Error(
    'DHA_UAT_SCENARIO_FILE is required. Copy docs/dha-integration/uat-scenario.example.json and insert DHA-issued UAT data.',
  );
}
if (!validateOnly && !token) {
  throw new Error(
    'HMS_UAT_BEARER_TOKEN is required to execute the official UAT checklist through the HMS API.',
  );
}

const scenario = JSON.parse(await readFile(scenarioPath, 'utf8'));
const requiredPaths = [
  'facilityLocalId',
  'facilityCode',
  'practitioner.registrationNumber',
  'patient.identificationNumber',
  'patient.identificationType',
  'patient.localPatientId',
  'patient.consentAuthorizationId',
  'phc.interventionCode',
  'phc.claimId',
  'shif.interventionCode',
  'shif.outpatientClaimId',
  'shif.inpatientClaimId',
  'preauthorization.itemCode',
  'preauthorization.diagnosisCode',
  'emergency.referenceNumber',
  'attachment.filePath',
  'attachment.documentType',
];

function get(value, dottedPath) {
  return dottedPath.split('.').reduce((current, key) => current?.[key], value);
}

const missing = requiredPaths.filter((key) => {
  const value = get(scenario, key);
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    value === 0 ||
    String(value).startsWith('REPLACE_')
  );
});
if (missing.length) {
  throw new Error(`UAT scenario is incomplete: ${missing.join(', ')}`);
}

const p = scenario.patient;
const consent = p.consentAuthorizationId;
const evidence = {
  runId: crypto.randomUUID(),
  startedAt: new Date().toISOString(),
  mode: validateOnly ? 'VALIDATION_ONLY' : 'OFFICIAL_UAT_EXECUTION',
  baseUrl,
  scenarioFile: path.resolve(scenarioPath),
  steps: [],
};

function operation(operationName, payload, consentAuthorizationId = consent) {
  return {
    path: `/integrations/dha/operations/${operationName}`,
    body: { patientId: p.localPatientId, consentAuthorizationId, payload },
  };
}

const steps = [
  {
    id: 'REG-FACILITY',
    name: 'Facility Registry search',
    path: `/integrations/dha/facilities/${scenario.facilityLocalId}/verify`,
    body: { facilityCode: scenario.facilityCode },
  },
  {
    id: 'REG-WORKER',
    name: 'Health Worker Registry search',
    path: '/integrations/dha/practitioners/verify',
    body: scenario.practitioner,
  },
  {
    id: 'PHC-PATIENT',
    name: 'PHC patient search',
    path: '/integrations/dha/patients/verify',
    body: {
      identificationNumber: p.identificationNumber,
      identificationType: p.identificationType,
    },
  },
  {
    id: 'PHC-ELIGIBILITY',
    name: 'PHC eligibility',
    path: '/integrations/dha/eligibility',
    body: {
      identificationNumber: p.identificationNumber,
      identificationType: p.identificationType,
      interventionCode: scenario.phc.interventionCode,
    },
  },
  {
    id: 'PHC-BENEFITS',
    name: 'PHC benefits',
    ...operation('BENEFITS', { patient_id: p.registryId }, undefined),
  },
  {
    id: 'PHC-SUB-BENEFITS',
    name: 'PHC sub-benefits',
    ...operation('SUB_BENEFITS', { patient_id: p.registryId }, undefined),
  },
  {
    id: 'PHC-COVERAGE',
    name: 'PHC intervention coverage',
    ...operation(
      'INTERVENTION_COVERAGE',
      {
        patient_id: p.registryId,
        sub_benefit_code: scenario.phc.subBenefitCode,
      },
      undefined,
    ),
  },
  {
    id: 'PHC-ADD-INTERVENTION',
    name: 'PHC add intervention',
    ...operation('ADD_INTERVENTION', {
      intervention_code: scenario.phc.interventionCode,
    }),
  },
  {
    id: 'PHC-RETIRE-INTERVENTION',
    name: 'PHC retire intervention',
    ...operation('RETIRE_INTERVENTION', {
      intervention_code: scenario.phc.interventionCode,
    }),
  },
  {
    id: 'PHC-RESTORE-INTERVENTION',
    name: 'PHC restore intervention',
    ...operation('RESTORE_INTERVENTION', {
      intervention_code: scenario.phc.interventionCode,
    }),
  },
  {
    id: 'PHC-SWITCH-INTERVENTION',
    name: 'PHC switch intervention',
    ...operation('SWITCH_INTERVENTION', {
      retire_intervention_code: scenario.phc.interventionCode,
      new_intervention_code: scenario.phc.switchInterventionCode,
    }),
  },
  {
    id: 'PHC-CLAIM',
    name: 'PHC capitation visit and claim',
    path: `/sha-claims/${scenario.phc.claimId}/submit-to-dha`,
    body: {
      consentAuthorizationId: consent,
      interventionCode: scenario.phc.switchInterventionCode,
      serviceType: 'CAPITATION',
      visitOtp: scenario.phc.visitOtp,
    },
  },
  {
    id: 'SHIF-ELIGIBILITY',
    name: 'SHIF full eligibility',
    path: '/integrations/dha/eligibility',
    body: {
      identificationNumber: p.identificationNumber,
      identificationType: p.identificationType,
      interventionCode: scenario.shif.interventionCode,
    },
  },
  {
    id: 'SHIF-OP-CLAIM',
    name: 'SHIF outpatient visit and claim',
    path: `/sha-claims/${scenario.shif.outpatientClaimId}/submit-to-dha`,
    body: {
      consentAuthorizationId: consent,
      interventionCode: scenario.shif.interventionCode,
      serviceType: 'OUTPATIENT',
      visitOtp: scenario.shif.visitOtp,
    },
  },
  {
    id: 'PREAUTH-NORMAL',
    name: 'Normal preauthorization',
    path: '/integrations/dha/eclaims/preauthorizations',
    body: {
      patientId: p.localPatientId,
      consentAuthorizationId: consent,
      interventionCode: scenario.shif.interventionCode,
      preauthType: 'NORMAL',
      diagnoses: [{ icdCode: scenario.preauthorization.diagnosisCode }],
      items: [
        {
          itemCode: scenario.preauthorization.itemCode,
          unitPrice: scenario.preauthorization.unitPrice,
          quantity: '1',
        },
      ],
      doctors: [scenario.preauthorization.doctor],
    },
  },
  ...['SURGICAL', 'ONCOLOGY', 'RENAL'].map((preauthType) => ({
    id: `PREAUTH-${preauthType}`,
    name: `${preauthType.toLowerCase()} preauthorization`,
    path: '/integrations/dha/eclaims/preauthorizations',
    body: {
      patientId: p.localPatientId,
      consentAuthorizationId: consent,
      interventionCode: scenario.shif.interventionCode,
      preauthType,
      expectedServiceStartDate:
        scenario.preauthorization.expectedServiceStartDate,
      clinicalIndications: scenario.preauthorization.clinicalIndications,
      diagnoses: [{ icdCode: scenario.preauthorization.diagnosisCode }],
      items: [
        {
          itemCode: scenario.preauthorization.itemCode,
          unitPrice: scenario.preauthorization.unitPrice,
          quantity: '1',
        },
      ],
      doctors: [scenario.preauthorization.doctor],
    },
  })),
  {
    id: 'PREAUTH-CANCEL',
    name: 'Cancel preauthorization',
    ...operation('CANCEL_PREAUTH', {
      preauth_id: scenario.preauthorization.cancelPreauthId,
    }),
  },
  {
    id: 'ATTACHMENT',
    name: 'Claim supporting document',
    multipart: true,
    path: '/integrations/dha/eclaims/attachments',
  },
  {
    id: 'SHIF-IP-CLAIM',
    name: 'SHIF inpatient discharge and claim',
    path: `/sha-claims/${scenario.shif.inpatientClaimId}/submit-to-dha`,
    body: {
      consentAuthorizationId: consent,
      interventionCode: scenario.shif.interventionCode,
      serviceType: 'INPATIENT',
      visitOtp: scenario.shif.visitOtp,
      dischargeOtp: scenario.shif.dischargeOtp,
    },
  },
  {
    id: 'ECCIF-EMERGENCY',
    name: 'ECCIF emergency visit',
    path: '/integrations/dha/eclaims/emergencies',
    body: {
      patientId: p.localPatientId,
      interventions: [scenario.emergency.interventionCode],
      modeOfArrival: scenario.emergency.modeOfArrival,
      broughtBy: scenario.emergency.broughtBy,
      referenceNumber: scenario.emergency.referenceNumber,
      practitionerIdentificationNumber:
        scenario.practitioner.registrationNumber,
      practitionerIdentificationType: 'registration_number',
      practitionerRegulationBody: scenario.practitioner.board,
      otp: scenario.emergency.otp,
    },
  },
  {
    id: 'ECCIF-PROTOCOLS',
    name: 'ECCIF emergency protocols',
    ...operation('GET_EMERGENCY_PROTOCOLS', {}),
  },
];

async function request(step) {
  let body;
  let headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
  if (step.multipart) {
    const file = await readFile(scenario.attachment.filePath);
    body = new FormData();
    body.set('patientId', String(p.localPatientId));
    body.set('consentAuthorizationId', String(consent));
    body.set('interventionCode', scenario.shif.interventionCode);
    body.set('documentType', scenario.attachment.documentType);
    body.set(
      'file',
      new Blob([file], { type: scenario.attachment.mimeType }),
      path.basename(scenario.attachment.filePath),
    );
  } else {
    headers = { ...headers, 'Content-Type': 'application/json' };
    body = JSON.stringify(step.body);
  }
  const response = await fetch(`${baseUrl}${step.path}`, {
    method: 'POST',
    headers,
    body,
  });
  const text = await response.text();
  let responseBody;
  try {
    responseBody = text ? JSON.parse(text) : null;
  } catch {
    responseBody = text;
  }
  return {
    httpStatus: response.status,
    passed: response.ok,
    response: responseBody,
  };
}

let failed = false;
for (const step of steps) {
  const startedAt = new Date().toISOString();
  const result = validateOnly
    ? { passed: true, validationOnly: true }
    : await request(step);
  evidence.steps.push({
    id: step.id,
    name: step.name,
    startedAt,
    completedAt: new Date().toISOString(),
    ...result,
  });
  if (!result.passed) {
    failed = true;
    break;
  }
}
evidence.completedAt = new Date().toISOString();
evidence.status = failed
  ? 'FAILED'
  : validateOnly
    ? 'SCENARIO_VALID'
    : 'PASSED';
await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
  mode: 0o600,
});
console.log(`DHA UAT ${evidence.status}. Evidence: ${evidencePath}`);
if (failed) process.exitCode = 1;
