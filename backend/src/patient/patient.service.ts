import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { FacilityService } from '../facility/facility.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PossibleDuplicatePatientDto } from './dto/possible-duplicate-patient.dto';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import {
  paginatedResponse,
  parsePagination,
  type PaginationQuery,
} from '../common/pagination/pagination';
import { CacheService } from '../resilience/cache.service';
import { ClientRegistryService } from '../integrations/client-registry/client-registry.service';
import { IntegrationLoggerService } from '../integration/integration-logger.service';

@Injectable()
export class PatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly facilityService: FacilityService,
    private readonly scopeService: ScopeService,
    private readonly cacheService: CacheService,
    private readonly clientRegistryService: ClientRegistryService,
    private readonly integrationLoggerService: IntegrationLoggerService,
    private readonly configService: ConfigService,
  ) {}

  private async generatePatientNumber(facilityId: number) {
    const year = new Date().getFullYear();

    const lastPatient = await this.prisma.patient.findFirst({
      where: {
        facilityId,
        patientNumber: {
          startsWith: `PAT-${facilityId}-${year}-`,
        },
      },
      orderBy: {
        id: 'desc',
      },
      select: {
        patientNumber: true,
      },
    });

    const lastSequence = lastPatient?.patientNumber
      ? Number(lastPatient.patientNumber.split('-').pop())
      : 0;

    const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

    return `PAT-${facilityId}-${year}-${String(nextSequence).padStart(4, '0')}`;
  }

  async create(createPatientDto: CreatePatientDto) {
    await this.facilityService.findOne(createPatientDto.facilityId);
    await this.facilityService.assertOperational(createPatientDto.facilityId);

    if (createPatientDto.email) {
      const existingByEmail = await this.prisma.patient.findFirst({
        where: { email: createPatientDto.email },
      });

      if (existingByEmail) {
        throw new BadRequestException('Patient email already exists');
      }
    }

    const dhaEnabled = this.configService.get('DHA_ENABLED') === 'true';
    if (dhaEnabled && !createPatientDto.dateOfBirth) {
      throw new BadRequestException('Date of birth is mandatory for DHA compliance');
    }

    const patientNumber =
      createPatientDto.patientNumber?.trim() ||
      (await this.generatePatientNumber(createPatientDto.facilityId));

    const existingByNumber = await this.prisma.patient.findFirst({
      where: {
        patientNumber,
      },
    });

    if (existingByNumber) {
      throw new BadRequestException('Patient number already exists');
    }

    const patient = await this.prisma.patient.create({
      data: {
        patientNumber,
        firstName: createPatientDto.firstName,
        middleName: createPatientDto.middleName,
        lastName: createPatientDto.lastName,
        gender: createPatientDto.gender,
        dateOfBirth: createPatientDto.dateOfBirth
          ? new Date(createPatientDto.dateOfBirth)
          : undefined,
        phonePrimary: createPatientDto.phonePrimary,
        phoneSecondary: createPatientDto.phoneSecondary,
        email: createPatientDto.email,
        occupation: createPatientDto.occupation,
        facilityId: createPatientDto.facilityId,
        isDeceased: createPatientDto.isDeceased ?? false,
        isActive: createPatientDto.isActive ?? true,
      },
      include: {
        facility: true,
      },
    });

    // Attempt to register in HIE CR asynchronously
    this.clientRegistryService.registerPatient({
      id: String(patient.id),
      firstName: patient.firstName,
      middleName: patient.middleName || undefined,
      lastName: patient.lastName,
      gender: patient.gender || 'unknown',
      dateOfBirth: patient.dateOfBirth || undefined,
      phone: patient.phonePrimary || undefined,
    }).catch((err) => this.integrationLoggerService.error('Failed to register patient in HIE CR', { error: err, patientId: patient.id }));

    return patient;
  }

  async createScoped(createPatientDto: CreatePatientDto, user: RequestUser) {
    const facilityId = createPatientDto.facilityId ?? user.homeFacilityId;

    if (!facilityId) {
      throw new BadRequestException('Patient facility is required');
    }

    this.scopeService.assertFacilityAccess(user, facilityId);

    return this.create({
      ...createPatientDto,
      facilityId,
    });
  }

  findAll() {
    return this.prisma.patient.findMany({
      include: {
        facility: true,
      },
      orderBy: { id: 'desc' },
      take: 200,
    });
  }

  findAllScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.patient.findMany({
      where: {
        facilityId: scope.facilityId,
      },
      take: 200,
      select: {
        id: true,
        patientNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        gender: true,
        dateOfBirth: true,
        phonePrimary: true,
        email: true,
        facilityId: true,
        isActive: true,
        isDeceased: true,
        createdAt: true,
        updatedAt: true,
        facility: { select: { id: true, name: true } },
      },
      orderBy: { id: 'desc' },
    });
  }

  async findPageScoped(user: RequestUser, query: PaginationQuery) {
    const scope = this.scopeService.buildReadScope(user);
    const pagination = parsePagination(query, {
      defaultPageSize: 25,
      maxPageSize: 100,
      allowedSortFields: [
        'id',
        'createdAt',
        'updatedAt',
        'patientNumber',
        'firstName',
        'lastName',
      ],
      defaultSortBy: 'id',
      defaultSortDirection: 'desc',
    });
    const where = {
      facilityId: scope.facilityId,
      ...(pagination.search
        ? {
            OR: [
              { patientNumber: { contains: pagination.search } },
              { firstName: { contains: pagination.search } },
              { middleName: { contains: pagination.search } },
              { lastName: { contains: pagination.search } },
              { phonePrimary: { contains: pagination.search } },
              { email: { contains: pagination.search } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [pagination.sortBy]: pagination.sortDirection },
        select: {
          id: true,
          patientNumber: true,
          firstName: true,
          middleName: true,
          lastName: true,
          gender: true,
          dateOfBirth: true,
          phonePrimary: true,
          email: true,
          facilityId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          facility: { select: { id: true, name: true } },
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return paginatedResponse(data, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  async searchSuggestionsScoped(user: RequestUser, search: string) {
    const scope = this.scopeService.buildReadScope(user);
    const query = search.trim();
    if (query.length < 1) return [];

    return this.cacheService.rememberScoped(
      {
        facilityId: scope.facilityId,
        roleCode: user.roleCode,
        extra: `patient-suggest:${query.toLowerCase()}`,
      },
      'patient-search-suggestions',
      30,
      () =>
        this.prisma.patient.findMany({
          where: {
            facilityId: scope.facilityId,
            OR: [
              { patientNumber: { contains: query } },
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { phonePrimary: { contains: query } },
            ],
          },
          take: 20,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            phonePrimary: true,
          },
        }),
    );
  }

  async findPossibleDuplicatesScoped(
    user: RequestUser,
    dto: PossibleDuplicatePatientDto,
  ) {
    const facilityId = dto.facilityId ?? user.homeFacilityId;
    if (!facilityId) {
      throw new BadRequestException('Facility is required for duplicate check');
    }

    this.scopeService.assertFacilityAccess(user, facilityId);

    const firstName = dto.firstName?.trim();
    const lastName = dto.lastName?.trim();
    const phonePrimary = dto.phonePrimary?.trim();
    const patientNumber = dto.patientNumber?.trim();
    const email = dto.email?.trim();
    const dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;

    const or: any[] = [];
    if (patientNumber) or.push({ patientNumber });
    if (phonePrimary) or.push({ phonePrimary });
    if (email) or.push({ email });
    if (firstName && lastName) {
      or.push({
        firstName: { contains: firstName },
        lastName: { contains: lastName },
      });
    }
    if (dateOfBirth && Number.isFinite(dateOfBirth.getTime())) {
      or.push({ dateOfBirth });
    }

    if (or.length === 0) {
      return { candidates: [], checkedAt: new Date().toISOString() };
    }

    const candidates = await this.prisma.patient.findMany({
      where: {
        facilityId,
        OR: or,
      },
      take: 15,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        patientNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        dateOfBirth: true,
        phonePrimary: true,
        email: true,
        updatedAt: true,
      },
    });

    return {
      candidates: candidates
        .map((patient) => {
          const result = scorePatientDuplicate(dto, patient);
          return {
            ...patient,
            duplicateScore: result.score,
            reasons: result.reasons,
          };
        })
        .filter((patient) => patient.duplicateScore > 0)
        .sort((a, b) => b.duplicateScore - a.duplicateScore),
      checkedAt: new Date().toISOString(),
      note: 'Duplicate warnings do not block emergency registration. Staff may continue with an audited override when required.',
    };
  }

  async findOne(id: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        facility: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with id ${id} not found`);
    }

    return patient;
  }

  async findOneScoped(id: number, user: RequestUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        facility: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with id ${id} not found`);
    }

    this.scopeService.assertFacilityAccess(user, patient.facilityId);

    return patient;
  }

  async findByPatientNumber(patientNumber: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { patientNumber },
      include: {
        facility: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(
        `Patient with number ${patientNumber} not found`,
      );
    }

    return patient;
  }

  async findByPatientNumberScoped(patientNumber: string, user: RequestUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { patientNumber },
      include: {
        facility: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(
        `Patient with number ${patientNumber} not found`,
      );
    }

    this.scopeService.assertFacilityAccess(user, patient.facilityId);

    return patient;
  }

  async update(id: number, updatePatientDto: UpdatePatientDto) {
    await this.findOne(id);

    if (updatePatientDto.facilityId) {
      await this.facilityService.findOne(updatePatientDto.facilityId);
      await this.facilityService.assertOperational(updatePatientDto.facilityId);
    }

    const data: any = {
      ...updatePatientDto,
    };

    if (updatePatientDto.dateOfBirth) {
      data.dateOfBirth = new Date(updatePatientDto.dateOfBirth);
    }

    return this.prisma.patient.update({
      where: { id },
      data,
      include: {
        facility: true,
      },
    });
  }

  async updateScoped(
    id: number,
    updatePatientDto: UpdatePatientDto,
    user: RequestUser,
  ) {
    await this.findOneScoped(id, user);

    if (updatePatientDto.facilityId) {
      this.scopeService.assertFacilityAccess(user, updatePatientDto.facilityId);
    }

    return this.update(id, updatePatientDto);
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.patient.delete({
      where: { id },
    });
  }

  async removeScoped(id: number, user: RequestUser) {
    await this.findOneScoped(id, user);

    return this.remove(id);
  }
}

export function scorePatientDuplicate(
  input: PossibleDuplicatePatientDto,
  candidate: {
    patientNumber?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    dateOfBirth?: Date | string | null;
    phonePrimary?: string | null;
    email?: string | null;
  },
) {
  let score = 0;
  const reasons: string[] = [];

  if (sameText(input.patientNumber, candidate.patientNumber)) {
    score += 60;
    reasons.push('same patient number');
  }

  if (samePhone(input.phonePrimary, candidate.phonePrimary)) {
    score += 35;
    reasons.push('same phone number');
  }

  if (sameText(input.email, candidate.email)) {
    score += 25;
    reasons.push('same email');
  }

  if (sameText(input.firstName, candidate.firstName)) {
    score += 12;
    reasons.push('same first name');
  }

  if (sameText(input.lastName, candidate.lastName)) {
    score += 12;
    reasons.push('same last name');
  }

  if (sameDate(input.dateOfBirth, candidate.dateOfBirth)) {
    score += 20;
    reasons.push('same date of birth');
  }

  return {
    score: Math.min(score, 100),
    reasons,
  };
}

function sameText(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function samePhone(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  const clean = (value: string) => value.replace(/\D/g, '').replace(/^254/, '0');
  return clean(left) === clean(right);
}

function sameDate(left?: string | Date | null, right?: string | Date | null) {
  if (!left || !right) return false;
  const lDate = new Date(left);
  const rDate = new Date(right);
  if (!Number.isFinite(lDate.getTime()) || !Number.isFinite(rDate.getTime())) {
    return false;
  }

  return lDate.toISOString().slice(0, 10) === rDate.toISOString().slice(0, 10);
}
