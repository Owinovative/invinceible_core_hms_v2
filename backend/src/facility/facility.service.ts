import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import {
  addDays,
  computeFacilityAccessStatus,
  FACILITY_GRACE_DAYS,
} from '../common/facility-access';
import { CacheService } from '../resilience/cache.service';

@Injectable()
export class FacilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  private sanitizeFacility<T extends Record<string, any>>(facility: T) {
    const { mpesaConsumerKey, mpesaConsumerSecret, mpesaPasskey, ...safe } =
      facility;

    return {
      ...safe,
      hasMpesaConsumerKey: Boolean(mpesaConsumerKey),
      hasMpesaConsumerSecret: Boolean(mpesaConsumerSecret),
      hasMpesaPasskey: Boolean(mpesaPasskey),
      accessStatus: computeFacilityAccessStatus(facility as any),
    };
  }

  private normalizeComplianceStatus(status?: string | null) {
    return String(status || 'COMPLIANT')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
  }

  private isCompliantStatus(status?: string | null) {
    return ['ACTIVE', 'COMPLIANT', 'GOOD_STANDING'].includes(
      this.normalizeComplianceStatus(status),
    );
  }

  private buildComplianceUpdate(existing: any, dto: UpdateFacilityDto) {
    const now = new Date();
    const requestedStatus =
      dto.complianceStatus !== undefined
        ? this.normalizeComplianceStatus(dto.complianceStatus)
        : this.normalizeComplianceStatus(existing.complianceStatus);
    const activeAfter =
      dto.isActive !== undefined ? dto.isActive : existing.isActive;
    const compliantAfter =
      activeAfter && this.isCompliantStatus(requestedStatus);
    const wasCompliant =
      existing.isActive !== false &&
      this.isCompliantStatus(existing.complianceStatus);

    if (compliantAfter) {
      return {
        complianceStatus: requestedStatus,
        complianceReason: dto.complianceReason ?? null,
        complianceDeactivatedAt: null,
        complianceGraceEndsAt: null,
        complianceReactivatedAt: wasCompliant
          ? existing.complianceReactivatedAt
          : now,
      };
    }

    const deactivatedAt =
      existing.complianceDeactivatedAt && !wasCompliant
        ? existing.complianceDeactivatedAt
        : now;

    return {
      complianceStatus:
        requestedStatus === 'COMPLIANT' ? 'NON_COMPLIANT' : requestedStatus,
      complianceReason:
        dto.complianceReason ??
        existing.complianceReason ??
        'Facility access placed in read-only compliance grace.',
      complianceDeactivatedAt: deactivatedAt,
      complianceGraceEndsAt:
        existing.complianceGraceEndsAt && !wasCompliant
          ? existing.complianceGraceEndsAt
          : addDays(deactivatedAt, FACILITY_GRACE_DAYS),
      complianceReactivatedAt: null,
    };
  }

  private async generateFacilityCode() {
    const year = new Date().getFullYear();

    const lastFacility = await this.prisma.facility.findFirst({
      where: {
        code: {
          startsWith: `FAC-${year}-`,
        },
      },
      orderBy: {
        id: 'desc',
      },
      select: {
        code: true,
      },
    });

    const lastSequence = lastFacility?.code
      ? Number(lastFacility.code.split('-').pop())
      : 0;

    const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

    return `FAC-${year}-${String(nextSequence).padStart(4, '0')}`;
  }

  private async generateBranchCode() {
    const year = new Date().getFullYear();

    const lastFacility = await this.prisma.facility.findFirst({
      where: {
        branchCode: {
          startsWith: `HBR-${year}-`,
        },
      },
      orderBy: {
        id: 'desc',
      },
      select: {
        branchCode: true,
      },
    });

    const lastSequence = lastFacility?.branchCode
      ? Number(lastFacility.branchCode.split('-').pop())
      : 0;

    const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

    return `HBR-${year}-${String(nextSequence).padStart(4, '0')}`;
  }

  private async findRaw(id: number) {
    const facility = await this.prisma.facility.findUnique({
      where: { id },
    });

    if (!facility) {
      throw new NotFoundException(`Facility with id ${id} not found`);
    }

    return facility;
  }

  async create(dto: CreateFacilityDto) {
    const code = dto.code?.trim() || (await this.generateFacilityCode());
    const branchCode =
      dto.branchCode?.trim() || (await this.generateBranchCode());

    const existing = await this.prisma.facility.findFirst({
      where: {
        OR: [{ code }, { branchCode }],
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Facility code or branch code already exists',
      );
    }

    if (dto.isDefault) {
      await this.prisma.facility.updateMany({
        data: { isDefault: false },
      });
    }

    const created = await this.prisma.facility.create({
      data: {
        code,
        branchCode,
        name: dto.name,
        facilityType: dto.facilityType,
        county: dto.county,
        town: dto.town,
        country: dto.country,
        phone: dto.phone,
        altPhone: dto.altPhone,
        email: dto.email,
        website: dto.website,
        address: dto.address,
        postalAddress: dto.postalAddress,
        registrationNo: dto.registrationNo,
        taxPin: dto.taxPin,
        licenseNumber: dto.licenseNumber,
        logoUrl: dto.logoUrl,
        latitude: dto.latitude,
        longitude: dto.longitude,
        mapLocationLabel: dto.mapLocationLabel,
        googleMapsUrl: dto.googleMapsUrl,
        timezone: dto.timezone,
        currency: dto.currency,
        mpesaShortcode: dto.mpesaShortcode,
        mpesaPaybill: dto.mpesaPaybill,
        mpesaAccountNumber: dto.mpesaAccountNumber,
        mpesaTillNumber: dto.mpesaTillNumber,
        mpesaPochiNumber: dto.mpesaPochiNumber,
        mpesaEnabled: dto.mpesaEnabled ?? false,
        mpesaEnvironment: dto.mpesaEnvironment,
        mpesaConsumerKey: dto.mpesaConsumerKey,
        mpesaConsumerSecret: dto.mpesaConsumerSecret,
        mpesaPasskey: dto.mpesaPasskey,
        mpesaCallbackUrl: dto.mpesaCallbackUrl,
        mpesaTransactionType: dto.mpesaTransactionType,
        showCashOnInvoice: dto.showCashOnInvoice ?? true,
        showPaybillOnInvoice: dto.showPaybillOnInvoice ?? true,
        showTillOnInvoice: dto.showTillOnInvoice ?? true,
        showPochiOnInvoice: dto.showPochiOnInvoice ?? true,
        shaFidCode: dto.shaFidCode,
        shaClaimStartNumber: dto.shaClaimStartNumber ?? 1,
        shaClaimNextNumber:
          dto.shaClaimNextNumber ?? dto.shaClaimStartNumber ?? 1,
        isHeadOffice: dto.isHeadOffice ?? false,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
        complianceStatus: this.normalizeComplianceStatus(dto.complianceStatus),
        complianceReason: dto.complianceReason,
      },
    });
    await this.cacheService.invalidatePattern(
      this.cacheService.makeKey(['facility-list']) + '*',
    );
    return this.sanitizeFacility(created);
  }

  findAll() {
    return this.cacheService.getOrSet(
      this.cacheService.makeKey(['facility-list', 'metadata']),
      Number(process.env.CACHE_REFERENCE_TTL_SECONDS ?? 300),
      () =>
        this.prisma.facility
          .findMany({
            orderBy: { id: 'asc' },
          })
          .then((facilities) =>
            facilities.map((facility) => this.sanitizeFacility(facility)),
          ),
    );
  }

  async findOne(id: number) {
    const facility = await this.findRaw(id);
    return this.sanitizeFacility(facility);
  }

  async findDefault() {
    const facility = await this.prisma.facility.findFirst({
      where: { isDefault: true },
    });

    if (!facility) {
      throw new NotFoundException('No default facility found');
    }

    return this.sanitizeFacility(facility);
  }

  async findByCode(code: string) {
    const facility = await this.prisma.facility.findFirst({
      where: { code },
    });

    if (!facility) {
      throw new NotFoundException(`Facility with code ${code} not found`);
    }

    return this.sanitizeFacility(facility);
  }

  async assertOperational(facilityId: number) {
    const facility = await this.findRaw(facilityId);

    const accessStatus = computeFacilityAccessStatus(facility);

    if (accessStatus.writeLocked) {
      throw new ForbiddenException(
        `Facility ${facility.name} is not cleared for data entry. Reason: ${accessStatus.lockReason}.`,
      );
    }

    return this.sanitizeFacility(facility);
  }

  async update(id: number, dto: UpdateFacilityDto) {
    const existing = await this.findRaw(id);

    if (dto.code && dto.code !== existing.code) {
      const codeExists = await this.prisma.facility.findFirst({
        where: {
          code: dto.code,
          NOT: { id },
        },
      });

      if (codeExists) {
        throw new BadRequestException('Facility code already exists');
      }
    }

    if (dto.branchCode && dto.branchCode !== existing.branchCode) {
      const branchCodeExists = await this.prisma.facility.findFirst({
        where: {
          branchCode: dto.branchCode,
          NOT: { id },
        },
      });

      if (branchCodeExists) {
        throw new BadRequestException('Branch code already exists');
      }
    }

    if (dto.isDefault) {
      await this.prisma.facility.updateMany({
        where: {
          NOT: { id },
        },
        data: { isDefault: false },
      });
    }

    const complianceUpdate = this.buildComplianceUpdate(existing, dto);
    const secretData = {
      ...(dto.mpesaConsumerKey
        ? { mpesaConsumerKey: dto.mpesaConsumerKey }
        : {}),
      ...(dto.mpesaConsumerSecret
        ? { mpesaConsumerSecret: dto.mpesaConsumerSecret }
        : {}),
      ...(dto.mpesaPasskey ? { mpesaPasskey: dto.mpesaPasskey } : {}),
    };

    const updated = await this.prisma.facility.update({
      where: { id },
      data: {
        code: dto.code,
        branchCode: dto.branchCode,
        name: dto.name,
        facilityType: dto.facilityType,
        county: dto.county,
        town: dto.town,
        country: dto.country,
        phone: dto.phone,
        altPhone: dto.altPhone,
        email: dto.email,
        website: dto.website,
        address: dto.address,
        postalAddress: dto.postalAddress,
        registrationNo: dto.registrationNo,
        taxPin: dto.taxPin,
        licenseNumber: dto.licenseNumber,
        logoUrl: dto.logoUrl,
        latitude: dto.latitude,
        longitude: dto.longitude,
        mapLocationLabel: dto.mapLocationLabel,
        googleMapsUrl: dto.googleMapsUrl,
        timezone: dto.timezone,
        currency: dto.currency,
        mpesaShortcode: dto.mpesaShortcode,
        mpesaPaybill: dto.mpesaPaybill,
        mpesaAccountNumber: dto.mpesaAccountNumber,
        mpesaTillNumber: dto.mpesaTillNumber,
        mpesaPochiNumber: dto.mpesaPochiNumber,
        mpesaEnabled: dto.mpesaEnabled,
        mpesaEnvironment: dto.mpesaEnvironment,
        mpesaCallbackUrl: dto.mpesaCallbackUrl,
        mpesaTransactionType: dto.mpesaTransactionType,
        ...secretData,
        showCashOnInvoice: dto.showCashOnInvoice,
        showPaybillOnInvoice: dto.showPaybillOnInvoice,
        showTillOnInvoice: dto.showTillOnInvoice,
        showPochiOnInvoice: dto.showPochiOnInvoice,
        shaFidCode: dto.shaFidCode,
        shaClaimStartNumber: dto.shaClaimStartNumber,
        shaClaimNextNumber: dto.shaClaimNextNumber,
        ...complianceUpdate,
        isHeadOffice: dto.isHeadOffice,
        isDefault: dto.isDefault,
        isActive: dto.isActive,
      },
    });
    await this.cacheService.invalidatePattern(
      this.cacheService.makeKey(['facility-list']) + '*',
    );
    return this.sanitizeFacility(updated);
  }

  async remove(id: number) {
    await this.findRaw(id);

    const removed = await this.prisma.facility.delete({
      where: { id },
    });
    await this.cacheService.invalidatePattern(
      this.cacheService.makeKey(['facility-list']) + '*',
    );
    return removed;
  }
}
