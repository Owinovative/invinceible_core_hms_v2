/**
 * Minimal in-memory Prisma stub covering the models the integration layer
 * touches. Supports the exact query shapes used by the services under test.
 * Excluded from coverage (test infrastructure).
 */
import { Prisma } from '@prisma/client';

type Row = Record<string, any>;

function matchesWhere(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, condition]) => {
    // Prisma ignores undefined filter values entirely.
    if (condition === undefined) return true;
    if (condition === null) return row[key] === null;
    if (typeof condition === 'object' && condition !== undefined) {
      if ('in' in condition) {
        return (condition.in as any[]).includes(row[key]);
      }
      if ('lte' in condition) return row[key] <= condition.lte;
      if ('lt' in condition) return row[key] < condition.lt;
      if ('gte' in condition) return row[key] >= condition.gte;
      if ('gt' in condition) return row[key] > condition.gt;
      if ('not' in condition) return row[key] !== condition.not;
      return matchesWhere(row[key] ?? {}, condition);
    }
    return row[key] === condition;
  });
}

function applyUpdate(row: Row, data: Row): Row {
  const next = { ...row };
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'increment' in (value as Row)) {
      next[key] = (next[key] ?? 0) + (value as Row).increment;
    } else {
      next[key] = value;
    }
  }
  next.updatedAt = new Date();
  return next;
}

function sortRows(rows: Row[], orderBy: any): Row[] {
  if (!orderBy) return rows;
  const clauses: Array<Record<string, 'asc' | 'desc'>> = Array.isArray(orderBy)
    ? orderBy
    : [orderBy];
  return [...rows].sort((a, b) => {
    for (const clause of clauses) {
      const [field, direction] = Object.entries(clause)[0];
      if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
      if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

class InMemoryModel {
  rows: Row[] = [];
  private nextId = 1;

  constructor(
    private readonly uniqueFields: string[] = [],
    private readonly relations: Record<
      string,
      { store: () => InMemoryModel; foreignKey: string; many?: boolean }
    > = {},
    /** Column defaults normally applied by the database. */
    private readonly defaults: Row = {},
  ) {}

  private attachRelations(row: Row, include?: Row): Row {
    if (!include) return { ...row };
    const output: Row = { ...row };
    for (const [name, spec] of Object.entries(this.relations)) {
      if (!include[name]) continue;
      const related = spec.store().rows;
      if (spec.many) {
        output[name] = related
          .filter((r) => r[spec.foreignKey] === row.id)
          .map((r) => ({ ...r }));
      } else {
        const found = related.find((r) => r.id === row[spec.foreignKey]);
        output[name] = found ? { ...found } : null;
        if (
          typeof include[name] === 'object' &&
          include[name]?.include &&
          output[name]
        ) {
          // one level of nested include is enough for these tests
          output[name] = spec
            .store()
            .attachRelations(found as Row, include[name].include);
        }
      }
    }
    return output;
  }

  create({ data, include }: { data: Row; include?: Row }): Promise<Row> {
    for (const field of this.uniqueFields) {
      if (
        data[field] !== undefined &&
        this.rows.some((row) => row[field] === data[field])
      ) {
        return Promise.reject(
          new Prisma.PrismaClientKnownRequestError(
            `Unique constraint failed on ${field}`,
            { code: 'P2002', clientVersion: 'in-memory' },
          ),
        );
      }
    }
    const row: Row = {
      id: this.nextId++,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...this.defaults,
      ...data,
    };
    this.rows.push(row);
    return Promise.resolve(this.attachRelations(row, include));
  }

  findUnique({ where, include, select }: any): Promise<Row | null> {
    const row = this.rows.find((candidate) => matchesWhere(candidate, where));
    if (!row) return Promise.resolve(null);
    const output = this.attachRelations(row, include);
    return Promise.resolve(select ? pick(output, select) : output);
  }

  findFirst({
    where,
    include,
    orderBy,
    select,
  }: any = {}): Promise<Row | null> {
    const sorted = sortRows(
      this.rows.filter((row) => matchesWhere(row, where)),
      orderBy,
    );
    const row = sorted[0];
    if (!row) return Promise.resolve(null);
    const output = this.attachRelations(row, include);
    return Promise.resolve(select ? pick(output, select) : output);
  }

  findMany({ where, orderBy, take, include, select }: any = {}): Promise<
    Row[]
  > {
    let rows = sortRows(
      this.rows.filter((row) => matchesWhere(row, where)),
      orderBy,
    );
    if (take !== undefined) rows = rows.slice(0, take);
    return Promise.resolve(
      rows.map((row) => {
        const output = this.attachRelations(row, include);
        return select ? pick(output, select) : output;
      }),
    );
  }

  update({ where, data, include }: any): Promise<Row> {
    const index = this.rows.findIndex((row) => matchesWhere(row, where));
    if (index === -1) {
      return Promise.reject(new Error('Record to update not found'));
    }
    this.rows[index] = applyUpdate(this.rows[index], data);
    return Promise.resolve(this.attachRelations(this.rows[index], include));
  }

  updateMany({ where, data }: any): Promise<{ count: number }> {
    let count = 0;
    this.rows = this.rows.map((row) => {
      if (matchesWhere(row, where)) {
        count += 1;
        return applyUpdate(row, data);
      }
      return row;
    });
    return Promise.resolve({ count });
  }

  count({ where }: any = {}): Promise<number> {
    return Promise.resolve(
      this.rows.filter((row) => matchesWhere(row, where)).length,
    );
  }

  groupBy({ by }: any): Promise<Row[]> {
    const groups = new Map<string, Row>();
    for (const row of this.rows) {
      const key = (by as string[]).map((field) => row[field]).join('|');
      const existing = groups.get(key);
      if (existing) {
        existing._count._all += 1;
      } else {
        const group: Row = { _count: { _all: 1 } };
        for (const field of by as string[]) group[field] = row[field];
        groups.set(key, group);
      }
    }
    return Promise.resolve([...groups.values()]);
  }
}

function pick(row: Row, select: Row): Row {
  const output: Row = {};
  for (const [key, wanted] of Object.entries(select)) {
    if (wanted) output[key] = row[key];
  }
  return output;
}

export class InMemoryPrisma {
  etimsInvoice: InMemoryModel;
  integrationOutboundRequest: InMemoryModel;
  integrationApiLog: InMemoryModel;
  dhaTransaction: InMemoryModel;
  invoice: InMemoryModel;
  patient: InMemoryModel;
  facility: InMemoryModel;
  shaClaim: InMemoryModel;
  consultation: InMemoryModel;
  staff: InMemoryModel;
  invoiceItem: InMemoryModel;

  constructor() {
    this.facility = new InMemoryModel();
    this.patient = new InMemoryModel([], {
      facility: { store: () => this.facility, foreignKey: 'facilityId' },
    });
    this.staff = new InMemoryModel();
    this.invoiceItem = new InMemoryModel([], {
      billingService: {
        store: () => new InMemoryModel(),
        foreignKey: 'billingServiceId',
      },
    });
    this.invoice = new InMemoryModel([], {
      items: {
        store: () => this.invoiceItem,
        foreignKey: 'invoiceId',
        many: true,
      },
      patient: { store: () => this.patient, foreignKey: 'patientId' },
      facility: { store: () => this.facility, foreignKey: 'facilityId' },
    });
    this.etimsInvoice = new InMemoryModel(
      ['traderInvoiceNumber'],
      {
        original: { store: () => this.etimsInvoice, foreignKey: 'originalId' },
        invoice: { store: () => this.invoice, foreignKey: 'invoiceId' },
      },
      {
        documentType: 'SALE',
        statusCode: 'PENDING',
        receiptTypeCode: 'S',
        attemptCount: 0,
        totalTaxableAmount: 0,
        totalTaxAmount: 0,
        totalAmount: 0,
        currency: 'KES',
      },
    );
    this.integrationOutboundRequest = new InMemoryModel(
      ['idempotencyKey'],
      {},
      { status: 'PENDING', attemptCount: 0, maxAttempts: 8 },
    );
    this.integrationApiLog = new InMemoryModel(
      [],
      {},
      { latencyMs: 0, retryCount: 0 },
    );
    this.dhaTransaction = new InMemoryModel([], {}, { statusCode: 'PENDING' });
    this.shaClaim = new InMemoryModel([], {
      patient: { store: () => this.patient, foreignKey: 'patientId' },
      facility: { store: () => this.facility, foreignKey: 'facilityId' },
      invoice: { store: () => this.invoice, foreignKey: 'invoiceId' },
    });
    this.consultation = new InMemoryModel([], {
      patient: { store: () => this.patient, foreignKey: 'patientId' },
      facility: { store: () => this.facility, foreignKey: 'facilityId' },
      doctor: { store: () => this.staff, foreignKey: 'doctorId' },
    });
  }
}

/** Convenience factory for a fully seeded billing scenario. */
export async function seedBillingScenario(prisma: InMemoryPrisma) {
  const facility = await prisma.facility.create({
    data: {
      code: 'FAC001',
      name: 'Mock Hospital',
      facilityType: 'HOSPITAL',
      county: 'Nairobi',
      town: 'Nairobi',
      country: 'KE',
      taxPin: 'P051234567X',
    },
  });
  const patient = await prisma.patient.create({
    data: {
      patientNumber: 'PT-000001',
      firstName: 'Jane',
      middleName: null,
      lastName: 'Wanjiku',
      gender: 'FEMALE',
      dateOfBirth: new Date('1990-05-01'),
      phonePrimary: '+254700000001',
      isDeceased: false,
      facilityId: facility.id,
    },
  });
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-000001',
      statusCode: 'PENDING',
      subtotal: 3500,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 3500,
      paidAmount: 0,
      balanceAmount: 0,
      issuedAt: new Date('2026-07-01T09:00:00Z'),
      facilityId: facility.id,
      branchId: null,
      patientId: patient.id,
    },
  });
  await prisma.invoiceItem.create({
    data: {
      description: 'General consultation',
      quantity: 1,
      unitPrice: 1500,
      discountPercent: 0,
      discountAmount: 0,
      lineTotal: 1500,
      statusCode: 'BILLED',
      isRemoved: false,
      invoiceId: invoice.id,
      billingServiceId: null,
    },
  });
  await prisma.invoiceItem.create({
    data: {
      description: 'Full haemogram',
      quantity: 1,
      unitPrice: 2000,
      discountPercent: 0,
      discountAmount: 0,
      lineTotal: 2000,
      statusCode: 'BILLED',
      isRemoved: false,
      invoiceId: invoice.id,
      billingServiceId: null,
    },
  });
  return { facility, patient, invoice };
}
