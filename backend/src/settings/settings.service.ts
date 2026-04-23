import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSettingDto) {
    const existing = await this.prisma.systemSetting.findUnique({
      where: { settingKey: dto.settingKey },
    });

    if (existing) {
      throw new BadRequestException(
        `Setting with key ${dto.settingKey} already exists`,
      );
    }

    return this.prisma.systemSetting.create({
      data: {
        settingKey: dto.settingKey,
        settingValue: dto.settingValue,
        valueType: dto.valueType,
        category: dto.category,
        description: dto.description,
        isPublic: dto.isPublic ?? false,
      },
    });
  }

  findAll() {
    return this.prisma.systemSetting.findMany({
      orderBy: [
        { category: 'asc' },
        { settingKey: 'asc' },
      ],
    });
  }

  async upsertSetting(key: string, value: string) {
    return this.prisma.systemSetting.upsert({
      where: { settingKey: key },
      update: { settingValue: value },
      create: { 
        settingKey: key,
        settingValue: value,
        isPublic: true
      },
    });
  }

  findPublic() {
    return this.prisma.systemSetting.findMany({
      where: { isPublic: true },
      orderBy: [
        { category: 'asc' },
        { settingKey: 'asc' },
      ],
    });
  }

  async findOne(id: number) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with id ${id} not found`);
    }

    return setting;
  }

  async findByKey(settingKey: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { settingKey },
    });

    if (!setting) {
      throw new NotFoundException(
        `Setting with key ${settingKey} not found`,
      );
    }

    return setting;
  }

  async findByCategory(category: string) {
    return this.prisma.systemSetting.findMany({
      where: { category },
      orderBy: { settingKey: 'asc' },
    });
  }

  async update(id: number, dto: UpdateSettingDto) {
    await this.findOne(id);

    return this.prisma.systemSetting.update({
      where: { id },
      data: {
        settingKey: dto.settingKey,
        settingValue: dto.settingValue,
        valueType: dto.valueType,
        category: dto.category,
        description: dto.description,
        isPublic: dto.isPublic,
      },
    });
  }

  async updateByKey(settingKey: string, value: string) {
    const existing = await this.prisma.systemSetting.findUnique({
      where: { settingKey },
    });

    if (!existing) {
      throw new NotFoundException(
        `Setting with key ${settingKey} not found`,
      );
    }

    return this.prisma.systemSetting.update({
      where: { settingKey },
      data: {
        settingValue: value,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.systemSetting.delete({
      where: { id },
    });
  }

  async seedDefaults() {
    const defaults = [
      {
        settingKey: 'SYSTEM_CURRENCY',
        settingValue: 'KES',
        valueType: 'string',
        category: 'GENERAL',
        description: 'Default system currency',
        isPublic: true,
      },
      {
        settingKey: 'SYSTEM_TIMEZONE',
        settingValue: 'Africa/Nairobi',
        valueType: 'string',
        category: 'GENERAL',
        description: 'Default system timezone',
        isPublic: true,
      },
      {
        settingKey: 'PATIENT_PREFIX',
        settingValue: 'PAT',
        valueType: 'string',
        category: 'NUMBERING',
        description: 'Prefix for patient numbers',
        isPublic: false,
      },
      {
        settingKey: 'APPOINTMENT_PREFIX',
        settingValue: 'APT',
        valueType: 'string',
        category: 'NUMBERING',
        description: 'Prefix for appointment numbers',
        isPublic: false,
      },
      {
        settingKey: 'INVOICE_PREFIX',
        settingValue: 'INV',
        valueType: 'string',
        category: 'NUMBERING',
        description: 'Prefix for invoice numbers',
        isPublic: false,
      },
      {
        settingKey: 'RECEIPT_PREFIX',
        settingValue: 'RCPT',
        valueType: 'string',
        category: 'NUMBERING',
        description: 'Prefix for receipt numbers',
        isPublic: false,
      },
      {
        settingKey: 'LOW_STOCK_THRESHOLD',
        settingValue: '20',
        valueType: 'number',
        category: 'PHARMACY',
        description: 'Default low stock threshold',
        isPublic: false,
      },
      {
        settingKey: 'ENABLE_NOTIFICATIONS',
        settingValue: 'true',
        valueType: 'boolean',
        category: 'NOTIFICATIONS',
        description: 'Enable in-app notifications',
        isPublic: false,
      },
      {
        settingKey: 'MPESA_SHORTCODE',
        settingValue: '',
        valueType: 'string',
        category: 'PAYMENTS',
        description: 'M-PESA shortcode',
        isPublic: false,
      },
      {
        settingKey: 'MPESA_CALLBACK_URL',
        settingValue: '',
        valueType: 'string',
        category: 'PAYMENTS',
        description: 'M-PESA callback URL',
        isPublic: false,
      },
    ];

    const created: any[] = [];

    for (const item of defaults) {
      const existing = await this.prisma.systemSetting.findUnique({
        where: { settingKey: item.settingKey },
      });

      if (!existing) {
        const setting = await this.prisma.systemSetting.create({
          data: item,
        });        created.push(setting);
      }
    }

    return {
      message: 'Default settings seeded',
      createdCount: created.length,
      created,
    };
  }
}
