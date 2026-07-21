import { existsSync } from 'node:fs';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL && existsSync('.env')) {
  process.loadEnvFile('.env');
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required in backend/.env.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to create demonstration terminology in production.');
  process.exit(1);
}

const system = 'urn:invinceible:hms:demo-diagnosis';
const version = 'demo-2026';
const concepts = [
  {
    code: 'DEMO-DX-001',
    display: 'Demonstration tension-type headache',
    synonyms: ['headache', 'tension headache'],
  },
  {
    code: 'DEMO-DX-002',
    display: 'Demonstration upper respiratory infection',
    synonyms: ['common cold', 'respiratory infection'],
  },
  {
    code: 'DEMO-DX-003',
    display: 'Demonstration abdominal pain',
    synonyms: ['stomach pain', 'abdominal discomfort'],
  },
  {
    code: 'DEMO-DX-004',
    display: 'Demonstration low back pain',
    synonyms: ['backache', 'lower back pain'],
  },
  {
    code: 'DEMO-DX-005',
    display: 'Demonstration gastroenteritis',
    synonyms: ['diarrhoea', 'vomiting illness'],
  },
  {
    code: 'DEMO-DX-006',
    display: 'Demonstration uncomplicated hypertension',
    synonyms: ['high blood pressure', 'hypertension'],
  },
  {
    code: 'DEMO-DX-007',
    display: 'Demonstration allergic rhinitis',
    synonyms: ['nasal allergy', 'hay fever'],
  },
  {
    code: 'DEMO-DX-008',
    display: 'Demonstration musculoskeletal pain',
    synonyms: ['muscle pain', 'joint pain'],
  },
];

const prisma = new PrismaClient();

async function main() {
  const source = await prisma.terminologySource.upsert({
    where: { sourceId: 'INV-HMS-DEMO-DIAGNOSIS' },
    update: {
      name: 'Invinceible HMS Demonstration Diagnoses',
      owner: 'DEMONSTRATION ONLY',
      description:
        'Synthetic concepts for local demonstrations. Not valid for DHA exchange, claims, reporting, or patient care.',
    },
    create: {
      sourceId: 'INV-HMS-DEMO-DIAGNOSIS',
      name: 'Invinceible HMS Demonstration Diagnoses',
      owner: 'DEMONSTRATION ONLY',
      description:
        'Synthetic concepts for local demonstrations. Not valid for DHA exchange, claims, reporting, or patient care.',
    },
  });

  for (const concept of concepts) {
    await prisma.terminologyConcept.upsert({
      where: {
        system_code_version: {
          system,
          code: concept.code,
          version,
        },
      },
      update: {
        display: concept.display,
        conceptClass: 'diagnosis',
        retired: false,
        owner: 'DEMONSTRATION ONLY',
        sourceId: source.id,
        metadata: {
          demoOnly: true,
          synonyms: concept.synonyms,
          warning: 'Not valid for clinical care, DHA exchange, or claims.',
        },
      },
      create: {
        uuid: `inv-hms-${concept.code.toLowerCase()}`,
        system,
        code: concept.code,
        display: concept.display,
        conceptClass: 'diagnosis',
        datatype: 'coded',
        retired: false,
        owner: 'DEMONSTRATION ONLY',
        version,
        sourceId: source.id,
        metadata: {
          demoOnly: true,
          synonyms: concept.synonyms,
          warning: 'Not valid for clinical care, DHA exchange, or claims.',
        },
      },
    });
  }

  console.log(
    `Created or updated ${concepts.length} demonstration diagnosis concepts.`,
  );
  console.log('Search for: headache, respiratory, abdominal, or hypertension.');
  console.log('These synthetic concepts are not valid for production use.');
}

main()
  .catch(() => {
    console.error(
      'Demonstration terminology setup failed. Verify that the database is running and migrations are current.',
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
