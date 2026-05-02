import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';

@Injectable()
export class FacilityService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(dto: CreateFacilityDto) {
    const code = dto.code?.trim() || (await this.generateFacilityCode());
    const branchCode = dto.branchCode?.trim() || (await this.generateBranchCode());

    const existing = await this.prisma.facility.findFirst({
      where: {
        OR: [{ code }, { branchCode }],
      },
    });

    if (existing) {
      throw new BadRequestException('Facility code or branch code already exists');
    }

    if (dto.isDefault) {
      await this.prisma.facility.updateMany({
        data: { isDefault: false },
      });
    }

    return this.prisma.facility.create({
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
      },
    });
  }

  findAll() {
    return this.prisma.facility.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const facility = await this.prisma.facility.findUnique({
      where: { id },
    });

    if (!facility) {
      throw new NotFoundException(`Facility with id ${id} not found`);
    }

    return facility;
  }

  async findDefault() {
    const facility = await this.prisma.facility.findFirst({
      where: { isDefault: true },
    });

    if (!facility) {
      throw new NotFoundException('No default facility found');
    }

    return facility;
  }

  async findByCode(code: string) {
    const facility = await this.prisma.facility.findFirst({
      where: { code },
    });

    if (!facility) {
      throw new NotFoundException(`Facility with code ${code} not found`);
    }

    return facility;
  }

  async assertOperational(facilityId: number) {
    const facility = await this.findOne(facilityId);

    if (!facility.isActive) {
      throw new ForbiddenException(
        `Facility ${facility.name} is inactive. Operations are suspended.`,
      );
    }

    return facility;
  }

  async update(id: number, dto: UpdateFacilityDto) {
    const existing = await this.findOne(id);

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

    return this.prisma.facility.update({
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
        showCashOnInvoice: dto.showCashOnInvoice,
        showPaybillOnInvoice: dto.showPaybillOnInvoice,
        showTillOnInvoice: dto.showTillOnInvoice,
        showPochiOnInvoice: dto.showPochiOnInvoice,
        shaFidCode: dto.shaFidCode,
        shaClaimStartNumber: dto.shaClaimStartNumber,
        shaClaimNextNumber: dto.shaClaimNextNumber,
        isHeadOffice: dto.isHeadOffice,
        isDefault: dto.isDefault,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.facility.delete({
      where: { id },
    });
  }
}
